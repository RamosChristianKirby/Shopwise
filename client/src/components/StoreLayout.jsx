import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { enterStore, useStore } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PLATFORM, SOCIAL } from '../config.js';
import { useEscape, useScrollLock } from '../hooks.js';
import { useCategories } from '../queries.js';
import ErrorBoundary from './ErrorBoundary.jsx';
import Icon from './Icon.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import LiveSearch from './LiveSearch.jsx';
import CartDrawer from './CartDrawer.jsx';
import WishlistDrawer from './WishlistDrawer.jsx';
import ChatWidget from './ChatWidget.jsx';
import { DrawerCategories, MainNav, PromoBar, shopUrl } from './SiteChrome.jsx';

export function Brand({ to = '/', onClick, children, sub }) {
  const ctx = useStore();
  const name = ctx?.store?.name || 'Shopwise';
  return (
    <Link to={to} className="brand" onClick={onClick}>
      <span className="brand-mark" aria-hidden="true"><Icon name="bag" size={18} /></span>
      <span className="brand-name">{name}{sub && <span className="brand-sub">{sub}</span>}</span>
      {children}
    </Link>
  );
}

function Footer() {
  const { store, isMainStore } = useStore();
  const { user } = useAuth();
  const { openWishlist } = useWishlist();
  const { data: categories = [] } = useCategories();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const welcome = store.coupons?.find((c) => !c.minItems) || null;
  const socials = Object.entries(SOCIAL).filter(([, url]) => url);

  return (
    <footer className="footer-x">
      <div className="container">
        <div className="newsletter-x" style={{ marginBottom: 44 }}>
          <div>
            <h2>Get {welcome ? `${welcome.percent}% off` : 'early access'}</h2>
            <p>New drops, restocks and members-only deals in your inbox. No spam — unsubscribe anytime.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (!email.trim()) return; toast(welcome ? `You’re in! Use code ${welcome.code} at checkout.` : 'You’re subscribed — thanks!'); setEmail(''); }}>
            <input type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
            <button className="btn btn-white btn-caps">Subscribe</button>
          </form>
        </div>

        <div className="footer-x-grid">
          <div>
            <Brand />
            <p style={{ marginTop: 12, maxWidth: 320 }}>{store.branding?.tagline}</p>
            {(store.support?.email || store.support?.phone) && (
              <ul style={{ marginTop: 12 }}>
                {store.support.email && <li><a href={`mailto:${store.support.email}`}><Icon name="mail" size={14} /> {store.support.email}</a></li>}
                {store.support.phone && <li><a href={`tel:${store.support.phone}`}><Icon name="phone" size={14} /> {store.support.phone}</a></li>}
              </ul>
            )}
            {socials.length > 0 && (
              <div className="footer-socials">
                {socials.map(([name, url]) => <a key={name} href={url} target="_blank" rel="noreferrer" aria-label={name}><Icon name={name} size={18} /></a>)}
              </div>
            )}
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              {categories.slice(0, 6).map((c) => <li key={c._id}><Link to={shopUrl(c.slug)}>{c.name}</Link></li>)}
              <li><Link to="/shop?onSale=true">Deals &amp; clearance</Link></li>
              <li><Link to="/bundle">Bundle &amp; save</Link></li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li><Link to="/support">Help center</Link></li>
              <li><Link to="/support?tab=track">Track your order</Link></li>
              <li><Link to="/support?tab=shipping">Shipping</Link></li>
              <li><Link to="/support?tab=returns">Returns &amp; warranty</Link></li>
              <li><button className="link-btn" onClick={() => window.dispatchEvent(new CustomEvent('chat:open'))}>Chat with us</button></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><Link to={user ? '/account' : '/login'}>{user ? 'My orders' : 'Log in'}</Link></li>
              {!user && <li><Link to="/register">Create account</Link></li>}
              <li><button className="link-btn" onClick={openWishlist}>Wishlist</button></li>
              <li><Link to="/cart">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4>{PLATFORM.name}</h4>
            <ul>
              <li><Link to="/sell">Sell on {PLATFORM.name}</Link></li>
              <li><Link to="/sell#pricing">Pricing</Link></li>
              <li><Link to="/sell#stores">Shops on {PLATFORM.name}</Link></li>
              {!isMainStore && <li><button className="link-btn" onClick={() => enterStore('')}>{PLATFORM.name} main store</button></li>}
            </ul>
          </div>
        </div>

        <div className="footer-badges">
          <span className="footer-badge"><Icon name="lock" size={15} /> Secure checkout</span>
          <span className="footer-badge"><Icon name="cash" size={15} /> Cash on Delivery</span>
          <span className="footer-badge"><Icon name="card" size={15} /> GCash · Bank · PayPal</span>
          <span className="footer-badge"><Icon name="rotate" size={15} /> 30-day returns</span>
          <span className="footer-badge"><Icon name="file" size={15} /> PDF invoices</span>
        </div>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} {store.name}. {isMainStore ? 'All rights reserved.' : `Powered by ${PLATFORM.name}.`}</span>
          <nav aria-label="Legal">
            <Link to="/support?tab=privacy">Privacy</Link>
            <Link to="/support?tab=terms">Terms</Link>
            <Link to="/support?tab=shipping">Shipping policy</Link>
            <Link to="/support?tab=returns">Returns policy</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default function StoreLayout() {
  const { user, isAdmin, logout } = useAuth();
  const { count, openDrawer } = useCart();
  const { count: wishlistCount, openWishlist } = useWishlist();
  const { store, isMainStore } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const fullBleed = pathname === '/' || pathname === '/sell';

  useScrollLock(menu);
  useEscape(menu, () => setMenu(false));
  useEffect(() => { setMenu(false); }, [pathname]);

  const doLogout = () => { logout(); setMenu(false); navigate('/'); };

  return (
    <div className="store">
      <a href="#content" className="skip-link">Skip to content</a>
      <PromoBar />
      {!isMainStore && (
        <div className="store-bar">
          <div className="container">
            <Icon name="store" size={15} /> You’re shopping at <strong>{store.name}</strong> on {PLATFORM.name}.
            <button className="link-btn" onClick={() => enterStore('')}>Back to {PLATFORM.name}</button>
          </div>
        </div>
      )}

      <header className="site-header">
        <div className="container header-top">
          <button className="icon-btn nav-menu" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}>
            <Icon name="menu" size={24} />
          </button>
          <Brand sub={isMainStore ? 'Everyday · Tech · Style' : `on ${PLATFORM.name}`} />
          <LiveSearch />
          <div className="header-actions">
            {user ? (
              <NavLink to="/account" className="header-account">
                <Icon name="user" size={22} />
                <span className="hide-md"><small>Hello, {user.name.split(' ')[0]}</small><strong>My account</strong></span>
              </NavLink>
            ) : (
              <NavLink to="/login" className="header-account">
                <Icon name="user" size={22} />
                <span className="hide-md"><small>Hello, sign in</small><strong>Account</strong></span>
              </NavLink>
            )}
            {isAdmin && <Link to="/admin" className="icon-btn" title="Admin" aria-label="Admin panel"><Icon name="trend" size={21} /></Link>}
            <ThemeToggle />
            <button className="icon-btn wishlist-btn" aria-label={`Saved items, ${wishlistCount} item${wishlistCount === 1 ? '' : 's'}`} onClick={openWishlist} title="Saved items">
              <Icon name="heart" size={21} />
              {wishlistCount > 0 && <span className="cart-count">{wishlistCount}</span>}
            </button>
            <button className="icon-btn cart-btn" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`} onClick={openDrawer} title="Shopping cart">
              <Icon name="cart" size={23} />
              {count > 0 && <span className="cart-count">{count > 99 ? '99+' : count}</span>}
            </button>
          </div>
        </div>
        <MainNav />
      </header>

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
            <nav className="drawer-links scroll-y" aria-label="Menu">
              <NavLink to="/" end><Icon name="store" /> Home</NavLink>
              <NavLink to="/shop"><Icon name="grid" /> All products</NavLink>
              <div style={{ padding: '4px 12px' }}><DrawerCategories onNavigate={() => setMenu(false)} /></div>
              <NavLink to="/shop?onSale=true"><Icon name="bolt" /> Deals</NavLink>
              <NavLink to="/bundle"><Icon name="layers" /> Bundle &amp; save</NavLink>
              <NavLink to="/support"><Icon name="headset" /> Support</NavLink>
              <button className="drawer-link-btn" onClick={() => { setMenu(false); openWishlist(); }}>
                <Icon name="heart" /> Wishlist {wishlistCount > 0 && <span className="cart-count wishlist-count">{wishlistCount}</span>}
              </button>
              {user && <NavLink to="/account"><Icon name="package" /> My orders</NavLink>}
              {isAdmin && <NavLink to="/admin"><Icon name="trend" /> Admin panel</NavLink>}
              <NavLink to="/sell"><Icon name="rocket" /> Sell on {PLATFORM.name}</NavLink>
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

      <CartDrawer />
      <WishlistDrawer />

      <main id="content" className={fullBleed ? 'main main-full' : 'container main'}>
        <ErrorBoundary key={pathname} inline>
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}
