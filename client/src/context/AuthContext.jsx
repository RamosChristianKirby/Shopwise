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
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'admin', login, register, updateProfile, logout }),
    [user, loading, login, register, updateProfile, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
