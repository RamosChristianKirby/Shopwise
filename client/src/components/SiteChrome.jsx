// Header pieces for the storefront: promo bar with countdown, main navigation with mega menus.
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { imgUrl } from '../api.js';
import { money, plural } from '../utils.js';
import { useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCategories } from '../queries.js';
import Icon from './Icon.jsx';
import { Countdown } from './ui.jsx';

export const shopUrl = (category, subcategory) =>
  `/shop?${new URLSearchParams({ ...(category ? { category } : {}), ...(subcategory ? { subcategory } : {}) })}`;

export function PromoBar() {
  const { store } = useStore();
  const { toast } = useToast();
  const coupon = store.coupons?.find((c) => !c.minItems && !c.minSubtotal) || store.coupons?.[0];
  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); toast(`Code ${code} copied — add it at checkout`); } catch { toast(`Use code ${code} at checkout`); }
  };
  return (
    <div className="promo-bar" role="region" aria-label="Promotions">
      <div className="container">
        {store.branding?.announcement ? (
          <span className="promo-item">{store.branding.announcement}</span>
        ) : (
          <>
            {coupon && (
              <span className="promo-item">
                <span className="promo-pill">Sale</span>
                <strong>Extra {coupon.percent}% off</strong> with code
                <button className="promo-code" onClick={() => copy(coupon.code)} title="Copy code">{coupon.code}</button>
                <span className="promo-hide-sm"><Countdown label="ends in" /></span>
              </span>
            )}
            <span className="promo-sep" aria-hidden="true" />
            <span className="promo-item promo-hide-sm"><Icon name="truck" size={15} /> Free shipping on orders {money(store.shipping?.freeOver ?? 2000)}+</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Desktop navigation row with a mega menu per category. */
export function MainNav() {
  const { data: categories = [] } = useCategories();
  const { isMainStore } = useStore();
  const { pathname, search } = useLocation();
  const [open, setOpen] = useState(null);
  const timer = useRef(null);

  useEffect(() => { setOpen(null); }, [pathname, search]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const enter = (id) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(id), 120); };
  const leave = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(null), 160); };
  const current = categories.find((c) => c._id === open);

  return (
    <nav className="mainnav" aria-label="Shop categories" onMouseLeave={leave}>
      <div className="container">
        <ul className="mainnav-list">
          {categories.map((c) => (
            <li key={c._id} className={open === c._id ? 'open' : ''} onMouseEnter={() => enter(c._id)}>
              <button aria-expanded={open === c._id} aria-haspopup="true" onClick={() => setOpen(open === c._id ? null : c._id)} onFocus={() => setOpen(c._id)}>
                {c.name} <Icon name="chevron-down" size={14} />
              </button>
            </li>
          ))}
          <li onMouseEnter={() => enter(null)}><Link to="/shop?onSale=true" className={`nav-deal ${pathname === '/shop' && /onSale=true/.test(search) ? 'active' : ''}`}><Icon name="bolt" size={16} /> Deals</Link></li>
          <li onMouseEnter={() => enter(null)}><NavLink to="/bundle"><Icon name="layers" size={16} /> Bundle &amp; save</NavLink></li>
          <li onMouseEnter={() => enter(null)}><NavLink to="/support"><Icon name="headset" size={16} /> Help</NavLink></li>
          {isMainStore && <li onMouseEnter={() => enter(null)} style={{ marginLeft: 'auto' }}><NavLink to="/sell" className="nav-sell"><Icon name="rocket" size={16} /> Start selling</NavLink></li>}
        </ul>
      </div>
      {current && (
        <div className="mega" onMouseEnter={() => clearTimeout(timer.current)}>
          <div className="container mega-inner">
            <div className="mega-tiles">
              <div className="mega-head">
                <h3>{current.name}</h3>
                <Link to={shopUrl(current.slug)} className="see-all-x">Shop all {current.productCount} <Icon name="arrow-right" size={14} /></Link>
              </div>
              {(current.subcategories || []).map((s) => (
                <Link key={s.name} to={shopUrl(current.slug, s.name)} className="mega-tile">
                  <img src={imgUrl(s.image)} alt="" loading="lazy" />
                  <span><strong>{s.name}</strong><span>{plural(s.count, 'product')}</span></span>
                </Link>
              ))}
              {!current.subcategories?.length && <p className="muted">{current.description}</p>}
            </div>
            <Link to={shopUrl(current.slug)} className="mega-feature">
              <img src={imgUrl(current.image)} alt="" />
              <div><strong>{current.name}</strong><span>{current.description || 'Shop the collection'}</span></div>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/** Category tree for the mobile drawer. */
export function DrawerCategories({ onNavigate }) {
  const { data: categories = [] } = useCategories();
  const [open, setOpen] = useState(null);
  return (
    <div className="stack" style={{ gap: 2 }}>
      {categories.map((c) => (
        <div key={c._id} className={`fgroup ${open === c._id ? '' : 'closed'}`} style={{ padding: '6px 0' }}>
          <button onClick={() => setOpen(open === c._id ? null : c._id)} aria-expanded={open === c._id}>
            <span>{c.name}</span><Icon name="chevron-down" size={16} />
          </button>
          <div className="fgroup-body">
            <Link to={shopUrl(c.slug)} onClick={onNavigate}>All {c.name.toLowerCase()} ({c.productCount})</Link>
            {(c.subcategories || []).map((s) => <Link key={s.name} to={shopUrl(c.slug, s.name)} onClick={onNavigate}>{s.name} ({s.count})</Link>)}
          </div>
        </div>
      ))}
    </div>
  );
}
