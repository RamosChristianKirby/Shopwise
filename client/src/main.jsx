import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { StoreProvider } from './context/StoreContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { WishlistProvider } from './context/WishlistContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { STORE } from './config.js';
import './index.css';
import './brand.css';

document.title = STORE.name;

// React Query caches API data between pages (catalogue, facets, product pages) so navigation is instant.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, error) => !(error?.response?.status >= 400 && error?.response?.status < 500) && count < 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <StoreProvider>
              <AuthProvider>
                <CartProvider>
                  <WishlistProvider>
                    <App />
                  </WishlistProvider>
                </CartProvider>
              </AuthProvider>
            </StoreProvider>
          </ToastProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
