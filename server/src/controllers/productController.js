import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import asyncHandler from '../utils/asyncHandler.js';
import { planFor } from '../config/plans.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const csv = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  popular: { sold: -1 },
  rating: { rating: -1, numReviews: -1 },
  name: { name: 1 },
};

async function categoryId(store, category) {
  if (!category) return undefined;
  if (mongoose.isValidObjectId(category)) return new mongoose.Types.ObjectId(String(category));
  const cat = await Category.findOne({ store: store._id, slug: category }).select('_id');
  return cat ? cat._id : null;
}

/**
 * Builds the Mongo filter for the storefront/admin product list from query params.
 * `omit` leaves one filter out — the facets endpoint uses it so a facet's own
 * options aren't narrowed by the value currently selected in it.
 */
async function buildFilter(req, { includeInactive = false, omit = [] } = {}) {
  const { q, category, subcategory, brand, featured, minPrice, maxPrice, lowStock, inStock, onSale, minRating, compat } = req.query;
  const filter = { store: req.store._id };
  if (!includeInactive) filter.isActive = true;
  if (q) {
    const rx = { $regex: escapeRegex(String(q).slice(0, 80)), $options: 'i' };
    filter.$or = [{ name: rx }, { brand: rx }, { tags: rx }, { subcategory: rx }];
  }
  if (featured === 'true') filter.isFeatured = true;
  if (lowStock === 'true') filter.stock = { $lte: 5 };
  if (inStock === 'true') filter.stock = { $gt: 0 };
  if (onSale === 'true') filter.$expr = { $gt: ['$compareAtPrice', '$price'] };
  if (minRating && !omit.includes('rating')) filter.rating = { $gte: Number(minRating) || 0 };
  if ((minPrice || maxPrice) && !omit.includes('price')) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (category && !omit.includes('category')) filter.category = await categoryId(req.store, category);
  if (subcategory && !omit.includes('subcategory')) filter.subcategory = { $in: csv(subcategory) };
  if (brand && !omit.includes('brand')) filter.brand = { $in: csv(brand) };
  if (compat && !omit.includes('compat')) filter.compatibility = { $in: csv(compat) };

  // Variant options, e.g. ?opt_Color=Black,White&opt_Size=M
  for (const [key, value] of Object.entries(req.query)) {
    if (!key.startsWith('opt_') || omit.includes(key)) continue;
    const name = key.slice(4).replace(/[^\w -]/g, '');
    if (name) filter.variants = { $elemMatch: { ...(filter.variants?.$elemMatch || {}), [`options.${name}`]: { $in: csv(value) } } };
  }
  return filter;
}

async function listProducts(req, res, includeInactive) {
  const { sort = 'newest' } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 100);
  const filter = await buildFilter(req, { includeInactive });

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

const countBy = async (match, field) => {
  const rows = await Product.aggregate([
    { $match: match },
    ...(field === 'compatibility' ? [{ $unwind: '$compatibility' }] : []),
    { $match: { [field]: { $nin: ['', null] } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
  return rows.map((r) => ({ value: r._id, count: r.count }));
};

/**
 * GET /api/products/facets — filter options with counts for the current selection.
 * The shop loads these as a cascade: category → subcategories → brands → options,
 * each level narrowed by the levels above it.
 */
export const getFacets = asyncHandler(async (req, res) => {
  const level = String(req.query.level || 'all');
  const want = (l) => level === 'all' || level === l;
  const out = {};

  if (want('categories')) {
    const match = await buildFilter(req, { omit: ['category', 'subcategory', 'brand', 'compat'] });
    const [counts, cats] = await Promise.all([
      Product.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Category.find({ store: req.store._id }).sort({ sortOrder: 1, name: 1 }).lean(),
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.count]));
    out.categories = cats.map((c) => ({ _id: c._id, name: c.name, slug: c.slug, count: map.get(String(c._id)) || 0 }));
  }
  if (want('subcategories')) out.subcategories = await countBy(await buildFilter(req, { omit: ['subcategory', 'brand', 'compat'] }), 'subcategory');
  if (want('brands')) out.brands = await countBy(await buildFilter(req, { omit: ['brand', 'compat'] }), 'brand');
  if (want('options')) {
    const match = await buildFilter(req, { omit: Object.keys(req.query).filter((k) => k.startsWith('opt_')) });
    const rows = await Product.aggregate([
      { $match: { ...match, 'variants.0': { $exists: true } } },
      { $unwind: '$variants' },
      { $project: { kv: { $objectToArray: '$variants.options' }, pid: '$_id' } },
      { $unwind: '$kv' },
      { $group: { _id: { k: '$kv.k', v: '$kv.v' }, products: { $addToSet: '$pid' } } },
      { $project: { _id: 0, name: '$_id.k', value: '$_id.v', count: { $size: '$products' } } },
      { $sort: { name: 1, value: 1 } },
    ]);
    const grouped = {};
    rows.forEach((r) => { (grouped[r.name] ||= []).push({ value: r.value, count: r.count }); });
    out.options = Object.entries(grouped).map(([name, values]) => ({ name, values }));
    out.compatibility = await countBy(await buildFilter(req, { omit: ['compat'] }), 'compatibility');
  }
  if (want('price')) {
    const match = await buildFilter(req, { omit: ['price'] });
    const [row] = await Product.aggregate([{ $match: match }, { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }]);
    out.price = { min: Math.floor(row?.min || 0), max: Math.ceil(row?.max || 0) };
  }
  res.json(out);
});

export const getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const filter = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug, store: req.store._id } : { slug: idOrSlug, store: req.store._id };
  const product = await Product.findOne(filter).populate('category', 'name slug');
  if (!product || (!product.isActive && !req.store.isManagedBy(req.user))) {
    res.status(404);
    throw new Error('Product not found');
  }
  const base = { store: req.store._id, _id: { $ne: product._id }, isActive: true };
  // Related: same subcategory first, then same category, then same brand.
  const [same, sameCat, sameBrand] = await Promise.all([
    product.subcategory ? Product.find({ ...base, subcategory: product.subcategory }).limit(4).populate('category', 'name slug') : [],
    Product.find({ ...base, category: product.category?._id, ...(product.subcategory ? { subcategory: { $ne: product.subcategory } } : {}) }).sort({ sold: -1 }).limit(8).populate('category', 'name slug'),
    product.brand ? Product.find({ ...base, brand: product.brand, category: { $ne: product.category?._id } }).limit(4).populate('category', 'name slug') : [],
  ]);
  const seen = new Set();
  const related = [...same, ...sameCat, ...sameBrand].filter((p) => !seen.has(String(p._id)) && seen.add(String(p._id))).slice(0, 8);
  // "Pairs well with": best sellers from other categories (cross-sell for bundles).
  const pairs = await Product.find({ ...base, category: { $ne: product.category?._id }, stock: { $gt: 0 } })
    .sort({ sold: -1 })
    .limit(3)
    .populate('category', 'name slug');
  res.json({ product, related, pairs });
});

