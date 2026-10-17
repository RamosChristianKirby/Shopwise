import User from '../models/User.js';
import Order from '../models/Order.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/admin/users?q=&page= — customers with order count and spend in the current store.
 * The default store lists every account; other stores list people who have ordered from them.
 */
export const adminGetUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);
  const store = req.store._id;

  const filter = {};
  if (!req.store.isDefault) filter._id = { $in: await Order.distinct('user', { store }) };
  if (q) {
    const rx = { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const match = { store, user: { $in: users.map((u) => u._id) }, status: { $ne: 'cancelled' } };
  const rows = await Order.aggregate([{ $match: match }, { $group: { _id: '$user', spent: { $sum: '$totalPrice' }, orders: { $sum: 1 } } }]);
  const map = new Map(rows.map((r) => [String(r._id), r]));
  const staff = new Set([String(req.store.owner), ...(req.store.staff || []).map(String)]);

  const items = users.map((u) => ({
    ...u,
    orders: map.get(String(u._id))?.orders || 0,
    spent: map.get(String(u._id))?.spent || 0,
    storeRole: String(req.store.owner) === String(u._id) ? 'owner' : staff.has(String(u._id)) ? 'staff' : null,
  }));
  res.json({ items, page, pages: Math.ceil(total / limit) || 1, total, canManageAccounts: req.user.role === 'admin' });
});

/** PUT /api/admin/users/:id  { isActive?, role? } — platform admins only (accounts are shared by every store). */
export const adminUpdateUser = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only Shopwise platform admins can disable accounts or change roles. Store owners can add staff in Settings.');
  }
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
