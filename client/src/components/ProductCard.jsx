import { useState } from 'react';
import { Link } from 'react-router-dom';
import { imgUrl } from '../api.js';
import { money } from '../utils.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Icon from './Icon.jsx';
import QuickViewModal from './QuickViewModal.jsx';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const [quickView, setQuickView] = useState(false);

  const out = !(product.stock > 0);
  const onSale = product.compareAtPrice > product.price;
  const off = onSale ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
  const href = `/product/${product.slug}`;
  const wish = isWishlisted(product._id);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
    toast(wish ? `Removed “${product.name}” from wishlist` : `Saved “${product.name}” to wishlist`);
  };

  const handleQuickViewClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickView(true);
  };

  return (
    <>
      <article className="card product-card">
        <div className="product-img-wrap">
          <Link to={href} className="product-img" tabIndex={-1} aria-hidden="true">
            <img
              src={imgUrl(product.images?.[0])}
              alt={product.name}
              loading="lazy"
              width="400"
              height="400"
              className="img-primary"
            />
            {product.images?.[1] && (
              <img
                src={imgUrl(product.images[1])}
                alt=""
                loading="lazy"
                width="400"
                height="400"
                className="img-secondary"
              />
            )}
            {onSale && !out && <span className="tag tag-sale">-{off}%</span>}
            {out && <span className="tag tag-out">Sold out</span>}
          </Link>

          {/* Quick Wishlist button */}
          <button
            type="button"
            className={`card-wishlist-btn ${wish ? 'active' : ''}`}
            onClick={handleWishlistClick}
            aria-label={wish ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            title={wish ? 'Saved in wishlist' : 'Save to wishlist'}
          >
            <Icon name="heart" size={16} />
          </button>

          {/* Quick View overlay button */}
          <button
            type="button"
            className="card-quickview-btn"
            onClick={handleQuickViewClick}
            aria-label={`Quick view ${product.name}`}
          >
            <Icon name="eye" size={15} /> Quick view
          </button>
        </div>

        <div className="product-info">
          <div className="product-meta-row">
            <span className="product-cat">{product.category?.name || ' '}</span>
            <span className="product-rating-pill" title="Customer rating">
              <Icon name="star" size={12} className="star-gold" /> 4.9
            </span>
          </div>

          <Link to={href} className="product-name">{product.name}</Link>

          <div className="price-row">
            <strong>{money(product.price)}</strong>
            {onSale && <s className="muted small">{money(product.compareAtPrice)}</s>}
          </div>

          <button
            className="btn btn-primary btn-block add-btn"
            disabled={out}
            onClick={() => {
              add(product, 1, true);
              toast(`Added “${product.name}” to your cart`);
            }}
          >
            <Icon name={out ? 'x' : 'cart'} size={16} /> {out ? 'Out of stock' : 'Add to cart'}
          </button>
        </div>
      </article>

      {quickView && (
        <QuickViewModal product={product} onClose={() => setQuickView(false)} />
      )}
    </>
  );
}
