import Store, { RESERVED_SLUGS } from '../models/Store.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { PLANS, PLAN_IDS, TRIAL_DAYS, YEARLY_MONTHS_CHARGED, effectivePlanId, hasFeature, planFor, publicPlans } from '../config/plans.js';
import { DEFAULT_RETURNS_POLICY, getPaymentInfo, getShippingRules } from '../config/settings.js';
import { slugify } from '../models/Category.js';
import { invalidateStoreCache } from '../middleware/tenant.js';
import { forgetDefaultStore, getDefaultStore } from '../platform.js';
import { billingInvoicePdf } from '../utils/invoice.js';
import { capturePaypalOrder, createPaypalOrder } from '../utils/paypal.js';

const DAY = 24 * 60 * 60 * 1000;
const MAX_STORES_PER_USER = 3;

const refreshCaches = () => {
  invalidateStoreCache();
  forgetDefaultStore();
};

/** What shoppers' browsers may know about a store. */
export function publicStore(store) {
  const plan = planFor(store);
  const s = store.settings || {};
  return {
    _id: store._id,
    name: store.name,
    slug: store.slug,
    isDefault: !!store.isDefault,
    isActive: store.isActive !== false,
    branding: store.branding || {},
    plan: plan.id,
    features: {
      aiChat: plan.features.aiChat && s.chatbotEnabled !== false,
      paypal: !!getPaymentInfo(store).paypal,
      pdfInvoices: plan.features.pdfInvoices,
    },
    chatbotName: s.chatbotName || 'Wise',
    support: { email: s.supportEmail || '', phone: s.supportPhone || '' },
    returnsPolicy: s.returnsPolicy || DEFAULT_RETURNS_POLICY,
    shipping: getShippingRules(store),
    coupons: (store.coupons || []).filter((c) => c.active !== false).map(({ code, percent, minSubtotal, minItems, description }) => ({ code, percent, minSubtotal, minItems, description })),
  };
}

/* ------------------------------ public ------------------------------ */

export const getCurrentStore = asyncHandler(async (req, res) => {
  res.json(publicStore(req.store));
});

export const getPlans = asyncHandler(async (req, res) => {
  res.json({ plans: publicPlans(), trialDays: TRIAL_DAYS, yearlyMonthsCharged: YEARLY_MONTHS_CHARGED, currency: 'PHP' });
});

/** GET /api/stores/directory — active stores for the "Shops on Shopwise" showcase. */
export const getDirectory = asyncHandler(async (req, res) => {
  const stores = await Store.find({ isActive: true }).select('name slug branding isDefault createdAt').sort({ isDefault: -1, createdAt: -1 }).limit(24).lean();
  const counts = await Product.aggregate([
    { $match: { store: { $in: stores.map((s) => s._id) }, isActive: true } },
    { $sort: { isFeatured: -1, sold: -1 } },
    { $group: { _id: '$store', count: { $sum: 1 }, image: { $first: { $arrayElemAt: ['$images', 0] } } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c]));
  res.json(
    stores
      .map((s) => ({ name: s.name, slug: s.slug, isDefault: !!s.isDefault, tagline: s.branding?.tagline || '', productCount: map.get(String(s._id))?.count || 0, image: map.get(String(s._id))?.image || '' }))
      .filter((s) => s.isDefault || s.productCount > 0)
  );
});

/** GET /api/stores/check-slug?slug= */
export const checkSlug = asyncHandler(async (req, res) => {
  const slug = slugify(req.query.slug || '').slice(0, 40);
  const valid = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug);
  const available = valid && !RESERVED_SLUGS.has(slug) && !(await Store.exists({ slug }));
  res.json({ slug, valid, available });
});

/** Copies a sample of the default store's catalogue into a new store so it isn't empty on day one. */
async function copySampleCatalog(target) {
  const source = await getDefaultStore();
  const cats = await Category.find({ store: source._id }).lean();
  const catMap = new Map();
  for (const c of cats) {
    // eslint-disable-next-line no-await-in-loop
    const created = await Category.create({ store: target._id, name: c.name, description: c.description, image: c.image, sortOrder: c.sortOrder });
    catMap.set(String(c._id), created._id);
  }
  const products = await Product.find({ store: source._id, isActive: true }).sort({ isFeatured: -1, sold: -1 }).limit(12).lean();
  for (const p of products) {
    // eslint-disable-next-line no-await-in-loop
    await Product.create({
      store: target._id,
      name: p.name,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: p.images,
      category: catMap.get(String(p.category)),
      subcategory: p.subcategory,
      brand: p.brand,
      tags: p.tags,
      specs: p.specs,
      compatibility: p.compatibility,
      optionNames: p.optionNames,
      variants: (p.variants || []).map(({ options, sku, price, compareAtPrice, image }) => ({ options, sku, price, compareAtPrice, image, stock: 20 })),
      stock: 20,
      isFeatured: p.isFeatured,
    });
  }
  return products.length;
}

