import { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api, { storage, storeSlugs } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useEscape, useScrollLock } from '../hooks.js';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import Icon from '../components/Icon.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import Spinner from '../components/Spinner.jsx';

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true, icon: 'grid' },
  { to: '/admin/orders', label: 'Orders', icon: 'list' },
  { to: '/admin/products', label: 'Products', icon: 'package' },
  { to: '/admin/categories', label: 'Categories', icon: 'tag' },
  { to: '/admin/customers', label: 'Customers', icon: 'users' },
  { to: '/admin/settings', label: 'Store settings', icon: 'settings' },
  { to: '/admin/billing', label: 'Plan & billing', icon: 'card' },
];

const AdminStoreContext = createContext(null);
/** The store being managed in /admin: { slug, store, refresh, switchTo } */
export const useAdminStore = () => useContext(AdminStoreContext);

export default function AdminLayout() {
  const { user, stores, isPlatformAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Which store we manage: the remembered one if allowed, otherwise the first store of this user.
  const allowed = (slug) => isPlatformAdmin || stores.some((s) => s.slug === slug);
  const [slug, setSlug] = useState(() => {
    const saved = storage.get('adminStore');
    const pick = saved && allowed(saved) ? saved : stores[0]?.slug || '';
    storeSlugs.admin = pick;
    return pick;
  });

  const switchTo = (next) => {
    storage.set('adminStore', next);
    storeSlugs.admin = next;
    qc.removeQueries({ queryKey: ['admin'] });
    setSlug(next);
  };

  const storeQuery = useQuery({
    queryKey: ['admin', slug, 'store'],
    queryFn: () => api.get('/admin/store').then((r) => r.data),
    staleTime: 30 * 1000,
  });
  const store = storeQuery.data;

  useScrollLock(open);
  useEscape(open, () => setOpen(false));
  useEffect(() => { setOpen(false); }, [pathname]);

  const links = isPlatformAdmin ? [...LINKS, { to: '/admin/platform', label: 'Platform (SaaS)', icon: 'globe' }] : LINKS;
  const current = links.find((l) => (l.end ? pathname === l.to : pathname.startsWith(l.to)));
  const options = [...stores];
  if (store && !options.some((s) => s.slug === store.slug)) options.push({ _id: store._id, slug: store.slug, name: store.name });
  const storeLink = store ? (store.isDefault ? '/?store=' : `/?store=${store.slug}`) : '/';

  return (
    <AdminStoreContext.Provider value={{ slug, store, refresh: () => storeQuery.refetch(), switchTo, loading: storeQuery.isLoading }}>
      <div className="admin">
        <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Admin navigation">
          <div className="sidebar-head">
            <Link to="/admin" className="brand">
              <span className="brand-mark" aria-hidden="true"><Icon name="bag" size={18} /></span>
              <span className="brand-name">Shopwise</span>
              <span className="pill">Admin</span>
            </Link>
            <button className="icon-btn sidebar-close" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="x" size={20} /></button>
          </div>
          {options.length > 0 && (
            <div className="store-switch">
              <label>Managing store
                <select value={slug} onChange={(e) => switchTo(e.target.value)}>
                  {options.map((s) => <option key={s.slug} value={s.slug}>{s.name}{s.isDefault ? ' (main)' : ''}</option>)}
                </select>
              </label>
              {store && <span><span className={`plan-badge ${store.effectivePlan}`}>{store.effectivePlan}</span>{store.billing?.status === 'trialing' && <span className="muted small"> · trial</span>}{store.isActive === false && <span className="warn small"> · suspended</span>}</span>}
              <Link to="/sell/start"><Icon name="plus" size={12} /> Open another store</Link>
            </div>
          )}
          <nav>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}><Icon name={l.icon} size={18} /> {l.label}</NavLink>
            ))}
          </nav>
        </aside>

        <div className="admin-main">
          <header className="admin-top">
            <button className="icon-btn admin-toggle" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" size={22} /></button>
            <strong className="admin-crumb">{store ? `${store.name} · ` : ''}{current ? current.label : 'Admin'}</strong>
            <span className="grow" />
            <ThemeToggle />
            <span className="avatar" title={user.name} aria-hidden="true">{user.name?.[0]?.toUpperCase() || 'A'}</span>
          </header>
          <div className="admin-content">
            {storeQuery.isError ? (
              <div className="empty card">
                <div className="empty-icon"><Icon name="alert" size={26} /></div>
                <h3>You can’t manage this store</h3>
                <p className="muted">{storeQuery.error?.response?.data?.message || 'Pick another store or open your own.'}</p>
                <div className="btn-row" style={{ justifyContent: 'center' }}>
                  {stores[0] && <button className="btn btn-primary" onClick={() => switchTo(stores[0].slug)}>Go to {stores[0].name}</button>}
                  <Link to="/sell/start" className="btn btn-ghost">Open a store</Link>
                </div>
              </div>
            ) : !store ? <Spinner /> : (
              <ErrorBoundary key={pathname + slug} inline>
                <Outlet key={slug} />
              </ErrorBoundary>
            )}
          </div>
        </div>
        {open && <div className="scrim" onClick={() => setOpen(false)} />}
      </div>
    </AdminStoreContext.Provider>
  );
}
