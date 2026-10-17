import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import { ensurePlatform } from './platform.js';

export const NEW_PRODUCTS = [
  // Electronics
  ['True Wireless Earbuds with ANC', 'Electronics', 2499, 3199, 45, true, 'SoundCore', 'Compact earbuds with rich bass, active noise cancellation, and 28-hour playtime with charging case.'],
  ['Ultra-Slim 4K Monitor 27"', 'Electronics', 12499, 14999, 15, true, 'PixelView', 'Frameless 4K IPS display with HDR400, USB-C 65W charging, and 99% sRGB color gamut.'],
  ['Ergonomic Wireless Mouse', 'Electronics', 1599, 1999, 60, false, 'KeyForge', 'Natural handshake position mouse with silent switches, adjustable DPI, and multi-device Bluetooth.'],
  ['Bluetooth Portable Speaker', 'Electronics', 1899, 0, 35, false, 'SoundCore', 'Waterproof IPX7 outdoor speaker with 360-degree sound and 16-hour battery life.'],

  // Fashion
  ['Waterproof Windbreaker Jacket', 'Fashion', 1999, 2499, 40, true, 'Trailmate', 'Lightweight packable hooded jacket with breathable mesh lining and storm flap.'],
  ['Polarized Classic Sunglasses', 'Fashion', 899, 1199, 85, false, 'Solara', 'UV400 protection polarized lenses with durable acetate frame in timeless matte black.'],
  ['Minimalist Leather Wallet', 'Fashion', 699, 0, 70, false, 'Stride', 'Slim bifold wallet made from genuine top-grain leather with RFID blocking protection.'],
  ['Casual Linen Button-Down Shirt', 'Fashion', 1199, 1499, 50, false, 'Basic Co.', 'Breathable pure linen long-sleeve shirt crafted for warm days and effortless style.'],

  // Home & Living
  ['Pour-Over Coffee Maker Set', 'Home & Living', 1499, 1899, 25, true, 'Homely', 'Heat-resistant borosilicate glass carafe with permanent stainless steel dual-mesh filter.'],
  ['Minimalist Desk Lamp with Wireless Charger', 'Home & Living', 1299, 1699, 30, false, 'Lumina', 'LED desk light with 3 color temperatures, smooth dimmer, and 10W fast wireless phone charging pad.'],
  ['Stainless Steel Chef Knife 8"', 'Home & Living', 1799, 2299, 20, false, 'Homely', 'Precision-forged high-carbon German steel kitchen knife with ergonomic Pakkawood handle.'],
  ['Soft Woven Throw Blanket', 'Home & Living', 999, 0, 40, false, 'DreamWell', 'Ultra-soft herringbone knit throw blanket with fringe tassels, measuring 130x160cm.'],

  // Beauty
  ['Mineral Sunscreen SPF 50+', 'Beauty', 749, 949, 65, true, 'Lumière', 'Broad-spectrum non-greasy zinc oxide sunscreen, reef-safe with invisible matte finish.'],
  ['Nourishing Lip Care Balm Duo', 'Beauty', 349, 0, 110, false, 'Lumière', 'Deeply moisturizing botanical lip balm enriched with organic shea butter and vitamin E.'],
  ['Exfoliating Coffee Body Scrub', 'Beauty', 599, 799, 45, false, 'Glow', 'Natural Arabica coffee and sweet almond oil scrub to smooth and revitalize dry skin.'],

  // Sports
  ['Resistance Bands Set (5 Levels)', 'Sports', 499, 699, 95, false, 'FlexFit', 'Set of 5 natural latex loop exercise bands with door anchor, carry pouch, and workout guide.'],
  ['Speed Jump Rope with Ball Bearings', 'Sports', 399, 0, 80, false, 'IronPeak', 'Adjustable steel wire jump rope with 360-degree aluminum alloy bearings for cardio conditioning.'],
  ['Hydration Running Belt', 'Sports', 699, 899, 50, false, 'Trailmate', 'Bounce-free water-resistant waist pack with phone pocket, key clip, and reflective safety strips.'],
];

export const NEW_PRODUCT_IMAGES = {
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

async function run() {
  await connectDB();
  const store = await ensurePlatform(); // products are added to the platform's default store

  // Find all categories
  const categories = await Category.find({ store: store._id });
  const catMap = {};
  for (const c of categories) catMap[c.name] = c._id;

  let added = 0;
  let updated = 0;

  for (const [name, catName, price, compareAtPrice, stock, isFeatured, brand, description] of NEW_PRODUCTS) {
    const categoryId = catMap[catName];
    if (!categoryId) {
      console.warn(`Category "${catName}" not found. Skipping "${name}".`);
      continue;
    }

    const images = NEW_PRODUCT_IMAGES[name] || [];
    const existing = await Product.findOne({ store: store._id, name });

    if (!existing) {
      await Product.create({
        store: store._id,
        name,
        price,
        compareAtPrice,
        stock,
        isFeatured,
        brand,
        description,
        category: categoryId,
        images,
      });
      added += 1;
      console.log(`+ Created product: ${name}`);
    } else {
      existing.price = price;
      existing.compareAtPrice = compareAtPrice;
      existing.stock = stock;
      existing.isFeatured = isFeatured;
      existing.brand = brand;
      existing.description = description;
      existing.category = categoryId;
      existing.images = images;
      await existing.save();
      updated += 1;
      console.log(`* Updated product: ${name}`);
    }
  }

  const total = await Product.countDocuments({ store: store._id });
  console.log(`\nDone! Added ${added} new products, updated ${updated}. Store now has ${total} total products.`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
