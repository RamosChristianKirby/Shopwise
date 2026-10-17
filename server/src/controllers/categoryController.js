import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/categories — the store's categories with product counts, an image for tiles,
 * and their subcategories (with counts and an image each) for the mega menu.
 */
export const getCategories = asyncHandler(async (req, res) => {
  const store = req.store._id;
  const [cats, counts, subs] = await Promise.all([
    Category.find({ store }).sort({ sortOrder: 1, name: 1 }).lean(),
    Product.aggregate([
      { $match: { store, isActive: true } },
      { $sort: { isFeatured: -1, sold: -1 } },
      { $group: { _id: '$category', count: { $sum: 1 }, image: { $first: { $arrayElemAt: ['$images', 0] } } } },
    ]),
    Product.aggregate([
      { $match: { store, isActive: true, subcategory: { $nin: ['', null] } } },
      { $sort: { sold: -1 } },
      { $group: { _id: { c: '$category', s: '$subcategory' }, count: { $sum: 1 }, image: { $first: { $arrayElemAt: ['$images', 0] } } } },
      { $sort: { '_id.s': 1 } },
    ]),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c]));
  const subMap = new Map();
  subs.forEach((s) => {
    const key = String(s._id.c);
    if (!subMap.has(key)) subMap.set(key, []);
    subMap.get(key).push({ name: s._id.s, count: s.count, image: s.image || '' });
  });
  res.json(
    cats.map((c) => ({
      ...c,
      productCount: countMap.get(String(c._id))?.count || 0,
      image: c.image || countMap.get(String(c._id))?.image || '',
      subcategories: subMap.get(String(c._id)) || [],
    }))
  );
});

const findOwn = async (req, res) => {
  const cat = mongoose.isValidObjectId(req.params.id) ? await Category.findOne({ _id: req.params.id, store: req.store._id }) : null;
  if (!cat) {
    res.status(404);
    throw new Error('Category not found');
  }
  return cat;
};

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;
  res.status(201).json(await Category.create({ store: req.store._id, name, description, image }));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const cat = await findOwn(req, res);
  ['name', 'description', 'image', 'sortOrder'].forEach((k) => { if (req.body[k] !== undefined) cat[k] = req.body[k]; });
  await cat.save();
  res.json(cat);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await findOwn(req, res);
  const inUse = await Product.countDocuments({ store: req.store._id, category: cat._id });
  if (inUse > 0) {
    res.status(400);
    throw new Error(`Cannot delete: ${inUse} product(s) use this category`);
  }
  await cat.deleteOne();
  res.json({ message: 'Category deleted' });
});
