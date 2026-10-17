import mongoose from 'mongoose';
import Order, { ORDER_STATUSES, PAYMENT_METHODS } from '../models/Order.js';
import Product from '../models/Product.js';
import Store from '../models/Store.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getPaymentInfo, getPaypalCredentials, getShippingRules } from '../config/settings.js';
import { evaluateCoupon } from '../utils/coupons.js';
import { orderInvoicePdf } from '../utils/invoice.js';
import { capturePaypalOrder, createPaypalOrder } from '../utils/paypal.js';

const round2 = (n) => Math.round(n * 100) / 100;

// Put stock back (used on cancellation and when order creation fails part-way).
async function restoreStock(items) {
  await Promise.all(
    items.map((i) =>
      i.variant
        ? Product.updateOne({ _id: i.product, 'variants._id': i.variant }, { $inc: { 'variants.$.stock': i.qty, stock: i.qty, sold: -i.qty } })
        : Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty, sold: -i.qty } })
    )
  );
}

/** Reserves stock for one cart line atomically; returns the order item or throws. */
async function reserveLine(req, res, { productId, variantId, qty }) {
  const base = { _id: productId, store: req.store._id, isActive: true };
  let product;
  if (variantId) {
    product = await Product.findOneAndUpdate(
      { ...base, variants: { $elemMatch: { _id: new mongoose.Types.ObjectId(variantId), stock: { $gte: qty } } } },
      { $inc: { 'variants.$.stock': -qty, stock: -qty, sold: qty } },
      { new: true }
    );
  } else {
    product = await Product.findOneAndUpdate(
      { ...base, stock: { $gte: qty }, 'variants.0': { $exists: false } },
      { $inc: { stock: -qty, sold: qty } },
      { new: true }
    );
  }
  if (!product) {
    const existing = await Product.findOne({ _id: productId, store: req.store._id });
    res.status(400);
    if (!existing || !existing.isActive) throw new Error('One of the products in your cart is no longer available');
    if (!variantId && existing.variants.length) throw new Error(`Please choose options for "${existing.name}"`);
    const info = existing.variantInfo(variantId);
    if (!info) throw new Error(`The option you picked for "${existing.name}" is no longer available`);
    throw new Error(`Not enough stock for "${existing.name}${info.label ? ` (${info.label})` : ''}" (only ${info.stock} left)`);
  }
  // Prices always come from the database, never from the client.
  const info = product.variantInfo(variantId);
  return {
    product: product._id,
    variant: variantId || undefined,
    variantLabel: info.label,
    name: product.name,
    image: info.image,
    price: info.price,
    qty,
  };
}

/** POST /api/orders  (customer) */
export const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod, paymentReference, notes, couponCode } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Your cart is empty');
  }
  const allowed = getPaymentInfo(req.store).methods.map((m) => m.id);
  if (!PAYMENT_METHODS.includes(paymentMethod) || !allowed.includes(paymentMethod)) {
    res.status(400);
    throw new Error('Please choose a valid payment method');
  }

  // Merge duplicate lines and validate quantities
  const wanted = new Map();
  for (const line of items) {
    const qty = Number(line.qty);
    const variant = line.variant ? String(line.variant) : '';
    if (!mongoose.isValidObjectId(line.product) || (variant && !mongoose.isValidObjectId(variant)) || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      res.status(400);
      throw new Error('Invalid cart item');
    }
    const key = `${line.product}:${variant}`;
    const prev = wanted.get(key);
    wanted.set(key, { productId: String(line.product), variantId: variant, qty: (prev?.qty || 0) + qty });
  }

  // Reserve stock one line at a time. If any line fails, undo the rest.
  const reserved = [];
  try {
    for (const line of wanted.values()) {
      // eslint-disable-next-line no-await-in-loop
      reserved.push(await reserveLine(req, res, line));
    }

    const itemsPrice = round2(reserved.reduce((sum, i) => sum + i.price * i.qty, 0));
    const distinct = new Set(reserved.map((i) => String(i.product))).size;
    const { coupon, discount, error } = evaluateCoupon(req.store, couponCode, { subtotal: itemsPrice, itemCount: distinct });
    if (error) {
      res.status(400);
      throw new Error(error);
    }
    const { fee, freeOver } = getShippingRules(req.store);
    const afterDiscount = round2(itemsPrice - (discount || 0));
    const shippingPrice = afterDiscount >= freeOver ? 0 : fee;

    const order = await Order.create({
      store: req.store._id,
      user: req.user._id,
      items: reserved,
      shippingAddress,
      paymentMethod,
      paymentReference: paymentMethod === 'paypal' ? '' : paymentReference || '',
      notes: notes || '',
      itemsPrice,
      couponCode: coupon?.code || '',
      discount: discount || 0,
      shippingPrice,
      totalPrice: round2(afterDiscount + shippingPrice),
    });
    res.status(201).json(order);
  } catch (err) {
    await restoreStock(reserved);
    throw err;
  }
});

