import Store from '../models/Store.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getDefaultStore } from '../platform.js';

// Small in-memory cache so every request doesn't hit the database for the store lookup.
const cache = new Map();
const TTL = 15 * 1000;

export function invalidateStoreCache() {
  cache.clear();
}

async function findBy(key, query) {
  const hit = cache.get(key);
  if (hit && hit.at > Date.now() - TTL) return hit.store;
  const store = await Store.findOne(query);
  cache.set(key, { store, at: Date.now() });
  return store;
}

const SLUG_RX = /^[a-z0-9-]{3,40}$/;

/**
 * Works out which store a request is for and puts it on req.store:
 *   1. X-Store header (the website sends the slug it is showing or managing)
 *   2. ?store= query (handy for links and testing)
 *   3. Custom domain, or <slug>.PLATFORM_DOMAIN subdomain, from the Host header
 *   4. Otherwise the platform's default store (keeps single-store setups working).
 */
export const resolveStore = asyncHandler(async (req, res, next) => {
  const fromHeader = String(req.headers['x-store'] || '').toLowerCase().trim();
  const fromQuery = String(req.query.store || '').toLowerCase().trim();
  const slug = SLUG_RX.test(fromHeader) ? fromHeader : SLUG_RX.test(fromQuery) ? fromQuery : '';

  let store = null;
  if (slug) store = await findBy(`slug:${slug}`, { slug });

  if (!store) {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
    const platformDomain = (process.env.PLATFORM_DOMAIN || '').toLowerCase();
    if (host && platformDomain && host.endsWith(`.${platformDomain}`)) {
      const sub = host.slice(0, -(platformDomain.length + 1));
      if (SLUG_RX.test(sub) && sub !== 'www') store = await findBy(`slug:${sub}`, { slug: sub });
    } else if (host && !/^(localhost|127\.|\[::1\])/.test(host)) {
      store = await findBy(`domain:${host}`, { customDomain: host });
    }
  }

  if (slug && !store) {
    res.status(404);
    throw new Error(`Store "${slug}" was not found`);
  }

  req.store = store || (await getDefaultStore());
  next();
});

/** Storefront routes: a suspended store is closed to shoppers (its admins can still log in to fix things). */
export const storeOpen = (req, res, next) => {
  if (req.store?.isActive !== false) return next();
  res.status(403);
  next(new Error('This store is temporarily unavailable'));
};

/** Admin routes: the logged-in user must own or staff the current store (platform admins can manage all). */
export const storeAdmin = (req, res, next) => {
  if (req.store && req.store.isManagedBy(req.user)) return next();
  res.status(403);
  next(new Error('You do not manage this store'));
};

export const storeOwner = (req, res, next) => {
  if (req.store && req.store.isOwnedBy(req.user)) return next();
  res.status(403);
  next(new Error('Only the store owner can do that'));
};

/** Platform console: Shopwise operators only (users whose role is "admin"). */
export const platformAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  res.status(403);
  next(new Error('Platform admin access required'));
};

/** For web pages: like resolveStore, but an unknown store just shows the default store instead of an error. */
export const resolveStoreSoft = (req, res, next) => {
  resolveStore(req, res, (err) => {
    if (!err) return next();
    res.status(200);
    getDefaultStore().then((s) => { req.store = s; next(); }).catch(next);
  });
};
