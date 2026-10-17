import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { imgUrl } from '../api.js';
import { useSeo } from '../hooks.js';
import { money, plural } from '../utils.js';
import { useCart } from '../context/CartContext.jsx';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCategories, useProducts } from '../queries.js';
import Icon from '../components/Icon.jsx';
import { ProductGridSkeleton } from '../components/Skeleton.jsx';
import { Stars } from '../components/ui.jsx';

export default function Bundle() {
  const { store } = useStore();
  const { add, setCoupon } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [picked, setPicked] = useState([]);
  const { data: categories = [] } = useCategories();
  const { data } = useProducts({ category, inStock: 'true', sort: 'popular', limit: 48 });
  const coupon = store.coupons?.find((c) => c.minItems >= 2) || { code: '', percent: 0, minItems: 3 };

  useSeo({ title: 'Bundle builder', description: `Pick ${coupon.minItems} or more products and save ${coupon.percent}% on your bundle.` });

  const toggle = (p) => setPicked((list) => (list.some((x) => x._id === p._id) ? list.filter((x) => x._id !== p._id) : [...list, p]));
  const subtotal = picked.reduce((s, p) => s + p.price, 0);
  const qualifies = coupon.code && picked.length >= coupon.minItems;
  const discount = qualifies ? Math.round(subtotal * coupon.percent) / 100 : 0;

  const addBundle = () => {
    picked.forEach((p) => add(p, 1, false));
    if (qualifies) setCoupon(coupon.code);
    toast(qualifies ? `Bundle added — ${coupon.code} applied (${coupon.percent}% off)` : `${plural(picked.length, 'product')} added to your cart`);
    navigate('/cart');
  };

  return (
    <>
      <div className="shop-banner">
        <div>
          <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><Icon name="chevron-right" size={14} /><span>Bundle builder</span></nav>
          <h1 className="page-title">Build your bundle</h1>
          <p>{coupon.code ? `Pick ${coupon.minItems} or more different products and save ${coupon.percent}% on all of them with ${coupon.code}.` : 'Pick a few favourites and add them to your cart in one go.'}</p>
        </div>
      </div>

      <div className="sub-pills">
        <button className={`sub-pill ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>Everything</button>
        {categories.filter((c) => c.productCount > 0).map((c) => (
          <button key={c._id} className={`sub-pill ${category === c.slug ? 'active' : ''}`} onClick={() => setCategory(c.slug)}>{c.name} <em>{c.productCount}</em></button>
        ))}
      </div>

      <div className="bundle-layout">
        {!data ? <ProductGridSkeleton count={8} /> : (
          <div className="grid">
            {data.items.map((p) => {
              const on = picked.some((x) => x._id === p._id);
              const options = (p.variants || []).length > 0;
              return (
                <article key={p._id} className={`card product-card pick-card ${on ? 'picked' : ''}`}>
                  <div className="product-img-wrap">
                    <div className="product-img"><img src={imgUrl(p.images?.[0])} alt={p.name} loading="lazy" /></div>
                    {!options && (
                      <button className="pick-toggle" onClick={() => toggle(p)} aria-pressed={on} aria-label={on ? `Remove ${p.name} from bundle` : `Add ${p.name} to bundle`}>
                        <Icon name={on ? 'check' : 'plus'} size={18} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                  <div className="product-info">
                    <span className="product-brand">{p.brand}</span>
                    <Link to={`/product/${p.slug}`} className="product-name">{p.name}</Link>
                    {p.numReviews > 0 && <Stars value={p.rating} count={p.numReviews} />}
                    <div className="price-row"><strong>{money(p.price)}</strong></div>
                    {options ? (
                      <Link to={`/product/${p.slug}`} className="btn btn-ghost btn-block btn-sm"><Icon name="sliders" size={14} /> Choose options on its page</Link>
                    ) : (
                      <button className={`btn btn-block btn-sm ${on ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggle(p)}>{on ? 'In your bundle' : 'Add to bundle'}</button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <aside className="card pad stack bundle-summary">
          <h3 style={{ margin: 0, fontFamily: 'var(--display)', textTransform: 'uppercase', fontSize: '1.5rem' }}>Your bundle</h3>
          {coupon.code && (
            <div className="usage">
              <div className="usage-row"><span>{plural(picked.length, 'product')}</span><span className={qualifies ? 'ok' : 'muted'}>{qualifies ? `${coupon.percent}% off unlocked` : `${coupon.minItems - picked.length} more to save ${coupon.percent}%`}</span></div>
              <div className="meter"><span style={{ width: `${Math.min(100, (picked.length / coupon.minItems) * 100)}%` }} /></div>
            </div>
          )}
          {picked.length === 0 ? <p className="muted small" style={{ margin: 0 }}>Tap + on any product to add it.</p> : (
            <ul className="sum-items">
              {picked.map((p) => (
                <li key={p._id}>
                  <span className="sum-thumb"><img src={imgUrl(p.images?.[0])} alt="" /></span>
                  <span className="grow small">{p.name}</span>
                  <button className="icon-btn" aria-label={`Remove ${p.name}`} onClick={() => toggle(p)}><Icon name="x" size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="sum-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          {discount > 0 && <div className="sum-row ok"><span>{coupon.code}</span><span>−{money(discount)}</span></div>}
          <div className="sum-row total"><span>Bundle total</span><span>{money(subtotal - discount)}</span></div>
          <button className="btn btn-primary btn-lg btn-block btn-caps" disabled={!picked.length} onClick={addBundle}>Add bundle to cart</button>
        </aside>
      </div>
    </>
  );
}