/** POST /api/coupons/validate { code, subtotal, itemCount } — preview only; the order is re-checked on the server. */
export const validateCoupon = asyncHandler(async (req, res) => {
  const result = evaluateCoupon(req.store, req.body.code, { subtotal: Number(req.body.subtotal) || 0, itemCount: Number(req.body.itemCount) || 0 });
  if (result.error) {
    res.status(400);
    throw new Error(result.error);
  }
  res.json({ code: result.coupon?.code, percent: result.coupon?.percent, description: result.coupon?.description, discount: result.discount });
});

/** GET /api/orders/mine — this customer's orders in the current store */
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id, store: req.store._id }).sort({ createdAt: -1 });
  res.json(orders);
});

/** Loads an order the requester may see: its customer, its store's admins, or platform admins. */
async function loadVisibleOrder(req, res) {
  const order = mongoose.isValidObjectId(req.params.id) ? await Order.findById(req.params.id).populate('user', 'name email') : null;
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  const ownerId = String(order.user?._id || order.user);
  if (ownerId === String(req.user._id)) return order;
  const store = String(order.store) === String(req.store?._id) ? req.store : await Store.findById(order.store);
  if (store?.isManagedBy(req.user)) return order;
  res.status(403);
  throw new Error('Not allowed to view this order');
}

/** GET /api/orders/:id  (owner or store admin) */
export const getOrder = asyncHandler(async (req, res) => {
  res.json(await loadVisibleOrder(req, res));
});

