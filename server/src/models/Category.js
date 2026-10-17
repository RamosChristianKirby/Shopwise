import mongoose from 'mongoose';

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const categorySchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', index: true },
    name: { type: String, required: [true, 'Category name is required'], trim: true },
    slug: { type: String, index: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Names and slugs only have to be unique inside one store.
categorySchema.index({ store: 1, name: 1 }, { unique: true });
categorySchema.index({ store: 1, slug: 1 }, { unique: true });

categorySchema.pre('validate', function (next) {
  if (this.isModified('name') || !this.slug) this.slug = slugify(this.name);
  next();
});

export default mongoose.model('Category', categorySchema);
