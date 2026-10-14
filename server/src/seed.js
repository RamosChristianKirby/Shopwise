import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Order from './models/Order.js';

// Real product photography (Unsplash CDN) with dynamic SVG placeholder fallback
const PRODUCT_IMAGES = {
  'Wireless Noise-Cancelling Headphones': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
  ],
  'Mechanical Keyboard 75%': [
    'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80',
  ],
  'Portable Power Bank 20,000mAh': [
    'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80',
  ],
  'Smart Fitness Watch': [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
  ],
  'Classic Cotton T-Shirt': [
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
  ],
  'Slim Fit Denim Jeans': [
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80',
  ],
  'Canvas Backpack': [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80',
  ],
  'Leather Slip-On Sneakers': [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80',
  ],
  'Ceramic Dinner Set (16 pcs)': [
    'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
  ],
  'Scented Soy Candle': [
    'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1605651202774-7d573fd3f12d?auto=format&fit=crop&w=800&q=80',
  ],
  'Memory Foam Pillow': [
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
  ],
  'Vitamin C Brightening Serum': [
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80',
  ],
  'Hydrating Face Moisturizer': [
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80',
  ],
  'Non-Slip Yoga Mat': [
    'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=800&q=80',
  ],
  'Adjustable Dumbbell Set': [
    'https://images.unsplash.com/photo-1586401100295-7a8096fd231a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80',
  ],
  'Insulated Water Bottle 750ml': [
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1589365278144-c9e705f843ba?auto=format&fit=crop&w=800&q=80',
  ],
};

const img = (name, v = 0) => `/api/placeholder/${encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}.svg${v ? `?v=${v}` : ''}`;

const CATEGORIES = [
  ['Electronics', 'Gadgets, audio and accessories'],
  ['Fashion', 'Clothing, bags and footwear'],
  ['Home & Living', 'Decor, kitchen and everyday essentials'],
  ['Beauty', 'Skincare and personal care'],
  ['Sports', 'Gear and activewear'],
];

// [name, category, price, compareAt, stock, featured, brand, description]
const PRODUCTS = [
  ['Wireless Noise-Cancelling Headphones', 'Electronics', 4999, 6499, 40, true, 'SoundCore', 'Over-ear Bluetooth headphones with 30-hour battery life and active noise cancellation.'],
  ['Mechanical Keyboard 75%', 'Electronics', 3299, 0, 25, true, 'KeyForge', 'Hot-swappable mechanical keyboard with RGB backlight and USB-C.'],
  ['Portable Power Bank 20,000mAh', 'Electronics', 1299, 1599, 80, false, 'VoltGo', 'Fast-charging power bank with dual USB-A and one USB-C port.'],
  ['Smart Fitness Watch', 'Electronics', 2899, 3499, 30, true, 'FitPulse', 'Heart-rate, sleep tracking and 7-day battery life.'],
  ['Classic Cotton T-Shirt', 'Fashion', 399, 0, 200, false, 'Basic Co.', 'Soft 100% cotton crew-neck tee in a relaxed fit.'],
  ['Slim Fit Denim Jeans', 'Fashion', 1299, 1699, 60, true, 'Indigo', 'Stretch denim with a modern slim cut.'],
  ['Canvas Backpack', 'Fashion', 1099, 0, 45, false, 'Trailmate', 'Water-resistant canvas backpack with a padded 15" laptop sleeve.'],
  ['Leather Slip-On Sneakers', 'Fashion', 1899, 2299, 35, false, 'Stride', 'Comfortable everyday sneakers with cushioned insoles.'],
  ['Ceramic Dinner Set (16 pcs)', 'Home & Living', 2199, 0, 20, false, 'Homely', 'Dishwasher-safe dinner set for four.'],
  ['Scented Soy Candle', 'Home & Living', 349, 0, 120, true, 'Glow', 'Hand-poured soy candle, 40-hour burn time.'],
  ['Memory Foam Pillow', 'Home & Living', 899, 1199, 50, false, 'DreamWell', 'Ergonomic pillow that keeps its shape night after night.'],
  ['Vitamin C Brightening Serum', 'Beauty', 799, 0, 90, true, 'Lumière', '30ml serum with 15% vitamin C for a brighter complexion.'],
  ['Hydrating Face Moisturizer', 'Beauty', 649, 0, 75, false, 'Lumière', 'Lightweight daily moisturizer with hyaluronic acid.'],
  ['Non-Slip Yoga Mat', 'Sports', 899, 1099, 55, false, 'FlexFit', '6mm thick eco-friendly yoga mat with carry strap.'],
  ['Adjustable Dumbbell Set', 'Sports', 3499, 0, 4, true, 'IronPeak', 'Space-saving adjustable dumbbells, 2–20kg.'],
  ['Insulated Water Bottle 750ml', 'Sports', 549, 0, 3, false, 'HydroKeep', 'Keeps drinks cold 24 hours or hot 12 hours.'],
];

