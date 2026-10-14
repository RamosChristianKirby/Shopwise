import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { imgUrl } from '../api.js';
import { money } from '../utils.js';
import { useEscape, useScrollLock } from '../hooks.js';
import Icon from './Icon.jsx';

export default function WishlistDrawer() {
  const { items, isOpen, closeWishlist, removeFromWishlist, clearWishlist, count } = useWishlist();
  const { add } = useCart();
  const { toast } = useToast();

  useScrollLock(isOpen);
  useEscape(isOpen, closeWishlist);

  if (!isOpen) return null;

  const handleAddToCart = (product) => {
    add(product, 1, true);
    toast(`Added “${product.name}” to your cart`);
  };

  return (
    <>
      <div className="scrim" onClick={closeWishlist} />
      <aside className="cart-drawer wishlist-drawer" role="dialog" aria-modal="true" aria-label="Saved Wishlist">
        <div className="cart-drawer-head">
          <div className="cart-drawer-title">
            <Icon name="heart" size={20} className="wishlist-icon-active" />
            <h2>Your Wishlist</h2>
            <span className="muted small">({count} item{count === 1 ? '' : 's'})</span>
          </div>
          <button className="icon-btn" onClick={closeWishlist} aria-label="Close wishlist">
            <Icon name="x" size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <div className="empty-icon"><Icon name="heart" size={36} /></div>
            <h3>Your wishlist is empty</h3>
            <p className="muted">Tap the heart on any product while browsing to save your favorites here.</p>
            <button
              className="btn btn-primary btn-block"
              onClick={closeWishlist}
            >
              Explore products
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer-items scroll-y">
              {items.map((item) => {
                const out = !(item.stock > 0);
                return (
                  <div className="cart-drawer-line wishlist-line" key={item._id}>
                    <Link
                      to={`/product/${item.slug}`}
                      className="cart-thumb"
                      onClick={closeWishlist}
                    >
                      <img src={imgUrl(item.images?.[0])} alt="" />
                    </Link>
                    <div className="cart-drawer-info">
                      <Link
                        to={`/product/${item.slug}`}
                        className="product-name"
                        onClick={closeWishlist}
                      >
                        {item.name}
                      </Link>
                      <div className="cart-drawer-price">
                        <strong>{money(item.price)}</strong>
                        {item.compareAtPrice > item.price && (
                          <s className="muted small">{money(item.compareAtPrice)}</s>
                        )}
                      </div>
                      <div className="muted small">
                        {out ? <span className="warn">Out of stock</span> : <span className="ok">In stock</span>}
                      </div>
                      <div className="wishlist-item-btns">
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={out}
                          onClick={() => handleAddToCart(item)}
                        >
                          <Icon name="cart" size={14} /> Add to cart
                        </button>
                        <button
                          className="link-btn danger small"
                          onClick={() => removeFromWishlist(item._id)}
                          aria-label={`Remove ${item.name} from wishlist`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-drawer-foot">
              <button className="link-btn danger btn-block" onClick={clearWishlist}>
                Clear entire wishlist
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
