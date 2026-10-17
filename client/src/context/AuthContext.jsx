import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { storage } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!storage.get('token'));

  // Restore the session from the saved token
  useEffect(() => {
    if (!storage.get('token')) return;
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch((e) => { if (e.response) storage.remove('token'); }) // keep the token if the API is merely unreachable
      .finally(() => setLoading(false));
  }, []);

  // The API rejected the saved login (expired / disabled account)
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const accept = useCallback((data) => {
    storage.set('token', data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => accept((await api.post('/auth/login', { email, password })).data), [accept]);
  const register = useCallback(async (name, email, password) => accept((await api.post('/auth/register', { name, email, password })).data), [accept]);
  const updateProfile = useCallback(async (payload) => accept((await api.put('/auth/profile', payload)).data), [accept]);
  const logout = useCallback(() => {
    storage.remove('token');
    storage.remove('adminStore');
    setUser(null);
  }, []);
  // Re-reads the account (e.g. after opening a new store, so it appears in the store switcher).
  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const stores = user?.stores || [];
  const value = useMemo(
    () => ({
      user,
      loading,
      // Can open /admin: platform admins, and owners/staff of at least one store.
      isAdmin: user?.role === 'admin' || stores.length > 0,
      isPlatformAdmin: user?.role === 'admin',
      stores,
      login,
      register,
      updateProfile,
      logout,
      refreshUser,
    }),
    [user, stores, loading, login, register, updateProfile, logout, refreshUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
