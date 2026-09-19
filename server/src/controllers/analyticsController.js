import Order, { ORDER_STATUSES } from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';

const TZ = process.env.TIMEZONE || 'Asia/Manila';
const DAY = 24 * 60 * 60 * 1000;

// "Sales" = every order that has not been cancelled.
const SALES = { status: { $ne: 'cancelled' } };

const dayKey = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

async function totals(from, to) {
  const match = { ...SALES, createdAt: { $gte: from, $lt: to } };
  const [[row], orders] = await Promise.all([
    Order.aggregate([{ $match: match }, { $group: { _id: null, revenue: { $sum: '$totalPrice' } } }]),
    Order.countDocuments(match),
  ]);
  return { revenue: row?.revenue || 0, orders };
}

// Midnight "today" in the configured timezone, as a UTC Date.
function startOfTodayInTZ(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    })
      .formatToParts(now)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)])
  );
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offset = asUTC - Math.floor(now.getTime() / 1000) * 1000; // tz offset in ms
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - offset);
}

const pctChange =(now, before) => (before === 0 ? (now > 0 ? 100 : 0) : ((now - before) / before) * 100);

/** GET /api/admin/analytics/summary */
export const summary = asyncHandler(async (req, res) => {
  const now = new Date();
  const last30 = new Date(now - 30 * DAY);
  const prev30 = new Date(now - 60 * DAY);
  const startOfToday = startOfTodayInTZ(now);

  const [allTime, cur, prev, statusRows, customers, products, lowStock, recentOrders, today] = await Promise.all([
    totals(new Date(0), new Date(now.getTime() + DAY)),
    totals(last30, now),
    totals(prev30, last30),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({ isActive: true }),
    Product.find({ isActive: true, stock: { $lte: 5 } }).select('name stock images').sort({ stock: 1 }).limit(6),
    Order.find().sort({ createdAt: -1 }).limit(6).populate('user', 'name'),
    totals(startOfToday, new Date(now.getTime() + DAY)),
  ]);

  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  statusRows.forEach((r) => { statusCounts[r._id] = r.count; });

  res.json({
    allTime: { ...allTime, avgOrderValue: allTime.orders ? allTime.revenue / allTime.orders : 0 },
    last30Days: {
      ...cur,
      avgOrderValue: cur.orders ? cur.revenue / cur.orders : 0,
      revenueChange: pctChange(cur.revenue, prev.revenue),
      ordersChange: pctChange(cur.orders, prev.orders),
    },
    today,
    statusCounts,
    customers,
    products,
    lowStock,
    recentOrders,
  });
});

/**
 * GET /api/admin/analytics/sales?days=30
 * Revenue and order count per day (or per month for ranges of 180+ days),
 * with empty buckets filled with zeros so charts have no gaps.
 */
export const sales = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 730);
  const monthly = days >= 180;
  const now = new Date();
  const from = new Date(now - days * DAY);

  // Bucket in JS so the timezone handling lives in one place (dayKey) and the
  // query stays a plain indexed find; the range is capped at 730 days.
  const orders = await Order.find({ ...SALES, createdAt: { $gte: from } }).select('createdAt totalPrice').lean();
  const map = new Map();
  for (const o of orders) {
    const full = dayKey(o.createdAt);
    const key = monthly ? full.slice(0, 7) : full;
    const cur = map.get(key) || { revenue: 0, orders: 0 };
    cur.revenue += o.totalPrice;
    cur.orders += 1;
    map.set(key, cur);
  }

  const keys = [];
  const seen = new Set();
  for (let i = days; i >= 0; i -= 1) {
    const full = dayKey(new Date(now - i * DAY));
    const key = monthly ? full.slice(0, 7) : full;
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }

  const series = keys.map((key) => ({
    date: key,
    revenue: Math.round((map.get(key)?.revenue || 0) * 100) / 100,
    orders: map.get(key)?.orders || 0,
  }));

  const totalRevenue = series.reduce((s, p) => s + p.revenue, 0);
  const totalOrders = series.reduce((s, p) => s + p.orders, 0);
  res.json({
    days,
    interval: monthly ? 'month' : 'day',
    series,
    totalRevenue,
    totalOrders,
    avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
  });
});
