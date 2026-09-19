import mongoose from 'mongoose';
import { slugify } from './Category.js';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Product name is required'], trim: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: '' },
    price: { type: Number, required: [true, 'Price is required'], min: 0 },
    compareAtPrice: { type: Number, min: 0, default: 0 }, // "was" price for sale badges
    images: { type: [String], default: [] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'] },
    brand: { type: String, default: '', trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sold: { type: Number, default: 0, min: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', brand: 'text' });

productSchema.pre('validate', async function (next) {
  if (this.isModified('name') || !this.slug) {
    const base = slugify(this.name);
    let slug = base;
    let n = 1;
    // ensure uniqueness
    // eslint-disable-next-line no-await-in-loop
    while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    this.slug = slug;
  }
  next();
});

export default mongoose.model('Product', productSchema);
