import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage, storeSlugs } from '../api.js';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

// Each store has its own cart (multi-store).
const key = (name) => (storeSlugs.shop ? `${name}:${storeSlugs.shop}` : name);

/** One cart line per product + option combination. */
export const lineKey = (productId, variantId) => (variantId ? `${productId}:${variantId}` : String(productId));

const load = () => {
  try {
    const parsed = JSON.parse(storage.get(key('cart')) || '[]');
    return Array.isArray(parsed) ? parsed.map((i) => ({ ...i, key: i.key || lineKey(i._id, i.variant) })) : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [coupon, setCouponState] = useState(() => storage.get(key('coupon')) || '');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    storage.set(key('cart'), JSON.stringify(items));
  }, [items]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const setCoupon = useCallback((code) => {
    const c = String(code || '').trim().toUpperCase();
    if (c) storage.set(key('coupon'), c);
    else storage.remove(key('coupon'));
    setCouponState(c);
  }, []);

  /**
   * Adds a product (optionally a specific variant: { _id, label, price, stock, image }).
   * Cart lines keep a small snapshot for display only; the server re-reads price and stock at checkout.
   */
  const add = useCallback((product, qty = 1, showDrawer = true, variant = null) => {
    const k = lineKey(product._id, variant?._id);
    const max = (variant ? variant.stock : product.stock) ?? 99;
    const price = variant?.price ?? product.price;
    setItems((prev) => {
      const existing = prev.find((i) => i.key === k);
      if (existing) {
        return prev.map((i) => (i.key === k ? { ...i, stock: max, price, qty: Math.min(i.qty + qty, max) } : i));
      }
      return [
        ...prev,
        {
          key: k,
          _id: product._id,
          variant: variant?._id || null,
          variantLabel: variant?.label || '',
          slug: product.slug,
          name: product.name,
          price,
          image: variant?.image || product.images?.[0],
          stock: max,
          qty: Math.min(qty, max),
          category: product.category?._id || product.category || null,
        },
      ];
    });
    if (showDrawer) setIsDrawerOpen(true);
  }, []);

  const setQty = useCallback((k, qty) => {
    setItems((prev) => prev.map((i) => (i.key === k ? { ...i, qty: Math.max(1, Math.min(qty, i.stock ?? 99)) } : i)));
  }, []);

  const remove = useCallback((k) => setItems((prev) => prev.filter((i) => i.key !== k)), []);
  const clear = useCallback(() => {
    setItems([]);
    setCoupon('');
  }, [setCoupon]);

  const value = useMemo(
    () => ({
      items,
      add,
      setQty,
      remove,
      clear,
      coupon,
      setCoupon,
      count: items.reduce((n, i) => n + i.qty, 0),
      distinctProducts: new Set(items.map((i) => i._id)).size,
      subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
      isDrawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [items, add, setQty, remove, clear, coupon, setCoupon, isDrawerOpen, openDrawer, closeDrawer]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
