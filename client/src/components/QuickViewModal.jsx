import { useState } from 'react';
import { Link } from 'react-router-dom';
import { imgUrl } from '../api.js';
import { money } from '../utils.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';

export default function QuickViewModal({ product, onClose }) {
  const { add } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const out = !(product.stock > 0);
  const onSale = product.compareAtPrice > product.price;
  const off = onSale ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;
  const images = product.images?.length ? product.images : [''];
  const low = !out && product.stock <= 5;
  const wish = isWishlisted(product._id);

  const handleAddToCart = () => {
    add(product, qty, true);
    toast(`Added ${qty} × “${product.name}” to your cart`);
    onClose();
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product);
    toast(wish ? `Removed “${product.name}” from wishlist` : `Saved “${product.name}” to wishlist`);
  };

  return (
    <Modal title="Quick Preview" onClose={onClose} wide>
      <div className="quickview-grid">
        <div className="quickview-gallery">
          <div className="quickview-main-img">
            <img src={imgUrl(images[activeImg])} alt={product.name} />
            {onSale && !out && <span className="tag tag-sale">-{off}%</span>}
            {out && <span className="tag tag-out">Sold out</span>}
          </div>
          {images.length > 1 && (
            <div className="quickview-thumbs">
              {images.map((src, i) => (
                <button
                  key={i}
                  className={`quickview-thumb-btn ${i === activeImg ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}
                  aria-label={`View image ${i + 1}`}
                >
                  <img src={imgUrl(src)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="quickview-details stack">
          <div>
            {(product.brand || product.category?.name) && (
              <span className="eyebrow">{product.brand || product.category?.name}</span>
            )}
            <h2 className="quickview-title">{product.name}</h2>
            <div className="rating-pill">
              <span className="star-icon"><Icon name="star" size={14} /></span>
              <strong>4.9</strong>
              <span className="muted small">(24 verified reviews)</span>
            </div>
          </div>

          <div className="price-row big">
            <strong>{money(product.price)}</strong>
            {onSale && (
              <>
                <s className="muted">{money(product.compareAtPrice)}</s>
                <span className="save">Save {off}%</span>
              </>
            )}
          </div>

          <p className={out ? 'stock out' : low ? 'stock low' : 'stock'}>
            <Icon name={out ? 'x' : 'check'} size={16} strokeWidth={2.5} />
            {out ? 'Out of stock' : low ? `Only ${product.stock} units left in stock` : 'In stock & ready to ship'}
          </p>

          {product.description && (
            <p className="desc quickview-desc">{product.description}</p>
          )}

          {!out && (
            <div className="buy-row">
              <div className="qty" role="group" aria-label="Quantity">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  <Icon name="minus" size={16} />
                </button>
                <span aria-live="polite">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock}
                  aria-label="Increase quantity"
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>

              <button className="btn btn-primary grow" onClick={handleAddToCart}>
                <Icon name="cart" size={18} /> Add to cart
              </button>

              <button
                className={`icon-btn heart-btn-lg ${wish ? 'active' : ''}`}
                onClick={handleToggleWishlist}
                aria-label={wish ? 'Remove from wishlist' : 'Save to wishlist'}
                title={wish ? 'Saved' : 'Save to wishlist'}
              >
                <Icon name="heart" size={20} />
              </button>
            </div>
          )}

          <div className="quickview-footer">
            <Link
              to={`/product/${product.slug}`}
              className="link-btn see-full"
              onClick={onClose}
            >
              View complete product details <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
