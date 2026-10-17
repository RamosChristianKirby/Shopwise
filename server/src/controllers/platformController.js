import Store from '../models/Store.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { PLANS, PLAN_IDS, TRIAL_DAYS, effectivePlanId } from '../config/plans.js';
import { invalidateStoreCache } from '../middleware/tenant.js';
import { forgetDefaultStore } from '../platform.js';
import { applyPaidInvoice } from './storeController.js';

const DAY = 24 * 60 * 60 * 1000;

/** GET /api/platform/overview — SaaS metrics for Shopwise operators. */
export const overview = asyncHandler(async (req, res) => {
  const since30 = new Date(Date.now() - 30 * DAY);
  const [stores, users, gmvRows, newStores] = await Promise.all([
    Store.find().select('plan billing isDefault isActive createdAt').lean(),
    User.countDocuments(),
    Order.aggregate([
      { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: since30 } } },
      { $group: { _id: null, gmv: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
    ]),
    Store.countDocuments({ createdAt: { $gte: since30 }, isDefault: { $ne: true } }),
  ]);
  const tenants = stores.filter((s) => !s.isDefault);
  const byPlan = Object.fromEntries(PLAN_IDS.map((id) => [id, 0]));
  let mrr = 0;
  let trialing = 0;
  let pendingInvoices = 0;
  tenants.forEach((s) => {
    const plan = effectivePlanId(s);
    byPlan[plan] += 1;
    if (s.billing?.status === 'active' && plan !== 'starter') mrr += PLANS[plan].price;
    if (s.billing?.status === 'trialing' && plan !== 'starter') trialing += 1;
    pendingInvoices += (s.billing?.invoices || []).filter((i) => i.status === 'pending').length;
  });
  const paidStores = tenants.filter((s) => s.billing?.status === 'active' && effectivePlanId(s) !== 'starter').length;
  res.json({
    stores: tenants.length,
    activeStores: tenants.filter((s) => s.isActive !== false).length,
    newStores30d: newStores,
    users,
    byPlan,
    mrr,
    arr: mrr * 12,
    paidStores,
    trialing,
    conversionRate: tenants.length ? (paidStores / tenants.length) * 100 : 0,
    pendingInvoices,
    gmv30d: gmvRows[0]?.gmv || 0,
    orders30d: gmvRows[0]?.orders || 0,
    trialDays: TRIAL_DAYS,
  });
});

/** GET /api/platform/stores?q= — every store with owner, plan and 30-day sales. */
export const listStores = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.q) {
    const rx = { $regex: String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ name: rx }, { slug: rx }];
  }
  const stores = await Store.find(filter).populate('owner', 'name email').sort({ isDefault: -1, createdAt: -1 }).limit(200).lean();
  const ids = stores.map((s) => s._id);
  const since30 = new Date(Date.now() - 30 * DAY);
  const [sales, products] = await Promise.all([
    Order.aggregate([{ $match: { store: { $in: ids }, status: { $ne: 'cancelled' }, createdAt: { $gte: since30 } } }, { $group: { _id: '$store', revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } }]),
    Product.aggregate([{ $match: { store: { $in: ids } } }, { $group: { _id: '$store', count: { $sum: 1 } } }]),
  ]);
  const salesMap = new Map(sales.map((s) => [String(s._id), s]));
  const prodMap = new Map(products.map((p) => [String(p._id), p.count]));
  res.json(
    stores.map((s) => ({
      _id: s._id,
      name: s.name,
      slug: s.slug,
      isDefault: !!s.isDefault,
      isActive: s.isActive !== false,
      owner: s.owner ? { name: s.owner.name, email: s.owner.email } : null,
      plan: s.plan,
      effectivePlan: effectivePlanId(s),
      billing: { status: s.billing?.status, trialEndsAt: s.billing?.trialEndsAt, currentPeriodEnd: s.billing?.currentPeriodEnd },
      pendingInvoices: (s.billing?.invoices || []).filter((i) => i.status === 'pending'),
      products: prodMap.get(String(s._id)) || 0,
      revenue30d: salesMap.get(String(s._id))?.revenue || 0,
      orders30d: salesMap.get(String(s._id))?.orders || 0,
      createdAt: s.createdAt,
    }))
  );
});

/** PUT /api/platform/stores/:id { isActive?, plan?, extendDays? } */
export const updateStore = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  if (!store) {
    res.status(404);
    throw new Error('Store not found');
  }
  if (typeof req.body.isActive === 'boolean') {
    if (store.isDefault && !req.body.isActive) {
      res.status(400);
      throw new Error('The default store cannot be suspended');
    }
    store.isActive = req.body.isActive;
  }
  if (PLAN_IDS.includes(req.body.plan) && !store.isDefault) {
    store.plan = req.body.plan;
    if (req.body.plan === 'starter') store.billing.status = 'free';
    else {
      store.billing.status = 'active';
      const days = Math.min(Math.max(parseInt(req.body.extendDays, 10) || 30, 1), 730);
      store.billing.currentPeriodEnd = new Date(Math.max(Date.now(), new Date(store.billing.currentPeriodEnd || 0).getTime()) + days * DAY);
    }
  }
  await store.save();
  invalidateStoreCache();
  forgetDefaultStore();
  res.json({ message: 'Store updated' });
});

/** PUT /api/platform/stores/:id/invoices/:number { action: 'confirm' | 'void' } */
export const settleInvoice = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id);
  const invoice = store?.billing.invoices.find((i) => i.number === req.params.number);
  if (!invoice || invoice.status !== 'pending') {
    res.status(404);
    throw new Error('Open invoice not found');
  }
  if (req.body.action === 'void') invoice.status = 'void';
  else applyPaidInvoice(store, invoice);
  await store.save();
  invalidateStoreCache();
  res.json({ message: req.body.action === 'void' ? 'Invoice voided' : 'Payment confirmed — plan is active' });
});
