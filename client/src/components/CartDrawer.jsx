import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import api, { imgUrl } from '../api.js';
import { money } from '../utils.js';
import { useEscape, useScrollLock } from '../hooks.js';
import Icon from './Icon.jsx';

export default function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, setQty, remove, subtotal, count } = useCart();
  const navigate = useNavigate();
  const [rules, setRules] = useState({ fee: 100, freeOver: 2000 });

  useScrollLock(isDrawerOpen);
  useEscape(isDrawerOpen, closeDrawer);

  useEffect(() => {
    api.get('/config/payment').then((r) => {
      if (r.data?.shipping) setRules(r.data.shipping);
    }).catch(() => {});
  }, []);

  if (!isDrawerOpen) return null;

  const remaining = rules.freeOver - subtotal;
  const progress = Math.min(100, Math.round((subtotal / rules.freeOver) * 100));
  const isFree = subtotal >= rules.freeOver;

  const goToCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  const goToCart = () => {
    closeDrawer();
    navigate('/cart');
  };

  return (
    <>
      <div className="scrim" onClick={closeDrawer} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping Cart">
        <div className="cart-drawer-head">
          <div className="cart-drawer-title">
            <Icon name="cart" size={20} />
            <h2>Your Cart</h2>
            <span className="muted small">({count} item{count === 1 ? '' : 's'})</span>
          </div>
          <button className="icon-btn" onClick={closeDrawer} aria-label="Close cart">
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Free shipping meter */}
        <div className="free-shipping-bar">
          <div className="free-shipping-text">
            {isFree ? (
              <span className="free-shipping-unlocked">🎉 You unlocked <strong>FREE Shipping</strong>!</span>
            ) : (
              <span>Add <strong>{money(remaining)}</strong> more for <strong>FREE Shipping</strong></span>
            )}
          </div>
          <div className="shipping-progress-track">
            <div
              className={`shipping-progress-fill ${isFree ? 'complete' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <div className="empty-icon"><Icon name="cart" size={36} /></div>
            <h3>Your cart is empty</h3>
            <p className="muted">Discover our newest arrivals and popular essentials.</p>
            <button
              className="btn btn-primary btn-block"
              onClick={() => { closeDrawer(); navigate('/shop'); }}
            >
              Start shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer-items scroll-y">
              {items.map((item) => (
                <div className="cart-drawer-line" key={item._id}>
                  <Link
                    to={`/product/${item.slug}`}
                    className="cart-thumb"
                    onClick={closeDrawer}
                  >
                    <img src={imgUrl(item.image)} alt="" />
                  </Link>
                  <div className="cart-drawer-info">
                    <Link
                      to={`/product/${item.slug}`}
                      className="product-name"
                      onClick={closeDrawer}
                    >
                      {item.name}
                    </Link>
                    <div className="cart-drawer-price">{money(item.price)}</div>
                    <div className="cart-drawer-actions">
                      <div className="qty compact" role="group" aria-label="Quantity">
                        <button
                          onClick={() => setQty(item._id, item.qty - 1)}
                          disabled={item.qty <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Icon name="minus" size={14} />
                        </button>
                        <span>{item.qty}</span>
                        <button
                          onClick={() => setQty(item._id, item.qty + 1)}
                          disabled={item.qty >= item.stock}
                          aria-label="Increase quantity"
                        >
                          <Icon name="plus" size={14} />
                        </button>
                      </div>
                      <button
                        className="link-btn danger small"
                        onClick={() => remove(item._id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  <strong className="cart-drawer-line-total">
                    {money(item.price * item.qty)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="cart-drawer-foot">
              <div className="sum-row">
                <span className="muted">Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <div className="sum-row muted small">
                <span>Shipping</span>
                <span>{isFree ? <strong className="ok">FREE</strong> : money(rules.fee)}</span>
              </div>
              <div className="sum-row total">
                <span>Estimated total</span>
                <strong>{money(subtotal + (isFree ? 0 : rules.fee))}</strong>
              </div>

              <div className="stack gap-sm">
                <button className="btn btn-primary btn-block btn-lg" onClick={goToCheckout}>
                  Proceed to checkout <Icon name="arrow-right" size={18} />
                </button>
                <button className="btn btn-ghost btn-block" onClick={goToCart}>
                  View full cart
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
