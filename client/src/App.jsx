import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { useAuth } from './context/AuthContext.jsx';

import StoreLayout from './components/StoreLayout.jsx';
import Spinner from './components/Spinner.jsx';
import ApiStatus from './components/ApiStatus.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Account from './pages/Account.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));
const Dashboard = lazy(() => import('./admin/Dashboard.jsx'));
const AdminProducts = lazy(() => import('./admin/AdminProducts.jsx'));
const AdminCategories = lazy(() => import('./admin/AdminCategories.jsx'));
const AdminOrders = lazy(() => import('./admin/AdminOrders.jsx'));
const AdminCustomers = lazy(() => import('./admin/AdminCustomers.jsx'));

function RequireAuth({ children, admin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner full />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

const S = ({ children }) => (
  <ErrorBoundary inline>
    <Suspense fallback={<Spinner />}>{children}</Suspense>
  </ErrorBoundary>
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0); // block body: newer Edge/Chrome return a Promise from scrollTo, which React rejects as an effect cleanup
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <ApiStatus />
      <Routes>
        <Route element={<StoreLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin" element={<RequireAuth admin><Suspense fallback={<Spinner full />}><AdminLayout /></Suspense></RequireAuth>}>
          <Route index element={<S><Dashboard /></S>} />
          <Route path="products" element={<S><AdminProducts /></S>} />
          <Route path="categories" element={<S><AdminCategories /></S>} />
          <Route path="orders" element={<S><AdminOrders /></S>} />
          <Route path="customers" element={<S><AdminCustomers /></S>} />
        </Route>
      </Routes>
    </>
  );
}
