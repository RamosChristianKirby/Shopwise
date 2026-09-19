import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';

export const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('Not authorized, account not found or disabled');
  }
  req.user = user;
  next();
});

// Attaches req.user when a valid token is sent, but never rejects the request.
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user?.isActive) req.user = user;
    } catch {
      /* ignore invalid token on public routes */
    }
  }
  next();
});

export const adminOnly =(req, res, next) => {
  if (req.user?.role === 'admin') return next();
  res.status(403);
  next(new Error('Admin access required'));
};