// Older versions of this project created these accounts with published passwords.
// If one of them is still in the database with its ORIGINAL password, it is removed
// (an account whose password was changed is left alone).
const LEGACY_DEMO = [
  ['admin@shop.com', 'Admin123!'],
  ...['maria', 'juan', 'angela', 'carlo', 'bea', 'miguel', 'trisha', 'paolo'].map((n) => [`${n}@example.com`, 'Customer123!']),
];

async function removeLegacyDemoAccounts() {
  const found = await User.find({ email: { $in: LEGACY_DEMO.map(([e]) => e) } }).select('+password');
  const ids = [];
  for (const u of found) {
    const demoPassword = LEGACY_DEMO.find(([e]) => e === u.email)[1];
    // eslint-disable-next-line no-await-in-loop
    if (await u.matchPassword(demoPassword)) ids.push(u._id);
  }
  if (!ids.length) return;
  await Promise.all([User.deleteMany({ _id: { $in: ids } }), Order.deleteMany({ user: { $in: ids } })]);
  console.log(`Removed ${ids.length} old demo account${ids.length === 1 ? '' : 's'} that still used the published sample password (and their sample orders).`);
}

// Accounts are never touched here: the store's catalogue (categories, products) and orders are wiped, user accounts stay.
async function destroy() {
  await Promise.all([Category.deleteMany(), Product.deleteMany(), Order.deleteMany()]);
}

async function run() {
  await connectDB();
  await removeLegacyDemoAccounts();

  const force = process.argv.includes('--force');
  if (!force && (await Product.estimatedDocumentCount()) + (await Category.estimatedDocumentCount()) > 0) {
    // --if-empty is used by "npm start": stay quiet when the shop already has data
    if (!process.argv.includes('--if-empty')) {
      console.log('\nThe shop already has products, so nothing was changed.');
      console.log('To wipe the products, categories and orders and load the sample catalogue again, run:  npm run reset\n');
    }
    return;
  }
  await destroy();
  if (process.argv.includes('--destroy')) {
    console.log('Products, categories and orders cleared (user accounts were kept).');
    return;
  }

  const cats = {};
  for (const [name, description] of CATEGORIES) cats[name] = await Category.create({ name, description });

  let count = 0;
  for (const [name, cat, price, compareAtPrice, stock, isFeatured, brand, description] of PRODUCTS) {
    // create() one at a time so the slug hook can check uniqueness
    // eslint-disable-next-line no-await-in-loop
    await Product.create({
      name, price, compareAtPrice, stock, isFeatured, brand, description,
      category: cats[cat]._id,
      images: PRODUCT_IMAGES[name] || [img(name), img(name, 1)],
    });
    count += 1;
  }

  console.log('\nSeed complete.');
  console.log(`  ${CATEGORIES.length} categories and ${count} sample products loaded. No user accounts were created.`);
  console.log('  Register on the website to create an account (always a customer).\n');
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