/** POST /api/stores — open a new store; the caller becomes its owner. */
export const createStore = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const slug = slugify(req.body.slug || name).slice(0, 40);
  const plan = PLAN_IDS.includes(req.body.plan) ? req.body.plan : 'starter';

  if (!name) {
    res.status(400);
    throw new Error('Please give your store a name');
  }
  if (RESERVED_SLUGS.has(slug)) {
    res.status(400);
    throw new Error(`“${slug}” is reserved — please pick another store address`);
  }
  if (req.user.role !== 'admin' && (await Store.countDocuments({ owner: req.user._id })) >= MAX_STORES_PER_USER) {
    res.status(400);
    throw new Error(`You can own up to ${MAX_STORES_PER_USER} stores`);
  }

  const now = Date.now();
  const store = await Store.create({
    name,
    slug,
    owner: req.user._id,
    plan,
    billing: plan === 'starter' ? { status: 'free' } : { status: 'trialing', trialEndsAt: new Date(now + TRIAL_DAYS * DAY) },
    branding: {
      tagline: String(req.body.tagline || '').slice(0, 140) || `Welcome to ${name}.`,
      primaryColor: /^#[0-9a-fA-F]{6}$/.test(req.body.primaryColor || '') ? req.body.primaryColor : '',
    },
    settings: { supportEmail: req.user.email, chatbotName: 'Wise' },
    coupons: [{ code: 'WELCOME10', percent: 10, description: '10% off your first order' }],
  });

  let sampleProducts = 0;
  if (req.body.sampleProducts) {
    try {
      sampleProducts = await copySampleCatalog(store);
    } catch (err) {
      console.warn(`Sample catalogue copy failed for ${slug}: ${err.message}`);
    }
  }
  refreshCaches();
  res.status(201).json({ store: publicStore(store), sampleProducts });
});

/* ------------------------------ store admin ------------------------------ */

async function loadAdminStore(req) {
  return Store.findById(req.store._id).select('+settings.paypalSecret').populate('owner', 'name email').populate('staff', 'name email');
}

function adminView(store, extras = {}) {
  const obj = store.toObject();
  const secretSet = !!obj.settings?.paypalSecret;
  if (obj.settings) delete obj.settings.paypalSecret;
  const planId = effectivePlanId(store);
  return {
    ...obj,
    settings: { ...obj.settings, paypalSecretSet: secretSet },
    effectivePlan: planId,
    planDetails: PLANS[planId],
    ...extras,
  };
}

const platformPaymentInfo = () => ({
  gcash: `${process.env.PLATFORM_GCASH_NAME || process.env.GCASH_NAME || 'Shopwise'} · ${process.env.PLATFORM_GCASH_NUMBER || process.env.GCASH_NUMBER || '(number not set)'}`,
  bank: `${process.env.PLATFORM_BANK_NAME || process.env.BANK_NAME || 'Bank'} · ${process.env.PLATFORM_BANK_ACCOUNT_NAME || process.env.BANK_ACCOUNT_NAME || 'Shopwise'} · ${process.env.PLATFORM_BANK_ACCOUNT_NUMBER || process.env.BANK_ACCOUNT_NUMBER || '(account number not set)'}`,
  paypalClientId: process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? process.env.PAYPAL_CLIENT_ID : '',
  currency: process.env.PAYPAL_CURRENCY || 'PHP',
});

/** GET /api/admin/store — settings, plan, usage and billing for the store being managed. */
export const getAdminStore = asyncHandler(async (req, res) => {
  const store = await loadAdminStore(req);
  const products = await Product.countDocuments({ store: store._id });
  res.json(
    adminView(store, {
      usage: { products, staff: 1 + (store.staff?.length || 0) },
      plans: publicPlans(),
      trialDays: TRIAL_DAYS,
      yearlyMonthsCharged: YEARLY_MONTHS_CHARGED,
      platformPayment: platformPaymentInfo(),
      canEdit: store.isOwnedBy(req.user),
    })
  );
});

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);

