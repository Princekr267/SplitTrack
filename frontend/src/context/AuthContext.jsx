import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        return res.data.user;
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('splittrack_token');
      }
      setUser(null);
    }
    return null;
  }, []);

  // Check auth session on initial load
  useEffect(() => {
    async function checkAuth() {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [refreshUser]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', {
      username: username ? username.trim().toLowerCase() : '',
      password,
    });
    if (res.success && res.data?.user) {
      if (res.data?.token && typeof window !== 'undefined') {
        localStorage.setItem('splittrack_token', res.data.token);
      }
      setUser(res.data.user);
    }
    return res.data?.user;
  };

  const register = async ({ name, username, password, email, phone, inviteCode }) => {
    const res = await api.post('/auth/register', {
      name,
      username: username ? username.trim().toLowerCase() : '',
      password,
      email: email ? email.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      inviteCode: inviteCode ? inviteCode.trim() : undefined,
    });
    if (res.success && res.data?.user) {
      if (res.data?.token && typeof window !== 'undefined') {
        localStorage.setItem('splittrack_token', res.data.token);
      }
      setUser(res.data.user);
    }
    return {
      user: res.data?.user,
      recoveryCodes: res.data?.recoveryCodes || [],
    };
  };

  const dismissPasswordNotice = async () => {
    try {
      await api.post('/auth/password-notice/dismiss');
      setUser((prev) => (prev ? { ...prev, passwordChangeNoticePending: false } : null));
    } catch (err) {
      console.error('Failed to dismiss password notice:', err);
    }
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        setUser,
        refreshUser,
        dismissPasswordNotice,
      }}
    >
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
