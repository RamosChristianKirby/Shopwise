import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import { ensurePlatform } from './platform.js';
import { detailFields } from './sampleCatalog.js';

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
  'True Wireless Earbuds with ANC': [
    'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=800&q=80',
  ],
  'Ultra-Slim 4K Monitor 27"': [
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?auto=format&fit=crop&w=800&q=80',
  ],
  'Ergonomic Wireless Mouse': [
    'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1629429408209-1f912961dbd8?auto=format&fit=crop&w=800&q=80',
  ],
  'Bluetooth Portable Speaker': [
    'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
  ],
  'Waterproof Windbreaker Jacket': [
    'https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80',
  ],
  'Polarized Classic Sunglasses': [
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
  ],
  'Minimalist Leather Wallet': [
    'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=800&q=80',
  ],
  'Casual Linen Button-Down Shirt': [
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
  ],
  'Pour-Over Coffee Maker Set': [
    'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
  ],
  'Minimalist Desk Lamp with Wireless Charger': [
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
  ],
  'Stainless Steel Chef Knife 8"': [
    'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1589792923962-537704632910?auto=format&fit=crop&w=800&q=80',
  ],
  'Soft Woven Throw Blanket': [
    'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  ],
  'Mineral Sunscreen SPF 50+': [
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  ],
  'Nourishing Lip Care Balm Duo': [
    'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80',
  ],
  'Exfoliating Coffee Body Scrub': [
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1519735777090-ec97162dc266?auto=format&fit=crop&w=800&q=80',
  ],
  'Resistance Bands Set (5 Levels)': [
    'https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
  ],
  'Speed Jump Rope with Ball Bearings': [
    'https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
  ],
  'Hydration Running Belt': [
    'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
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
  ['True Wireless Earbuds with ANC', 'Electronics', 2499, 3199, 45, true, 'SoundCore', 'Compact earbuds with rich bass, active noise cancellation, and 28-hour playtime with charging case.'],
  ['Ultra-Slim 4K Monitor 27"', 'Electronics', 12499, 14999, 15, true, 'PixelView', 'Frameless 4K IPS display with HDR400, USB-C 65W charging, and 99% sRGB color gamut.'],
  ['Ergonomic Wireless Mouse', 'Electronics', 1599, 1999, 60, false, 'KeyForge', 'Natural handshake position mouse with silent switches, adjustable DPI, and multi-device Bluetooth.'],
  ['Bluetooth Portable Speaker', 'Electronics', 1899, 0, 35, false, 'SoundCore', 'Waterproof IPX7 outdoor speaker with 360-degree sound and 16-hour battery life.'],

  ['Classic Cotton T-Shirt', 'Fashion', 399, 0, 200, false, 'Basic Co.', 'Soft 100% cotton crew-neck tee in a relaxed fit.'],
  ['Slim Fit Denim Jeans', 'Fashion', 1299, 1699, 60, true, 'Indigo', 'Stretch denim with a modern slim cut.'],
  ['Canvas Backpack', 'Fashion', 1099, 0, 45, false, 'Trailmate', 'Water-resistant canvas backpack with a padded 15" laptop sleeve.'],
  ['Leather Slip-On Sneakers', 'Fashion', 1899, 2299, 35, false, 'Stride', 'Comfortable everyday sneakers with cushioned insoles.'],
  ['Waterproof Windbreaker Jacket', 'Fashion', 1999, 2499, 40, true, 'Trailmate', 'Lightweight packable hooded jacket with breathable mesh lining and storm flap.'],
  ['Polarized Classic Sunglasses', 'Fashion', 899, 1199, 85, false, 'Solara', 'UV400 protection polarized lenses with durable acetate frame in timeless matte black.'],
  ['Minimalist Leather Wallet', 'Fashion', 699, 0, 70, false, 'Stride', 'Slim bifold wallet made from genuine top-grain leather with RFID blocking protection.'],
  ['Casual Linen Button-Down Shirt', 'Fashion', 1199, 1499, 50, false, 'Basic Co.', 'Breathable pure linen long-sleeve shirt crafted for warm days and effortless style.'],

  ['Ceramic Dinner Set (16 pcs)', 'Home & Living', 2199, 0, 20, false, 'Homely', 'Dishwasher-safe dinner set for four.'],
  ['Scented Soy Candle', 'Home & Living', 349, 0, 120, true, 'Glow', 'Hand-poured soy candle, 40-hour burn time.'],
  ['Memory Foam Pillow', 'Home & Living', 899, 1199, 50, false, 'DreamWell', 'Ergonomic pillow that keeps its shape night after night.'],
  ['Pour-Over Coffee Maker Set', 'Home & Living', 1499, 1899, 25, true, 'Homely', 'Heat-resistant borosilicate glass carafe with permanent stainless steel dual-mesh filter.'],
  ['Minimalist Desk Lamp with Wireless Charger', 'Home & Living', 1299, 1699, 30, false, 'Lumina', 'LED desk light with 3 color temperatures, smooth dimmer, and 10W fast wireless phone charging pad.'],
  ['Stainless Steel Chef Knife 8"', 'Home & Living', 1799, 2299, 20, false, 'Homely', 'Precision-forged high-carbon German steel kitchen knife with ergonomic Pakkawood handle.'],
  ['Soft Woven Throw Blanket', 'Home & Living', 999, 0, 40, false, 'DreamWell', 'Ultra-soft herringbone knit throw blanket with fringe tassels, measuring 130x160cm.'],

  ['Vitamin C Brightening Serum', 'Beauty', 799, 0, 90, true, 'Lumière', '30ml serum with 15% vitamin C for a brighter complexion.'],
  ['Hydrating Face Moisturizer', 'Beauty', 649, 0, 75, false, 'Lumière', 'Lightweight daily moisturizer with hyaluronic acid.'],
  ['Mineral Sunscreen SPF 50+', 'Beauty', 749, 949, 65, true, 'Lumière', 'Broad-spectrum non-greasy zinc oxide sunscreen, reef-safe with invisible matte finish.'],
  ['Nourishing Lip Care Balm Duo', 'Beauty', 349, 0, 110, false, 'Lumière', 'Deeply moisturizing botanical lip balm enriched with organic shea butter and vitamin E.'],
  ['Exfoliating Coffee Body Scrub', 'Beauty', 599, 799, 45, false, 'Glow', 'Natural Arabica coffee and sweet almond oil scrub to smooth and revitalize dry skin.'],

  ['Non-Slip Yoga Mat', 'Sports', 899, 1099, 55, false, 'FlexFit', '6mm thick eco-friendly yoga mat with carry strap.'],
  ['Adjustable Dumbbell Set', 'Sports', 3499, 0, 4, true, 'IronPeak', 'Space-saving adjustable dumbbells, 2–20kg.'],
  ['Insulated Water Bottle 750ml', 'Sports', 549, 0, 3, false, 'HydroKeep', 'Keeps drinks cold 24 hours or hot 12 hours.'],
  ['Resistance Bands Set (5 Levels)', 'Sports', 499, 699, 95, false, 'FlexFit', 'Set of 5 natural latex loop exercise bands with door anchor, carry pouch, and workout guide.'],
  ['Speed Jump Rope with Ball Bearings', 'Sports', 399, 0, 80, false, 'IronPeak', 'Adjustable steel wire jump rope with 360-degree aluminum alloy bearings for cardio conditioning.'],
  ['Hydration Running Belt', 'Sports', 699, 899, 50, false, 'Trailmate', 'Bounce-free water-resistant waist pack with phone pocket, key clip, and reflective safety strips.'],
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

// Accounts and other merchants' stores are never touched here: only the default store's
// catalogue (categories, products) and orders are wiped.
async function destroy(store) {
  const mine = { store: store._id };
  await Promise.all([Category.deleteMany(mine), Product.deleteMany(mine), Order.deleteMany(mine)]);
}

async function run() {
  await connectDB();
  const store = await ensurePlatform();
  await removeLegacyDemoAccounts();

  const force = process.argv.includes('--force');
  if (!force && (await Product.countDocuments({ store: store._id })) + (await Category.countDocuments({ store: store._id })) > 0) {
    // --if-empty is used by "npm start": stay quiet when the shop already has data
    if (!process.argv.includes('--if-empty')) {
      console.log('\nThe shop already has products, so nothing was changed.');
      console.log('To wipe the products, categories and orders and load the sample catalogue again, run:  npm run reset\n');
    }
    return;
  }
  await destroy(store);
  if (process.argv.includes('--destroy')) {
    console.log('Products, categories and orders cleared (user accounts were kept).');
    return;
  }

  const cats = {};
  let order = 0;
  for (const [name, description] of CATEGORIES) {
    order += 1;
    cats[name] = await Category.create({ store: store._id, name, description, sortOrder: order });
  }

  let count = 0;
  for (const [name, cat, price, compareAtPrice, stock, isFeatured, brand, description] of PRODUCTS) {
    // create() one at a time so the slug hook can check uniqueness
    // eslint-disable-next-line no-await-in-loop
    await Product.create({
      store: store._id,
      name, price, compareAtPrice, stock, isFeatured, brand, description,
      category: cats[cat]._id,
      images: PRODUCT_IMAGES[name] || [img(name), img(name, 1)],
      ...detailFields(name, stock),
    });
    count += 1;
  }

  console.log(`\nSeed complete (store: ${store.name}).`);
  console.log(`  ${CATEGORIES.length} categories and ${count} sample products loaded. No user accounts were created.`);
  console.log('  Register on the website to create an account (always a customer).\n');
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
