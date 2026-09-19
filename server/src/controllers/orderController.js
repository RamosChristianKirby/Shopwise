import mongoose from 'mongoose';
import Order, { ORDER_STATUSES, PAYMENT_METHODS } from '../models/Order.js';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getShippingRules } from '../config/settings.js';

const round2 = (n) => Math.round(n * 100) / 100;

// Put stock back (used on cancellation and when order creation fails part-way).
async function restoreStock(items) {
  await Promise.all(
    items.map((i) =>
      Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty, sold: -i.qty } })
    )
  );
}

/** POST /api/orders  (customer) */
export const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod, paymentReference, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Your cart is empty');
  }
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    res.status(400);
    throw new Error('Please choose a valid payment method');
  }

  // Merge duplicate lines and validate quantities
  const wanted = new Map();
  for (const line of items) {
    const qty = Number(line.qty);
    if (!mongoose.isValidObjectId(line.product) || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      res.status(400);
      throw new Error('Invalid cart item');
    }
    wanted.set(String(line.product), (wanted.get(String(line.product)) || 0) + qty);
  }

  // Reserve stock atomically, one product at a time. If any line fails, undo the rest.
  const reserved = [];
  const orderItems = [];
  try {
    for (const [productId, qty] of wanted) {
      // Prices always come from the database, never from the client.
      const product = await Product.findOneAndUpdate(
        { _id: productId, isActive: true, stock: { $gte: qty } },
        { $inc: { stock: -qty, sold: qty } },
        { new: true }
      );
      if (!product) {
        const existing = await Product.findById(productId);
        res.status(400);
        throw new Error(
          existing && existing.isActive
            ? `Not enough stock for "${existing.name}" (only ${existing.stock} left)`
            : 'One of the products in your cart is no longer available'
        );
      }
      reserved.push({ product: product._id, qty });
      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        price: product.price,
        qty,
      });
    }

    const itemsPrice = round2(orderItems.reduce((sum, i) => sum + i.price * i.qty, 0));
    const { fee, freeOver } = getShippingRules();
    const shippingPrice = itemsPrice >= freeOver ? 0 : fee;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentReference: paymentReference || '',
      notes: notes || '',
      itemsPrice,
      shippingPrice,
      totalPrice: round2(itemsPrice + shippingPrice),
    });
    res.status(201).json(order);
  } catch (err) {
    await restoreStock(reserved);
    throw err;
  }
});

/** GET /api/orders/mine */
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

/** GET /api/orders/:id  (owner or admin) */
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  const ownerId = String(order.user?._id || order.user);
  if (req.user.role !== 'admin' && ownerId !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not allowed to view this order');
  }
  res.json(order);
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

/* ------------------------------ Admin ------------------------------ */

/** GET /api/admin/orders?status=&q=&page=&limit= */
export const adminGetOrders = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);

  const filter = {};
  if (ORDER_STATUSES.includes(status)) filter.status = status;
  if (q) filter.orderNumber = { $regex: String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

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

/** PUT /api/admin/orders/:id/status  { status } */
export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    res.status(400);
    throw new Error('Invalid status');
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (['cancelled', 'delivered'].includes(order.status) && order.status !== status) {
    res.status(400);
    throw new Error(`A ${order.status} order cannot be changed`);
  }
  if (order.status === status) return res.json(order);

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
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  if (order.status === 'cancelled') {
    res.status(400);
    throw new Error('Cannot mark a cancelled order as paid');
  }
  order.isPaid = true;
  order.paidAt = order.paidAt || new Date();
  await order.save();
  res.json(await order.populate('user', 'name email'));
});