/** PUT /api/admin/store — owner updates branding, payments, shipping, coupons, chatbot. */
export const updateAdminStore = asyncHandler(async (req, res) => {
  const store = await loadAdminStore(req);
  const { name, branding = {}, settings = {}, coupons, customDomain } = req.body;

  if (name !== undefined) store.name = str(name, 60) || store.name;
  for (const k of ['tagline', 'announcement', 'primaryColor', 'heroTitle', 'heroText', 'heroImage']) {
    if (branding[k] !== undefined) store.branding[k] = str(branding[k], k === 'heroText' ? 240 : 300);
  }
  const textSettings = ['supportEmail', 'supportPhone', 'gcashName', 'gcashNumber', 'bankName', 'bankAccountName', 'bankAccountNumber', 'chatbotName', 'returnsPolicy', 'paypalClientId'];
  for (const k of textSettings) if (settings[k] !== undefined) store.settings[k] = str(settings[k], k === 'returnsPolicy' ? 1500 : 200);
  for (const k of ['enableCod', 'enableGcash', 'enableBank', 'enablePaypal', 'chatbotEnabled']) if (typeof settings[k] === 'boolean') store.settings[k] = settings[k];
  for (const k of ['shippingFee', 'freeShippingOver']) {
    if (settings[k] === '' || settings[k] === null) store.settings[k] = undefined;
    else if (settings[k] !== undefined) store.settings[k] = Math.max(0, Number(settings[k]) || 0);
  }
  if (settings.paypalSecret) store.settings.paypalSecret = str(settings.paypalSecret, 200);
  if (store.settings.paypalClientId && !store.settings.paypalSecret && !store.isDefault) {
    res.status(400);
    throw new Error('Add your PayPal secret too (or clear the client ID)');
  }
  if (!store.settings.paypalClientId) store.settings.paypalSecret = '';

  if (Array.isArray(coupons)) {
    const seen = new Set();
    store.coupons = coupons
      .map((c) => ({
        code: str(c.code, 30).toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
        percent: Math.min(90, Math.max(1, Number(c.percent) || 0)),
        minSubtotal: Math.max(0, Number(c.minSubtotal) || 0),
        minItems: Math.max(0, parseInt(c.minItems, 10) || 0),
        description: str(c.description, 160),
        active: c.active !== false,
      }))
      .filter((c) => c.code && !seen.has(c.code) && seen.add(c.code))
      .slice(0, 20);
  }
  if (customDomain !== undefined) {
    const domain = str(customDomain, 120).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (domain && domain !== store.customDomain && !hasFeature(store, 'customDomain')) {
      res.status(402);
      throw new Error('Custom domains are part of the Business plan');
    }
    if (domain && (await Store.exists({ customDomain: domain, _id: { $ne: store._id } }))) {
      res.status(409);
      throw new Error('That domain is already connected to another store');
    }
    store.customDomain = domain;
  }
  await store.save();
  refreshCaches();
  res.json(adminView(store, { canEdit: true }));
});

/** POST /api/admin/store/staff { email } */
export const addStaff = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.store._id);
  const seats = planFor(store).limits.staff;
  if (seats !== null && 1 + store.staff.length >= seats) {
    res.status(402);
    throw new Error(`Your ${planFor(store).name} plan includes ${seats} seat${seats === 1 ? '' : 's'}. Upgrade to add team members.`);
  }
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase().trim() });
  if (!user) {
    res.status(404);
    throw new Error('No account uses that email. Ask them to register on the site first.');
  }
  if (String(store.owner) === String(user._id) || store.staff.some((s) => String(s) === String(user._id))) {
    res.status(400);
    throw new Error(`${user.name} is already on the team`);
  }
  store.staff.push(user._id);
  await store.save();
  refreshCaches();
  res.status(201).json({ _id: user._id, name: user.name, email: user.email });
});

/** DELETE /api/admin/store/staff/:userId */
export const removeStaff = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.store._id);
  store.staff = store.staff.filter((s) => String(s) !== String(req.params.userId));
  await store.save();
  refreshCaches();
  res.json({ message: 'Removed from the team' });
});

/* ------------------------------ billing ------------------------------ */

