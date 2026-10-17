import mongoose from 'mongoose';
import { PLAN_IDS } from '../config/plans.js';

// Slugs that would clash with routes or look official.
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'app', 'www', 'shop', 'store', 'stores', 'sell', 'platform', 'login', 'register', 'account',
  'checkout', 'cart', 'orders', 'support', 'help', 'mail', 'static', 'assets', 'uploads', 'billing', 'dashboard', 'shopwise', 'main', 's',
]);

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 30 },
    percent: { type: Number, required: true, min: 1, max: 90 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    minItems: { type: Number, default: 0, min: 0 }, // e.g. 3 for bundle deals
    description: { type: String, default: '', maxlength: 160 },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    number: { type: String, required: true },
    plan: { type: String, enum: PLAN_IDS, required: true },
    amount: { type: Number, required: true },
    months: { type: Number, default: 1 },
    status: { type: String, enum: ['pending', 'paid', 'void'], default: 'pending' },
    method: { type: String, enum: ['gcash', 'bank', 'paypal', 'manual'], default: 'gcash' },
    reference: { type: String, default: '' },
    paidAt: Date,
  },
  { _id: false, timestamps: true }
);

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Store name is required'], trim: true, maxlength: 60 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, 'Store address can use 3–40 lowercase letters, numbers and dashes'],
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDefault: { type: Boolean, default: false, index: true }, // the platform's own flagship store
    isActive: { type: Boolean, default: true }, // false = suspended by the platform
    customDomain: { type: String, default: '', lowercase: true, trim: true },
    schemaVersion: { type: Number, default: 0 },

    plan: { type: String, enum: PLAN_IDS, default: 'starter' },
    billing: {
      status: { type: String, enum: ['trialing', 'active', 'past_due', 'cancelled', 'free'], default: 'free' },
      trialEndsAt: Date,
      currentPeriodEnd: Date,
      invoices: { type: [invoiceSchema], default: [] },
    },

    branding: {
      tagline: { type: String, default: 'Everyday essentials, delivered to your door.', maxlength: 140 },
      announcement: { type: String, default: '', maxlength: 160 },
      primaryColor: { type: String, default: '', match: [/^(#[0-9a-fA-F]{6})?$/, 'Use a hex colour like #256abf'] },
      heroTitle: { type: String, default: '', maxlength: 90 },
      heroText: { type: String, default: '', maxlength: 240 },
      heroImage: { type: String, default: '' },
    },

    settings: {
      supportEmail: { type: String, default: '' },
      supportPhone: { type: String, default: '' },
      gcashName: { type: String, default: '' },
      gcashNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      bankAccountName: { type: String, default: '' },
      bankAccountNumber: { type: String, default: '' },
      enableCod: { type: Boolean, default: true },
      enableGcash: { type: Boolean, default: true },
      enableBank: { type: Boolean, default: true },
      enablePaypal: { type: Boolean, default: true },
      paypalClientId: { type: String, default: '' },
      paypalSecret: { type: String, default: '', select: false },
      shippingFee: { type: Number, min: 0 },
      freeShippingOver: { type: Number, min: 0 },
      chatbotEnabled: { type: Boolean, default: true },
      chatbotName: { type: String, default: 'Wise', maxlength: 30 },
      returnsPolicy: { type: String, default: '', maxlength: 1500 },
    },

    coupons: { type: [couponSchema], default: [] },
  },
  { timestamps: true }
);

storeSchema.index({ customDomain: 1 });

storeSchema.methods.isManagedBy = function (user) {
  if (!user) return false;
  if (user.role === 'admin') return true; // platform operators can manage every store
  const id = String(user._id);
  return String(this.owner?._id || this.owner) === id || (this.staff || []).some((s) => String(s?._id || s) === id);
};

storeSchema.methods.isOwnedBy = function (user) {
  if (!user) return false;
  return user.role === 'admin' || String(this.owner?._id || this.owner) === String(user._id);
};

export default mongoose.model('Store', storeSchema);