const pickFields = (body) => {
  const allowed = [
    'name', 'description', 'price', 'compareAtPrice', 'images', 'category', 'subcategory', 'brand', 'tags',
    'specs', 'compatibility', 'optionNames', 'variants', 'stock', 'isFeatured', 'isActive',
  ];
  const out = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (out.tags) out.tags = (Array.isArray(out.tags) ? out.tags : csv(out.tags)).map((t) => String(t).trim()).filter(Boolean).slice(0, 20);
  if (out.compatibility) out.compatibility = (Array.isArray(out.compatibility) ? out.compatibility : csv(out.compatibility)).slice(0, 30);
  if (out.specs) out.specs = (Array.isArray(out.specs) ? out.specs : []).filter((s) => s?.label && s?.value).slice(0, 30);
  if (out.optionNames) out.optionNames = (Array.isArray(out.optionNames) ? out.optionNames : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3);
  if (out.variants) {
    out.variants = (Array.isArray(out.variants) ? out.variants : []).slice(0, 100).map((v) => ({
      ...(v._id && mongoose.isValidObjectId(v._id) ? { _id: v._id } : {}),
      options: Object.fromEntries(Object.entries(v.options || {}).map(([k, val]) => [String(k).trim(), String(val).trim()]).filter(([k, val]) => k && val)),
      sku: v.sku || '',
      price: v.price === '' || v.price === null || v.price === undefined ? undefined : Number(v.price),
      compareAtPrice: v.compareAtPrice === '' || v.compareAtPrice === null || v.compareAtPrice === undefined ? undefined : Number(v.compareAtPrice),
      stock: Math.max(0, parseInt(v.stock, 10) || 0),
      image: v.image || '',
    }));
  }
  return out;
};

async function assertCategory(req, res, categoryIdValue) {
  if (categoryIdValue === undefined) return;
  const ok = mongoose.isValidObjectId(categoryIdValue) && (await Category.exists({ _id: categoryIdValue, store: req.store._id }));
  if (!ok) {
    res.status(400);
    throw new Error('Please choose one of this store’s categories');
  }
}

export const createProduct = asyncHandler(async (req, res) => {
  const limit = planFor(req.store).limits.products;
  if (limit !== null && (await Product.countDocuments({ store: req.store._id })) >= limit) {
    res.status(402);
    throw new Error(`Your ${planFor(req.store).name} plan allows ${limit} products. Upgrade in Billing to add more.`);
  }
  const fields = pickFields(req.body);
  await assertCategory(req, res, fields.category);
  const product = await Product.create({ ...fields, store: req.store._id });
  res.status(201).json(await product.populate('category', 'name slug'));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, store: req.store._id });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  const fields = pickFields(req.body);
  await assertCategory(req, res, fields.category);
  Object.assign(product, fields);
  await product.save();
  res.json(await product.populate('category', 'name slug'));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, store: req.store._id });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  // Orders keep their own copy of name/price/image, so deleting is safe for history.
  await product.deleteOne();
  res.json({ message: 'Product deleted' });
});
