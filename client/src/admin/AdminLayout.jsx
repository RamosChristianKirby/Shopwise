import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useEscape, useScrollLock } from '../hooks.js';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import Icon from '../components/Icon.jsx';
import { Brand } from '../components/StoreLayout.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true, icon: 'grid' },
  { to: '/admin/orders', label: 'Orders', icon: 'list' },
  { to: '/admin/products', label: 'Products', icon: 'package' },
  { to: '/admin/categories', label: 'Categories', icon: 'tag' },
  { to: '/admin/customers', label: 'Customers', icon: 'users' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useScrollLock(open);
  useEscape(open, () => setOpen(false));
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const current = LINKS.find((l) => (l.end ? pathname === l.to : pathname.startsWith(l.to)));

  return (
    <div className="admin">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Admin navigation">
        <div className="sidebar-head">
          <Brand to="/admin"><span className="pill">Admin</span></Brand>
          <button className="icon-btn sidebar-close" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="x" size={20} /></button>
        </div>
        <nav>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}><Icon name={l.icon} size={18} /> {l.label}</NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link to="/" className="side-link"><Icon name="store" size={16} /> View store <Icon name="external" size={12} /></Link>
          <div className="muted small ellipsis" title={user.email}>{user.email}</div>
          <button className="side-link" onClick={() => { logout(); navigate('/'); }}><Icon name="logout" size={16} /> Log out</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-top">
          <button className="icon-btn admin-toggle" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" size={22} /></button>
          <strong className="admin-crumb">{current ? `Admin · ${current.label}` : 'Admin'}</strong>
          <span className="grow" />
          <ThemeToggle />
          <span className="avatar" title={user.name} aria-hidden="true">{user.name?.[0]?.toUpperCase() || 'A'}</span>
        </header>
        <div className="admin-content">
          <ErrorBoundary key={pathname} inline>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}
