import Store from './models/Store.js';
import Product from './models/Product.js';
import Category from './models/Category.js';
import Order from './models/Order.js';
import User from './models/User.js';
import { DETAILS, detailFields } from './sampleCatalog.js';

export const DEFAULT_SLUG = 'main';
const SCHEMA_VERSION = 2;

let defaultStore = null;
let defaultAt = 0;

/** The platform's flagship store (created on first use). */
export async function getDefaultStore() {
  if (defaultStore && defaultAt > Date.now() - 15000) return defaultStore;
  let store = await Store.findOne({ isDefault: true });
  if (!store) {
    const owner = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).select('_id');
    store = await Store.findOneAndUpdate(
      { slug: DEFAULT_SLUG },
      {
        $setOnInsert: {
          name: process.env.STORE_NAME || 'Shopwise',
          slug: DEFAULT_SLUG,
          isDefault: true,
          plan: 'business',
          owner: owner?._id,
          'billing.status': 'active',
          coupons: [
            { code: 'WELCOME10', percent: 10, minSubtotal: 0, description: '10% off your first order' },
            { code: 'BUNDLE15', percent: 15, minItems: 3, description: '15% off when you bundle 3 or more products' },
          ],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  defaultStore = store;
  defaultAt = Date.now();
  return store;
}

export function forgetDefaultStore() {
  defaultStore = null;
}

/**
 * One-time upgrade of a single-store database to the multi-store layout:
 * everything that has no store yet belongs to the default store, and the old
 * global unique indexes (product slug, category name/slug) are replaced by per-store ones.
 */
export async function ensurePlatform() {
  const store = await getDefaultStore();
  if ((store.schemaVersion || 0) >= SCHEMA_VERSION) return store;

  const noStore = { $or: [{ store: { $exists: false } }, { store: null }] };
  const [p, c, o] = await Promise.all([
    Product.updateMany(noStore, { $set: { store: store._id } }),
    Category.updateMany(noStore, { $set: { store: store._id } }),
    Order.updateMany(noStore, { $set: { store: store._id } }),
  ]);
  try {
    await Promise.all([Product.syncIndexes(), Category.syncIndexes(), Store.syncIndexes(), Order.syncIndexes()]);
  } catch (err) {
    console.warn(`Index update skipped: ${err.message}`);
  }
  // Give the sample products that are still in the default store their new details
  // (subcategory, specs, options) so the mega menu and filters work without a reset.
  const samples = await Product.find({ store: store._id, name: { $in: Object.keys(DETAILS) }, subcategory: { $in: ['', null] }, 'variants.0': { $exists: false } });
  for (const product of samples) {
    Object.assign(product, detailFields(product.name, product.stock));
    // eslint-disable-next-line no-await-in-loop
    await product.save().catch((err) => console.warn(`Could not update ${product.name}: ${err.message}`));
  }
  await Store.updateOne({ _id: store._id }, { $set: { schemaVersion: SCHEMA_VERSION } });
  forgetDefaultStore();
  const moved = p.modifiedCount + c.modifiedCount + o.modifiedCount;
  if (moved) console.log(`Multi-store upgrade: moved ${p.modifiedCount} products, ${c.modifiedCount} categories and ${o.modifiedCount} orders into the "${store.name}" store.`);
  return getDefaultStore();
}
