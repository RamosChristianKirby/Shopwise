import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage, storeSlugs } from '../api.js';

// Each store has its own wishlist (multi-store).
const KEY = () => (storeSlugs.shop ? `wishlist:${storeSlugs.shop}` : 'wishlist');

const WishlistContext = createContext(null);
export const useWishlist = () => useContext(WishlistContext);

const load = () => {
  try {
    const parsed = JSON.parse(storage.get(KEY()) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(load);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    storage.set(KEY(), JSON.stringify(items));
  }, [items]);

  const isWishlisted = useCallback((id) => items.some((i) => i._id === id), [items]);

  const toggleWishlist = useCallback((product) => {
    setItems((prev) => {
      const exists = prev.some((i) => i._id === product._id);
      if (exists) {
        return prev.filter((i) => i._id !== product._id);
      }
      return [
        ...prev,
        {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          images: product.images,
          stock: product.stock,
          brand: product.brand,
          category: product.category,
          hasOptions: (product.variants || []).length > 0 || !!product.hasOptions,
        },
      ];
    });
  }, []);

  const removeFromWishlist = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i._id !== id));
  }, []);

  const clearWishlist = useCallback(() => setItems([]), []);
  const openWishlist = useCallback(() => setIsOpen(true), []);
  const closeWishlist = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
      isOpen,
      openWishlist,
      closeWishlist,
    }),
    [items, isWishlisted, toggleWishlist, removeFromWishlist, clearWishlist, isOpen, openWishlist, closeWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
