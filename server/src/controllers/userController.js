import User from '../models/User.js';
import Order from '../models/Order.js';
import asyncHandler from '../utils/asyncHandler.js';

/** GET /api/admin/users?q=&page= — customers with order count and lifetime spend */
export const adminGetUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);

  const filter = {};
  if (q) {
    const rx = { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const match = { user: { $in: users.map((u) => u._id) }, status: { $ne: 'cancelled' } };
  const [spentRows, countRows] = await Promise.all([
    Order.aggregate([{ $match: match }, { $group: { _id: '$user', spent: { $sum: '$totalPrice' } } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$user', orders: { $sum: 1 } } }]),
  ]);
  const spentMap = new Map(spentRows.map((r) => [String(r._id), r.spent]));
  const countMap = new Map(countRows.map((r) => [String(r._id), r.orders]));

  const items = users.map((u) => ({
    ...u,
    orders: countMap.get(String(u._id)) || 0,
    spent: spentMap.get(String(u._id)) || 0,
  }));
  res.json({ items, page, pages: Math.ceil(total / limit) || 1, total });
});

/** PUT /api/admin/users/:id  { isActive?, role? } */
export const adminUpdateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (String(user._id) === String(req.user._id)) {
    res.status(400);
    throw new Error("You can't change your own role or status");
  }
  if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive;
  if (['customer', 'admin'].includes(req.body.role)) user.role = req.body.role;
  await user.save();
  res.json(user);
});
