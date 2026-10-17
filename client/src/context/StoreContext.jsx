import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { storage, storeSlugs } from '../api.js';
import { PLATFORM, STORE } from '../config.js';

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const SLUG_RX = /^[a-z0-9-]{3,40}$/;

/**
 * Which store this website shows (multi-store / SaaS), in priority order:
 *   1. ?store=<slug> in the address (remembered for next time)
 *   2. <slug>.PLATFORM_DOMAIN subdomain
 *   3. STORE_SLUG in config.js
 *   4. the store picked last time ("Visit store" links)
 *   5. the platform's main store
 * Worked out once, before the app renders, so every API call carries the right X-Store header.
 */
function detectSlug() {
  try {
    const q = new URLSearchParams(window.location.search).get('store');
    if (q !== null) {
      const slug = q.toLowerCase();
      if (SLUG_RX.test(slug)) storage.set('storefront', slug);
      else storage.remove('storefront');
      return SLUG_RX.test(slug) ? slug : '';
    }
    const host = window.location.hostname.toLowerCase();
    if (PLATFORM.domain && host.endsWith(`.${PLATFORM.domain}`)) {
      const sub = host.slice(0, -(PLATFORM.domain.length + 1));
      if (SLUG_RX.test(sub) && sub !== 'www') return sub;
    }
    if (PLATFORM.storeSlug) return PLATFORM.storeSlug;
    return storage.get('storefront') || '';
  } catch {
    return '';
  }
}

export const initialSlug = detectSlug();
storeSlugs.shop = initialSlug;

const FALLBACK = {
  name: STORE.name,
  slug: initialSlug,
  isDefault: !initialSlug,
  isActive: true,
  branding: { tagline: STORE.tagline, announcement: STORE.announcement },
  features: { aiChat: false, paypal: false, pdfInvoices: true },
  chatbotName: 'Wise',
  support: { email: '', phone: '' },
  returnsPolicy: '',
  shipping: { fee: 100, freeOver: 2000 },
  coupons: [],
};

/** Visit another store: remembers it and reloads so the cart, wishlist and data belong to that store. */
export function enterStore(slug) {
  if (slug && SLUG_RX.test(slug)) storage.set('storefront', slug);
  else storage.remove('storefront');
  window.location.assign('/');
}

export function StoreProvider({ children }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['store', initialSlug],
    queryFn: () => api.get('/stores/current').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: (count, e) => e?.response?.status !== 404 && count < 2,
  });

  // An unknown remembered store: forget it and fall back to the main store.
  useEffect(() => {
    if (error?.response?.status === 404 && initialSlug && !PLATFORM.storeSlug) {
      storage.remove('storefront');
      window.location.replace('/');
    }
  }, [error]);

  const store = data && typeof data === 'object' && data.name ? { ...FALLBACK, ...data } : FALLBACK;

  // Store branding: its primary colour drives buttons, links and accents.
  useEffect(() => {
    const root = document.documentElement;
    const color = store.branding?.primaryColor;
    if (color && /^#[0-9a-f]{6}$/i.test(color)) {
      root.style.setProperty('--brand', color);
      root.style.setProperty('--primary', color);
      root.style.setProperty('--primary-hover', `color-mix(in srgb, ${color} 85%, #000)`);
    } else {
      ['--brand', '--primary', '--primary-hover'].forEach((v) => root.style.removeProperty(v));
    }
  }, [store.branding?.primaryColor]);

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ['store'] }), [qc]);

  const value = useMemo(
    () => ({ store, slug: initialSlug, loading: isLoading, refresh, enterStore, isMainStore: !initialSlug || store.isDefault }),
    [store, isLoading, refresh]
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
