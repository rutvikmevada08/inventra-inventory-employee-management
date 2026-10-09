<<<<<<< HEAD
import React, { createContext, useContext, useState, useEffect } from "react";
import API from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await API.get("/auth/me");
          setUser(res.data.user);
          localStorage.setItem("user", JSON.stringify(res.data.user));
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const isAdmin = user && user.role === "admin";
  const isStaff = user && user.role === "staff";

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
};
=======
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokenStore, setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    if (!tokenStore.get()) return;
    api.get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    tokenStore.set(res.data.data.token);
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, isAdmin: user?.role === 'admin' }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
>>>>>>> 17754b7be8a5b66f0630fde4c63ffb905fb08b5b

export const useAuth = () => useContext(AuthContext);
