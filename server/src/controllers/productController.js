import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import asyncHandler from '../utils/asyncHandler.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  popular: { sold: -1 },
  name: { name: 1 },
};

// Builds the list query. `includeInactive` is only true for the admin route.
async function listProducts(req, res, includeInactive) {
  const { q, category, sort = 'newest', featured, minPrice, maxPrice, lowStock } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);

  const filter = {};
  if (!includeInactive) filter.isActive = true;
  if (q) filter.name = { $regex: escapeRegex(String(q)), $options: 'i' };
  if (featured === 'true') filter.isFeatured = true;
  if (lowStock === 'true') filter.stock = { $lte: 5 };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (category) {
    if (mongoose.isValidObjectId(category)) filter.category = category;
    else {
      const cat = await Category.findOne({ slug: category });
      filter.category = cat ? cat._id : null;
    }
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .sort(SORTS[sort] || SORTS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ items, page, pages: Math.ceil(total / limit) || 1, total });
}

export const getProducts = asyncHandler((req, res) => listProducts(req, res, false));
export const adminGetProducts = asyncHandler((req, res) => listProducts(req, res, true));

export const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const filter = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const product = await Product.findOne(filter).populate('category', 'name slug');
  if (!product || (!product.isActive && req.user?.role !== 'admin')) {
    res.status(404);
    throw new Error('Product not found');
  }
  const related = await Product.find({ category: product.category?._id, _id: { $ne: product._id }, isActive: true })
    .limit(4)
    .populate('category', 'name slug');
  res.json({ product, related });
});

const pickFields = (body) => {
  const allowed = [
    'name', 'description', 'price', 'compareAtPrice', 'images', 'category',
    'brand', 'stock', 'isFeatured', 'isActive',
  ];
  return Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
};

export const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(pickFields(req.body));
  res.status(201).json(await product.populate('category', 'name slug'));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  Object.assign(product, pickFields(req.body));
  await product.save();
  res.json(await product.populate('category', 'name slug'));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  // Orders keep their own copy of name/price/image, so deleting is safe for history.
  await product.deleteOne();
  res.json({ message: 'Product deleted' });
});
