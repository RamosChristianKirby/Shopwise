import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { STORE } from '../config.js';
import { useEscape, useScrollLock } from '../hooks.js';
import ErrorBoundary from './ErrorBoundary.jsx';
import Icon from './Icon.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import LiveSearch from './LiveSearch.jsx';
import CartDrawer from './CartDrawer.jsx';
import WishlistDrawer from './WishlistDrawer.jsx';

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
  const { count, openDrawer } = useCart();
  const { count: wishlistCount, openWishlist } = useWishlist();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);

  useScrollLock(menu);
  useEscape(menu, () => setMenu(false));
  useEffect(() => {
    setMenu(false);
  }, [pathname]);

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

          {/* Instant Live Search Autocomplete */}
          <LiveSearch />

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

            {/* Wishlist Button with Counter */}
            <button
              className="icon-btn wishlist-btn"
              aria-label={`Saved items, ${wishlistCount} item${wishlistCount === 1 ? '' : 's'}`}
              onClick={openWishlist}
              title="Saved items"
            >
              <Icon name="heart" size={20} className={wishlistCount > 0 ? 'heart-filled' : ''} />
              {wishlistCount > 0 && <span className="cart-count wishlist-count">{wishlistCount}</span>}
            </button>

            {/* Cart Button with Slide-over Drawer trigger */}
            <button
              className="icon-btn cart-btn"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
              onClick={openDrawer}
              title="Shopping Cart"
            >
              <Icon name="cart" size={22} />
              {count > 0 && <span className="cart-count">{count > 99 ? '99+' : count}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {menu && (
        <>
          <div className="scrim" onClick={() => setMenu(false)} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer-head">
              <Brand onClick={() => setMenu(false)} />
              <button className="icon-btn" aria-label="Close menu" onClick={() => setMenu(false)}><Icon name="x" size={22} /></button>
            </div>

            <div className="drawer-search-wrap">
              <LiveSearch id="drawer-search" onSelect={() => setMenu(false)} />
            </div>

            <nav className="drawer-links" aria-label="Menu">
              <NavLink to="/" end><Icon name="store" /> Home</NavLink>
              <NavLink to="/shop"><Icon name="grid" /> Shop</NavLink>
              <button className="drawer-link-btn" onClick={() => { setMenu(false); openWishlist(); }}>
                <Icon name="heart" /> Wishlist {wishlistCount > 0 && <span className="cart-count wishlist-count">{wishlistCount}</span>}
              </button>
              <button className="drawer-link-btn" onClick={() => { setMenu(false); openDrawer(); }}>
                <Icon name="cart" /> Cart {count > 0 && <span className="cart-count">{count}</span>}
              </button>
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

      {/* Slide-over Mini-Cart Drawer */}
      <CartDrawer />

      {/* Saved Wishlist Drawer */}
      <WishlistDrawer />

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
              <li><button className="link-btn" onClick={openWishlist}>Saved wishlist</button></li>
              <li><button className="link-btn" onClick={openDrawer}>Your cart</button></li>
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
