import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { STORE } from '../config.js';
import { useEscape, useScrollLock } from '../hooks.js';
import ErrorBoundary from './ErrorBoundary.jsx';
import Icon from './Icon.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export function Brand({ to = '/', onClick, children }) {
  return (
    <Link to={to} className="brand" onClick={onClick}>
      <span className="brand-mark" aria-hidden="true"><Icon name="bag" size={18} /></span>
      <span className="brand-name">{STORE.name}</span>
      {children}
    </Link>
  );
}

export default function StoreLayout() {
  const { user, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);

  useScrollLock(menu);
  useEscape(menu, () => setMenu(false));
  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  const submit = (e) => {
    e.preventDefault();
    navigate(`/shop${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
    setMenu(false);
  };
  const doLogout = () => { logout(); setMenu(false); navigate('/'); };

  return (
    <div className="store">
      <a href="#content" className="skip-link">Skip to content</a>
      {STORE.announcement && <div className="announce"><div className="container">{STORE.announcement}</div></div>}

      <header className="nav">
        <div className="container nav-inner">
          <button className="icon-btn nav-menu" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <Icon name="menu" size={22} />
          </button>
          <Brand />

          <form className="nav-search" onSubmit={submit} role="search">
            <Icon name="search" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" aria-label="Search products" type="search" enterKeyHint="search" />
          </form>

          <nav className="nav-links" aria-label="Main">
            <NavLink to="/shop">Shop</NavLink>
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
            {user ? (
              <NavLink to="/account" className="nav-user"><Icon name="user" size={18} /> {user.name.split(' ')[0]}</NavLink>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
              </>
            )}
          </nav>

          <div className="nav-actions">
            <ThemeToggle />
            <Link to="/cart" className="icon-btn cart-btn" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              <Icon name="cart" size={22} />
              {count > 0 && <span className="cart-count">{count > 99 ? '99+' : count}</span>}
            </Link>
          </div>
        </div>
      </header>

      {menu && (
        <>
          <div className="scrim" onClick={() => setMenu(false)} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer-head">
              <Brand onClick={() => setMenu(false)} />
              <button className="icon-btn" aria-label="Close menu" onClick={() => setMenu(false)}><Icon name="x" size={22} /></button>
            </div>
            <form className="drawer-search" onSubmit={submit} role="search">
              <Icon name="search" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" aria-label="Search products" type="search" />
            </form>
            <nav className="drawer-links" aria-label="Menu">
              <NavLink to="/" end><Icon name="store" /> Home</NavLink>
              <NavLink to="/shop"><Icon name="grid" /> Shop</NavLink>
              <NavLink to="/cart"><Icon name="cart" /> Cart {count > 0 && <span className="cart-count">{count}</span>}</NavLink>
              {user && <NavLink to="/account"><Icon name="package" /> My orders</NavLink>}
              {isAdmin && <NavLink to="/admin"><Icon name="trend" /> Admin panel</NavLink>}
            </nav>
            <div className="drawer-foot">
              {user ? (
                <>
                  <div className="muted small">Signed in as <strong>{user.name}</strong></div>
                  <button className="btn btn-ghost btn-block" onClick={doLogout}><Icon name="logout" size={16} /> Log out</button>
                </>
              ) : (
                <div className="btn-row">
                  <Link to="/login" className="btn btn-ghost grow">Log in</Link>
                  <Link to="/register" className="btn btn-primary grow">Sign up</Link>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      <main id="content" className="container main">
        <ErrorBoundary key={pathname} inline>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Brand />
            <p className="muted small">{STORE.tagline}</p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><Link to="/shop">All products</Link></li>
              <li><Link to="/shop?sort=popular">Best sellers</Link></li>
              <li><Link to="/cart">Your cart</Link></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><Link to={user ? '/account' : '/login'}>{user ? 'My orders' : 'Log in'}</Link></li>
              {!user && <li><Link to="/register">Create account</Link></li>}
            </ul>
          </div>
          <div>
            <h4>We accept</h4>
            <ul className="pay-chips">
              <li><Icon name="cash" size={16} /> Cash on Delivery</li>
              <li><Icon name="card" size={16} /> GCash</li>
              <li><Icon name="store" size={16} /> Bank transfer</li>
            </ul>
          </div>
        </div>
        <div className="container footer-base">
          <span className="muted small">© {new Date().getFullYear()} {STORE.name}. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
