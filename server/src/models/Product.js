import mongoose from 'mongoose';
import { slugify } from './Category.js';

// One buyable combination of options, e.g. { Color: 'Black', Size: 'M' }.
const variantSchema = new mongoose.Schema({
  options: { type: mongoose.Schema.Types.Mixed, default: {} }, // { Color: 'Black', Size: 'M' }
  sku: { type: String, default: '', trim: true },
  price: { type: Number, min: 0 }, // optional override of the product price
  compareAtPrice: { type: Number, min: 0 },
  stock: { type: Number, min: 0, default: 0 },
  image: { type: String, default: '' },
});

const productSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    slug: { type: String, index: true },
    description: { type: String, default: '' },
    price: { type: Number, required: [true, 'Price is required'], min: 0 },
    compareAtPrice: { type: Number, min: 0, default: 0 }, // "was" price for sale badges
    images: { type: [String], default: [] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'] },
    subcategory: { type: String, default: '', trim: true },
    brand: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
    specs: { type: [{ label: String, value: String, _id: false }], default: [] },
    // Devices / setups the product works with, used by the compatibility checker.
    compatibility: { type: [String], default: [] },
    // Option names in display order, e.g. ['Color', 'Size']; empty = no variants.
    optionNames: { type: [String], default: [] },
    variants: { type: [variantSchema], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sold: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ store: 1, slug: 1 }, { unique: true });
productSchema.index({ store: 1, isActive: 1, category: 1, subcategory: 1, brand: 1 });
productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });

productSchema.pre('validate', async function (next) {
  if (this.isModified('name') || !this.slug) {
    const base = slugify(this.name) || 'product';
    let slug = base;
    let n = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.constructor.exists({ store: this.store, slug, _id: { $ne: this._id } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    this.slug = slug;
  }
  // With variants, the product's stock is always the total of its variants.
  if (this.variants?.length) this.stock = this.variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  next();
});

/** Price/stock/label for one variant (falls back to the product). */
productSchema.methods.variantInfo = function (variantId) {
  if (!variantId) return { price: this.price, compareAtPrice: this.compareAtPrice, stock: this.stock, label: '', image: this.images?.[0] || '' };
  const v = this.variants.id(variantId);
  if (!v) return null;
  const opts = v.options || {};
  const label = (this.optionNames.length ? this.optionNames : Object.keys(opts)).map((n) => opts[n]).filter(Boolean).join(' / ');
  return {
    price: v.price ?? this.price,
    compareAtPrice: v.compareAtPrice ?? this.compareAtPrice,
    stock: v.stock,
    label,
    image: v.image || this.images?.[0] || '',
  };
};

export default mongoose.model('Product', productSchema);