/** GET /api/orders/:id/invoice.pdf */
export const getOrderInvoice = asyncHandler(async (req, res) => {
  const order = await loadVisibleOrder(req, res);
  const store = String(order.store) === String(req.store?._id) ? req.store : await Store.findById(order.store);
  const pdf = orderInvoicePdf(order, store);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${req.query.download === '0' ? 'inline' : 'attachment'}; filename="invoice-${order.orderNumber}.pdf"`,
    'Cache-Control': 'private, no-store',
  });
  res.send(pdf);
});

/** POST /api/orders/track { orderNumber, email } — public order lookup for the support page and chatbot */
export const trackOrder = asyncHandler(async (req, res) => {
  const orderNumber = String(req.body.orderNumber || '').trim().toUpperCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const order = orderNumber ? await Order.findOne({ orderNumber, store: req.store._id }).populate('user', 'email') : null;
  if (!order || !email || order.user?.email !== email) {
    res.status(404);
    throw new Error('We couldn’t find an order with that number and email');
  }
  res.json({
    orderNumber: order.orderNumber,
    status: order.status,
    isPaid: order.isPaid,
    paymentMethod: order.paymentMethod,
    totalPrice: order.totalPrice,
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    items: order.items.map((i) => ({ name: i.name, variantLabel: i.variantLabel, qty: i.qty })),
  });
});

/** PUT /api/orders/:id/payment-reference  (owner) */
export const submitPaymentReference = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || String(order.user) !== String(req.user._id)) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.isPaid || order.status === 'cancelled') {
    res.status(400);
    throw new Error('This order can no longer be updated');
  }
  order.paymentReference = String(req.body.paymentReference || '').slice(0, 100);
  await order.save();
  res.json(order);
});

/** PUT /api/orders/:id/cancel  (owner, only while pending) */
export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || String(order.user) !== String(req.user._id)) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.status !== 'pending' || order.isPaid) {
    res.status(400);
    throw new Error('Only unpaid pending orders can be cancelled. Please contact the store.');
  }
  order.status = 'cancelled';
  await order.save();
  await restoreStock(order.items);
  res.json(order);
});

/* ------------------------------ PayPal ------------------------------ */

async function paypalFor(req, res, order) {
  const store = await Store.findById(order.store).select('+settings.paypalSecret');
  const creds = getPaypalCredentials(store, store?.settings?.paypalSecret);
  if (!creds) {
    res.status(400);
    throw new Error('PayPal is not set up for this store');
  }
  return { store, creds };
}

async function ownUnpaidPaypalOrder(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order || String(order.user) !== String(req.user._id)) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.paymentMethod !== 'paypal' || order.isPaid || order.status === 'cancelled') {
    res.status(400);
    throw new Error('This order can’t be paid with PayPal');
  }
  return order;
}

/** POST /api/orders/:id/paypal — creates the PayPal order the buttons approve */
export const paypalCreate = asyncHandler(async (req, res) => {
  const order = await ownUnpaidPaypalOrder(req, res);
  const { store, creds } = await paypalFor(req, res, order);
  const id = await createPaypalOrder(creds, {
    amount: order.totalPrice,
    currency: process.env.PAYPAL_CURRENCY || 'PHP',
    reference: order.orderNumber,
    description: `${store.name} order ${order.orderNumber}`,
  });
  order.paypalOrderId = id;
  await order.save();
  res.json({ id });
});

/** POST /api/orders/:id/paypal/capture — captures after the shopper approves; marks the order paid */
export const paypalCapture = asyncHandler(async (req, res) => {
  const order = await ownUnpaidPaypalOrder(req, res);
  if (!order.paypalOrderId || order.paypalOrderId !== req.body.paypalOrderId) {
    res.status(400);
    throw new Error('PayPal payment does not match this order');
  }
  const { creds } = await paypalFor(req, res, order);
  const result = await capturePaypalOrder(creds, order.paypalOrderId);
  if (result.status !== 'COMPLETED' || Math.abs(result.amount - order.totalPrice) > 0.01) {
    res.status(400);
    throw new Error('PayPal did not complete the payment. You have not been charged twice — please try again.');
  }
  order.isPaid = true;
  order.paidAt = new Date();
  order.paymentReference = result.captureId;
  if (order.status === 'pending') order.status = 'processing';
  await order.save();
  res.json(await order.populate('user', 'name email'));
});

/* ------------------------------ Admin ------------------------------ */

/** GET /api/admin/orders?status=&q=&page=&limit= */
export const adminGetOrders = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);

  const filter = { store: req.store._id };
  if (ORDER_STATUSES.includes(status)) filter.status = status;
  if (q) {
    const rx = { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').limit(200);
    filter.$or = [{ orderNumber: rx }, { user: { $in: users.map((u) => u._id) } }];
  }

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ items, page, pages: Math.ceil(total / limit) || 1, total });
});

const findStoreOrder = async (req, res) => {
  const order = mongoose.isValidObjectId(req.params.id) ? await Order.findOne({ _id: req.params.id, store: req.store._id }) : null;
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  return order;
};

/** PUT /api/admin/orders/:id/status  { status } */
export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }
  const order = await findStoreOrder(req, res);
  if (['cancelled', 'delivered'].includes(order.status) && order.status !== status) {
    res.status(400);
    throw new Error(`A ${order.status} order cannot be changed`);
  }
  if (order.status === status) return res.json(await order.populate('user', 'name email'));

  if (status === 'cancelled') await restoreStock(order.items);
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    // Cash on Delivery is settled at the door
    if (order.paymentMethod === 'cod' && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
    }
  }
  order.status = status;
  await order.save();
  res.json(await order.populate('user', 'name email'));
});

/** PUT /api/admin/orders/:id/pay  – confirm a GCash / bank payment */
export const adminMarkPaid = asyncHandler(async (req, res) => {
  const order = await findStoreOrder(req, res);
  if (order.status === 'cancelled') {
    res.status(400);
    throw new Error('Cannot mark a cancelled order as paid');
  }
  order.isPaid = true;
  order.paidAt = order.paidAt || new Date();
  await order.save();
  res.json(await order.populate('user', 'name email'));
});
