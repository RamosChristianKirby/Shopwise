import User from '../models/User.js';
import Store from '../models/Store.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken } from '../middleware/auth.js';
import { effectivePlanId } from '../config/plans.js';

/** Stores this user can manage (platform admins see the default store here; all stores are in the platform console). */
export async function managedStores(user) {
  const query = user.role === 'admin' ? { $or: [{ isDefault: true }, { owner: user._id }, { staff: user._id }] } : { $or: [{ owner: user._id }, { staff: user._id }] };
  const stores = await Store.find(query).select('name slug owner isDefault isActive plan billing').sort({ isDefault: -1, createdAt: 1 }).lean();
  return stores.map((s) => ({
    _id: s._id,
    name: s.name,
    slug: s.slug,
    isDefault: !!s.isDefault,
    isActive: s.isActive !== false,
    role: String(s.owner) === String(user._id) || (s.isDefault && user.role === 'admin') ? 'owner' : 'staff',
    plan: effectivePlanId(s),
  }));
}

const publicUser = async (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  address: u.address || null,
  stores: await managedStores(u),
});

const sendAuth = async (res, user, status = 200) =>
  res.status(status).json({ token: signToken(user._id), user: await publicUser(user) });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!password || password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }
  // role is never taken from the request: everyone registers as a customer
  const user = await User.create({ name, email, password });
  await sendAuth(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password || ''))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been disabled');
  }
  await sendAuth(res, user);
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: await publicUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const { name, address, currentPassword, newPassword } = req.body;

  if (name) user.name = name;
  if (address) user.address = address;

  if (newPassword) {
    if (!currentPassword || !(await user.matchPassword(currentPassword))) {
      res.status(400);
      throw new Error('Current password is incorrect');
    }
    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters');
    }
    user.password = newPassword;
  }

  await user.save();
  await sendAuth(res, user);
});
