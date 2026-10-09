import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check auth session on initial load
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get('/auth/me');
        if (res.success && res.data?.user) {
          setUser(res.data.user);
        }
      } catch (err) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('splittrack_token');
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data?.user) {
      if (res.data?.token && typeof window !== 'undefined') {
        localStorage.setItem('splittrack_token', res.data.token);
      }
      setUser(res.data.user);
    }
    return res.data?.user;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    if (res.success && res.data?.user) {
      if (res.data?.token && typeof window !== 'undefined') {
        localStorage.setItem('splittrack_token', res.data.token);
      }
      setUser(res.data.user);
    }
    return res.data?.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('splittrack_token');
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
