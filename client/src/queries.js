// React Query hooks for the storefront. Keys include the store slug so each store's data is cached separately.
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api, { storeSlugs } from './api.js';
import { list } from './utils.js';

const s = () => storeSlugs.shop || 'main';
const clean = (params) => Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false));

export const useCategories = () =>
  useQuery({
    queryKey: [s(), 'categories'],
    queryFn: () => api.get('/categories').then((r) => list(r.data)),
    staleTime: 5 * 60 * 1000,
  });

export const useProducts = (params, options = {}) =>
  useQuery({
    queryKey: [s(), 'products', clean(params)],
    queryFn: () => api.get('/products', { params: clean(params) }).then((r) => ({ ...r.data, items: list(r.data?.items) })),
    placeholderData: keepPreviousData,
    ...options,
  });

/** One level of the cascading filters: 'categories' | 'subcategories' | 'brands' | 'options' | 'price'. */
export const useFacets = (level, params, options = {}) =>
  useQuery({
    queryKey: [s(), 'facets', level, clean(params)],
    queryFn: () => api.get('/products/facets', { params: { ...clean(params), level } }).then((r) => r.data || {}),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    ...options,
  });

export const useProduct = (slug) =>
  useQuery({
    queryKey: [s(), 'product', slug],
    queryFn: () => api.get(`/products/${encodeURIComponent(slug)}`).then((r) => r.data),
    enabled: !!slug,
  });

export const usePaymentConfig = () =>
  useQuery({
    queryKey: [s(), 'payment-config'],
    queryFn: () => api.get('/config/payment').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
