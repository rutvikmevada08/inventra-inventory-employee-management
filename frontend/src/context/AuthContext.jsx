import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokenStore, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(tokenStore.get() && !user));

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then((res) => {
        const u = res.data?.data?.user || res.data?.data || res.data?.user;
        setUser(u);
        if (u) {
          try {
            localStorage.setItem('user', JSON.stringify(u));
          } catch {}
        }
      })
      .catch(() => {
        tokenStore.clear();
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const payload = res.data?.data || res.data;
    const token = payload?.token || res.data?.token;
    const userData = payload?.user || res.data?.user;
    if (token) tokenStore.set(token);
    if (userData) {
      setUser(userData);
      try {
        localStorage.setItem('user', JSON.stringify(userData));
      } catch {}
    }
    return userData;
  }, []);

  const value = useMemo(() => ({
    user,
    token: tokenStore.get(),
    loading,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'staff',
  }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
