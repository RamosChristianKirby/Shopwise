import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '../api.js';

const WishlistContext = createContext(null);
export const useWishlist = () => useContext(WishlistContext);

const load = () => {
  try {
    const parsed = JSON.parse(storage.get('wishlist') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(load);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    storage.set('wishlist', JSON.stringify(items));
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