const invoiceNumber = () => {
  const d = new Date();
  return `SW-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
};

/** Marks an invoice paid and moves the subscription forward. Used by PayPal capture and the platform console. */
export function applyPaidInvoice(store, invoice, { reference } = {}) {
  invoice.status = 'paid';
  invoice.paidAt = new Date();
  if (reference) invoice.reference = reference;
  const from = Math.max(Date.now(), store.billing.currentPeriodEnd && store.plan === invoice.plan ? new Date(store.billing.currentPeriodEnd).getTime() : 0);
  store.plan = invoice.plan;
  store.billing.status = 'active';
  store.billing.trialEndsAt = undefined;
  store.billing.currentPeriodEnd = new Date(from + 30 * DAY * (invoice.months || 1));
}

/** POST /api/admin/store/billing/checkout { plan, cycle: 'monthly'|'yearly', method, reference } */
export const billingCheckout = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.store._id);
  if (store.isDefault) {
    res.status(400);
    throw new Error('The platform’s own store is not billed');
  }
  const plan = PLANS[req.body.plan];
  if (!plan) {
    res.status(400);
    throw new Error('Unknown plan');
  }
  if (plan.id === 'starter') {
    const products = await Product.countDocuments({ store: store._id });
    if (products > plan.limits.products) {
      res.status(400);
      throw new Error(`Starter allows ${plan.limits.products} products and you have ${products}. Hide or delete some first.`);
    }
    store.plan = 'starter';
    store.billing.status = 'free';
    store.billing.trialEndsAt = undefined;
    store.billing.currentPeriodEnd = undefined;
    await store.save();
    refreshCaches();
    return res.json({ store: adminView(store), invoice: null });
  }

  const yearly = req.body.cycle === 'yearly';
  const months = yearly ? 12 : 1;
  const method = ['gcash', 'bank', 'paypal'].includes(req.body.method) ? req.body.method : 'gcash';
  // Only one open invoice at a time: replace any pending one.
  store.billing.invoices.forEach((i) => { if (i.status === 'pending') i.status = 'void'; });
  const invoice = {
    number: invoiceNumber(),
    plan: plan.id,
    amount: plan.price * (yearly ? YEARLY_MONTHS_CHARGED : 1),
    months,
    status: 'pending',
    method,
    reference: str(req.body.reference, 100),
  };
  store.billing.invoices.push(invoice);
  await store.save();
  refreshCaches();
  res.status(201).json({ store: adminView(store), invoice: store.billing.invoices[store.billing.invoices.length - 1] });
});

/** PUT /api/admin/store/billing/invoices/:number { reference } — owner adds the GCash/bank reference */
export const billingReference = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.store._id);
  const invoice = store.billing.invoices.find((i) => i.number === req.params.number);
  if (!invoice || invoice.status !== 'pending') {
    res.status(404);
    throw new Error('Open invoice not found');
  }
  invoice.reference = str(req.body.reference, 100);
  await store.save();
  res.json(invoice);
});

/** POST /api/admin/store/billing/cancel — keeps the plan until the paid period ends */
export const billingCancel = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.store._id);
  if (store.billing.status === 'trialing') {
    store.plan = 'starter';
    store.billing.status = 'free';
    store.billing.trialEndsAt = undefined;
  } else if (store.billing.status === 'active') {
    store.billing.status = 'cancelled';
  }
  store.billing.invoices.forEach((i) => { if (i.status === 'pending') i.status = 'void'; });
  await store.save();
  refreshCaches();
  res.json(adminView(store));
});

/** GET /api/admin/store/billing/invoices/:number.pdf */
export const billingInvoicePdfRoute = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.store._id);
  const invoice = store.billing.invoices.find((i) => i.number === req.params.number);
  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="shopwise-${invoice.number}.pdf"` });
  res.send(billingInvoicePdf(store, invoice, PLANS[invoice.plan]));
});

const platformPaypal = (res) => {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    res.status(400);
    throw new Error('PayPal is not configured on this platform');
  }
  return { clientId: process.env.PAYPAL_CLIENT_ID, secret: process.env.PAYPAL_CLIENT_SECRET };
};

/** POST /api/admin/store/billing/invoices/:number/paypal */
export const billingPaypalCreate = asyncHandler(async (req, res) => {
  const creds = platformPaypal(res);
  const store = await Store.findById(req.store._id);
  const invoice = store.billing.invoices.find((i) => i.number === req.params.number && i.status === 'pending');
  if (!invoice) {
    res.status(404);
    throw new Error('Open invoice not found');
  }
  const id = await createPaypalOrder(creds, { amount: invoice.amount, currency: process.env.PAYPAL_CURRENCY || 'PHP', reference: invoice.number, description: `Shopwise ${invoice.plan} plan` });
  invoice.reference = id;
  invoice.method = 'paypal';
  await store.save();
  res.json({ id });
});

/** POST /api/admin/store/billing/invoices/:number/paypal/capture { paypalOrderId } */
export const billingPaypalCapture = asyncHandler(async (req, res) => {
  const creds = platformPaypal(res);
  const store = await Store.findById(req.store._id);
  const invoice = store.billing.invoices.find((i) => i.number === req.params.number && i.status === 'pending');
  if (!invoice || invoice.reference !== req.body.paypalOrderId) {
    res.status(400);
    throw new Error('PayPal payment does not match this invoice');
  }
  const result = await capturePaypalOrder(creds, invoice.reference);
  if (result.status !== 'COMPLETED' || Math.abs(result.amount - invoice.amount) > 0.01) {
    res.status(400);
    throw new Error('PayPal did not complete the payment');
  }
  applyPaidInvoice(store, invoice, { reference: result.captureId });
  await store.save();
  refreshCaches();
  res.json(adminView(store));
});

