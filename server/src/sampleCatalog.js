// Extra detail for the sample catalogue: subcategories (mega menu + cascading filters),
// tags, specs, compatibility (compatibility checker) and options/variants.
// Ratings are sample values for the demo store.

const sizes = ['S', 'M', 'L', 'XL'];
const v = (optionNames, lists) => ({ optionNames, combos: lists.reduce((acc, list, i) => acc.flatMap((c) => list.map((x) => ({ ...c, [optionNames[i]]: x }))), [{}]) });

export const DETAILS = {
  'Wireless Noise-Cancelling Headphones': {
    subcategory: 'Headphones & Earbuds', tags: ['audio', 'bluetooth', 'anc', 'travel'], rating: 4.8, numReviews: 214,
    compatibility: ['iPhone', 'Android', 'Windows PC', 'Mac', 'iPad', 'Nintendo Switch'],
    specs: [['Battery', '30 hours (ANC on)'], ['Connection', 'Bluetooth 5.3 + 3.5mm'], ['Charging', 'USB-C, 10 min = 5 h'], ['Weight', '250 g']],
    ...v(['Color'], [['Midnight Black', 'Silver']]),
  },
  'True Wireless Earbuds with ANC': {
    subcategory: 'Headphones & Earbuds', tags: ['audio', 'bluetooth', 'anc', 'gym'], rating: 4.6, numReviews: 168,
    compatibility: ['iPhone', 'Android', 'Windows PC', 'Mac', 'iPad'],
    specs: [['Battery', '7 h + 21 h case'], ['Water resistance', 'IPX5'], ['Connection', 'Bluetooth 5.3'], ['Charging', 'USB-C & wireless']],
    ...v(['Color'], [['Black', 'White']]),
  },
  'Bluetooth Portable Speaker': {
    subcategory: 'Speakers', tags: ['audio', 'bluetooth', 'outdoor', 'waterproof'], rating: 4.5, numReviews: 97,
    compatibility: ['iPhone', 'Android', 'Windows PC', 'Mac', 'iPad'],
    specs: [['Battery', '16 hours'], ['Water resistance', 'IPX7'], ['Output', '20 W, 360° sound']],
  },
  'Mechanical Keyboard 75%': {
    subcategory: 'Computer Accessories', tags: ['keyboard', 'gaming', 'rgb', 'work from home'], rating: 4.7, numReviews: 132,
    compatibility: ['Windows PC', 'Mac', 'iPad', 'Linux'],
    specs: [['Layout', '75% (84 keys)'], ['Switches', 'Hot-swappable'], ['Connection', 'USB-C wired + Bluetooth'], ['Backlight', 'Per-key RGB']],
    ...v(['Switch'], [['Red (linear)', 'Brown (tactile)', 'Blue (clicky)']]),
  },
  'Ergonomic Wireless Mouse': {
    subcategory: 'Computer Accessories', tags: ['mouse', 'ergonomic', 'work from home'], rating: 4.6, numReviews: 88,
    compatibility: ['Windows PC', 'Mac', 'iPad', 'Linux'],
    specs: [['DPI', '800–4000 adjustable'], ['Connection', 'Bluetooth + 2.4 GHz'], ['Battery', 'Up to 70 days']],
  },
  'Ultra-Slim 4K Monitor 27"': {
    subcategory: 'Computer Accessories', tags: ['monitor', '4k', 'usb-c', 'work from home'], rating: 4.8, numReviews: 64,
    compatibility: ['Windows PC', 'Mac', 'USB-C laptops', 'PlayStation 5', 'Xbox Series X|S'],
    specs: [['Resolution', '3840 × 2160'], ['Panel', 'IPS, HDR400, 99% sRGB'], ['Ports', 'USB-C 65 W, 2× HDMI, DP'], ['Refresh rate', '60 Hz']],
  },
  'Smart Fitness Watch': {
    subcategory: 'Wearables', tags: ['fitness', 'watch', 'health', 'running'], rating: 4.5, numReviews: 151,
    compatibility: ['iPhone', 'Android'],
    specs: [['Battery', '7 days'], ['Sensors', 'Heart rate, SpO2, sleep'], ['Water resistance', '5 ATM']],
    ...v(['Band'], [['Black', 'Navy', 'Rose']]),
  },
  'Portable Power Bank 20,000mAh': {
    subcategory: 'Power & Charging', tags: ['charging', 'travel', 'usb-c'], rating: 4.7, numReviews: 203,
    compatibility: ['iPhone', 'Android', 'iPad', 'Nintendo Switch', 'USB-C laptops'],
    specs: [['Capacity', '20,000 mAh'], ['Output', '22.5 W fast charge'], ['Ports', '2× USB-A, 1× USB-C']],
  },

  'Classic Cotton T-Shirt': {
    subcategory: 'Tops', tags: ['basics', 'cotton', 'unisex'], rating: 4.6, numReviews: 240,
    specs: [['Material', '100% combed cotton'], ['Fit', 'Relaxed'], ['Care', 'Machine wash cold']],
    ...v(['Color', 'Size'], [['White', 'Black', 'Heather Gray'], sizes]),
  },
  'Casual Linen Button-Down Shirt': {
    subcategory: 'Tops', tags: ['linen', 'summer', 'office'], rating: 4.4, numReviews: 58,
    specs: [['Material', '100% linen'], ['Fit', 'Regular']],
    ...v(['Color', 'Size'], [['White', 'Sand', 'Sky Blue'], sizes]),
  },
  'Slim Fit Denim Jeans': {
    subcategory: 'Bottoms', tags: ['denim', 'jeans', 'stretch'], rating: 4.5, numReviews: 122,
    specs: [['Material', '98% cotton, 2% elastane'], ['Fit', 'Slim'], ['Rise', 'Mid']],
    ...v(['Wash', 'Waist'], [['Dark Indigo', 'Light Wash'], ['28', '30', '32', '34', '36']]),
  },
  'Waterproof Windbreaker Jacket': {
    subcategory: 'Outerwear', tags: ['rain', 'travel', 'packable', 'outdoor'], rating: 4.7, numReviews: 76,
    specs: [['Shell', 'Waterproof nylon, 10k mm'], ['Weight', '280 g'], ['Packable', 'Into its own pocket']],
    ...v(['Color', 'Size'], [['Navy', 'Olive', 'Black'], sizes]),
  },
  'Leather Slip-On Sneakers': {
    subcategory: 'Footwear', tags: ['shoes', 'leather', 'casual'], rating: 4.4, numReviews: 91,
    specs: [['Upper', 'Genuine leather'], ['Sole', 'Rubber, cushioned insole']],
    ...v(['Color', 'Size'], [['White', 'Black'], ['US 7', 'US 8', 'US 9', 'US 10', 'US 11']]),
  },
  'Canvas Backpack': {
    subcategory: 'Bags & Accessories', tags: ['bag', 'laptop', 'school', 'travel'], rating: 4.6, numReviews: 110,
    specs: [['Capacity', '22 L'], ['Laptop sleeve', 'Fits up to 15"'], ['Material', 'Water-resistant waxed canvas']],
  },
  'Polarized Classic Sunglasses': {
    subcategory: 'Bags & Accessories', tags: ['sunglasses', 'summer', 'uv400'], rating: 4.5, numReviews: 69,
    specs: [['Lens', 'Polarized, UV400'], ['Frame', 'Acetate']],
  },
  'Minimalist Leather Wallet': {
    subcategory: 'Bags & Accessories', tags: ['wallet', 'leather', 'rfid', 'gift'], rating: 4.7, numReviews: 85,
    specs: [['Material', 'Top-grain leather'], ['Cards', 'Holds 8 cards'], ['RFID blocking', 'Yes']],
  },

  'Ceramic Dinner Set (16 pcs)': {
    subcategory: 'Kitchen & Dining', tags: ['kitchen', 'dinnerware', 'family'], rating: 4.6, numReviews: 47,
    specs: [['Pieces', '4 each: dinner plate, side plate, bowl, mug'], ['Care', 'Dishwasher & microwave safe']],
  },
  'Pour-Over Coffee Maker Set': {
    subcategory: 'Kitchen & Dining', tags: ['coffee', 'kitchen', 'gift'], rating: 4.8, numReviews: 73,
    specs: [['Capacity', '800 ml'], ['Filter', 'Stainless steel, reusable'], ['Glass', 'Borosilicate']],
  },
  'Stainless Steel Chef Knife 8"': {
    subcategory: 'Kitchen & Dining', tags: ['knife', 'kitchen', 'cooking'], rating: 4.8, numReviews: 52,
    specs: [['Blade', '8" high-carbon German steel'], ['Handle', 'Pakkawood']],
  },
  'Memory Foam Pillow': {
    subcategory: 'Bedroom', tags: ['sleep', 'pillow', 'comfort'], rating: 4.5, numReviews: 134,
    specs: [['Fill', 'Memory foam'], ['Cover', 'Removable, washable']],
  },
  'Soft Woven Throw Blanket': {
    subcategory: 'Bedroom', tags: ['blanket', 'cozy', 'gift'], rating: 4.7, numReviews: 61,
    specs: [['Size', '130 × 160 cm'], ['Material', 'Cotton blend knit']],
  },
  'Scented Soy Candle': {
    subcategory: 'Decor & Lighting', tags: ['candle', 'gift', 'relax'], rating: 4.9, numReviews: 188,
    specs: [['Burn time', '40 hours'], ['Wax', '100% soy']],
    ...v(['Scent'], [['Lavender', 'Vanilla', 'Sea Salt']]),
  },
  'Minimalist Desk Lamp with Wireless Charger': {
    subcategory: 'Decor & Lighting', tags: ['lamp', 'desk', 'wireless charging', 'work from home'], rating: 4.6, numReviews: 44,
    compatibility: ['iPhone', 'Android'],
    specs: [['Light', '3 colour temperatures, dimmable'], ['Charger', '10 W Qi wireless']],
  },

  'Vitamin C Brightening Serum': {
    subcategory: 'Skincare', tags: ['serum', 'vitamin c', 'glow'], rating: 4.7, numReviews: 176,
    specs: [['Size', '30 ml'], ['Key ingredient', '15% vitamin C'], ['Skin type', 'All']],
  },
  'Hydrating Face Moisturizer': {
    subcategory: 'Skincare', tags: ['moisturizer', 'hyaluronic acid', 'daily'], rating: 4.6, numReviews: 102,
    specs: [['Size', '50 ml'], ['Key ingredient', 'Hyaluronic acid']],
  },
  'Mineral Sunscreen SPF 50+': {
    subcategory: 'Skincare', tags: ['sunscreen', 'spf', 'reef safe'], rating: 4.8, numReviews: 143,
    specs: [['Protection', 'SPF 50+ PA++++'], ['Filter', 'Zinc oxide'], ['Finish', 'Matte']],
  },
  'Nourishing Lip Care Balm Duo': {
    subcategory: 'Body & Lip Care', tags: ['lip balm', 'shea', 'gift'], rating: 4.5, numReviews: 66,
    specs: [['Pack', '2 × 4.5 g'], ['Key ingredients', 'Shea butter, vitamin E']],
  },
  'Exfoliating Coffee Body Scrub': {
    subcategory: 'Body & Lip Care', tags: ['scrub', 'body', 'coffee'], rating: 4.6, numReviews: 58,
    specs: [['Size', '200 g'], ['Key ingredients', 'Arabica coffee, almond oil']],
  },

  'Non-Slip Yoga Mat': {
    subcategory: 'Yoga & Recovery', tags: ['yoga', 'pilates', 'home workout'], rating: 4.7, numReviews: 119,
    specs: [['Thickness', '6 mm'], ['Material', 'TPE, eco-friendly'], ['Size', '183 × 61 cm']],
    ...v(['Color'], [['Plum', 'Teal', 'Charcoal']]),
  },
  'Resistance Bands Set (5 Levels)': {
    subcategory: 'Yoga & Recovery', tags: ['bands', 'home workout', 'travel'], rating: 4.5, numReviews: 95,
    specs: [['Levels', '5 (X-light to X-heavy)'], ['Material', 'Natural latex']],
  },
  'Adjustable Dumbbell Set': {
    subcategory: 'Strength Training', tags: ['weights', 'home gym', 'strength'], rating: 4.8, numReviews: 71,
    specs: [['Range', '2–20 kg per dumbbell'], ['Adjust', 'Dial selector']],
  },
  'Speed Jump Rope with Ball Bearings': {
    subcategory: 'Strength Training', tags: ['cardio', 'jump rope', 'boxing'], rating: 4.4, numReviews: 49,
    specs: [['Cable', 'Adjustable steel wire, 3 m'], ['Handles', 'Aluminium, ball bearings']],
  },
  'Insulated Water Bottle 750ml': {
    subcategory: 'Running & Hydration', tags: ['bottle', 'hydration', 'gym'], rating: 4.8, numReviews: 156,
    specs: [['Capacity', '750 ml'], ['Keeps cold', '24 hours'], ['Keeps hot', '12 hours']],
    ...v(['Color'], [['Matte Black', 'Ocean Blue', 'Sage']]),
  },
  'Hydration Running Belt': {
    subcategory: 'Running & Hydration', tags: ['running', 'belt', 'reflective'], rating: 4.5, numReviews: 38,
    specs: [['Fits waist', '66–112 cm'], ['Pockets', 'Phone pocket + key clip']],
  },
};

/** Turns the detail entry into Product fields, spreading `stock` across the variants. */
export function detailFields(name, stock) {
  const d = DETAILS[name];
  if (!d) return {};
  const out = {
    subcategory: d.subcategory,
    tags: d.tags || [],
    specs: (d.specs || []).map(([label, value]) => ({ label, value })),
    compatibility: d.compatibility || [],
    rating: d.rating || 0,
    numReviews: d.numReviews || 0,
  };
  if (d.combos?.length) {
    const each = Math.floor(stock / d.combos.length);
    let extra = stock - each * d.combos.length;
    out.optionNames = d.optionNames;
    out.variants = d.combos.map((options, i) => {
      const s = each + (extra > 0 ? 1 : 0);
      extra -= 1;
      const sku = `${name.replace(/[^A-Za-z0-9]+/g, '').slice(0, 6).toUpperCase()}-${Object.values(options).map((o) => String(o).replace(/[^A-Za-z0-9]+/g, '').slice(0, 3).toUpperCase()).join('-')}`;
      return { options, stock: s, sku: `${sku}-${i + 1}` };
    });
  }
  return out;
}
