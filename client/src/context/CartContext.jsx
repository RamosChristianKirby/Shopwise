import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../api.js';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const load = () => {
  try {
    const parsed = JSON.parse(storage.get('cart') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    storage.set('cart', JSON.stringify(items));
  }, [items]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // Cart lines keep a small snapshot of the product for display only.
  // The server re-reads price and stock from the database when an order is placed.
  const add = useCallback((product, qty = 1, showDrawer = true) => {
    setItems((prev) => {
      const existing = prev.find((i) => i._id === product._id);
      const max = product.stock ?? 99;
      if (existing) {
        return prev.map((i) => (i._id === product._id ? { ...i, stock: max, price: product.price, qty: Math.min(i.qty + qty, max) } : i));
      }
      return [
        ...prev,
        { _id: product._id, slug: product.slug, name: product.name, price: product.price, image: product.images?.[0], stock: max, qty: Math.min(qty, max) },
      ];
    });
    if (showDrawer) setIsDrawerOpen(true);
  }, []);

  const setQty = useCallback((id, qty) => {
    setItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.stock ?? 99)) } : i))
    );
  }, []);

  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i._id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      add,
      setQty,
      remove,
      clear,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
      isDrawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [items, add, setQty, remove, clear, isDrawerOpen, openDrawer, closeDrawer]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
