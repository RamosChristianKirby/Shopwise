import mongoose from 'mongoose';

export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
export const PAYMENT_METHODS = ['cod', 'gcash', 'bank', 'paypal'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: mongoose.Schema.Types.ObjectId }, // set when the product has options
    variantLabel: { type: String, default: '' }, // e.g. "Black / M"
    name: { type: String, required: true },
    image: String,
    price: { type: Number, required: true }, // price at time of purchase
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      city: { type: String, required: true },
      province: { type: String, default: '' },
      postalCode: { type: String, default: '' },
    },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentReference: { type: String, default: '' },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    paypalOrderId: { type: String, default: '' },
    itemsPrice: { type: Number, required: true },
    couponCode: { type: String, default: '' },
    discount: { type: Number, default: 0 },
    shippingPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    deliveredAt: Date,
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ store: 1, createdAt: -1 });

orderSchema.pre('validate', function (next) {
  if (!this.orderNumber) {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    this.orderNumber = `ORD-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }
  next();
});

export default mongoose.model('Order', orderSchema);
