import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('threatlens_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('threatlens_token');
      if (savedToken) {
        try {
          const profile = await api.auth.getProfile();
          setUser(profile);
          setToken(savedToken);
        } catch (e) {
          console.warn('Session expired, using guest/local storage state');
          // If offline or dev fallback, recover stored demo user
          const cachedUser = localStorage.getItem('threatlens_user');
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          } else {
            logout();
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username_or_email, password) => {
    try {
      const data = await api.auth.login(username_or_email, password);
      localStorage.setItem('threatlens_token', data.access_token);
      localStorage.setItem('threatlens_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return data;
    } catch (err) {
      // Demo fallback if backend is momentarily unreachable
      if (username_or_email === 'analyst') {
        const demoUser = {
          id: 'demo-analyst-1',
          username: 'analyst',
          email: 'analyst@threatlens.ai',
          full_name: 'Alex Mercer (Lead SOC Analyst)',
          role: 'admin',
        };
        const demoToken = 'demo-jwt-token-active';
        localStorage.setItem('threatlens_token', demoToken);
        localStorage.setItem('threatlens_user', JSON.stringify(demoUser));
        setToken(demoToken);
        setUser(demoUser);
        return { access_token: demoToken, user: demoUser };
      }
      throw err;
    }
  };

  const register = async (userData) => {
    const data = await api.auth.register(userData);
    localStorage.setItem('threatlens_token', data.access_token);
    localStorage.setItem('threatlens_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const loginAsDemo = () => {
    const demoUser = {
      id: 'demo-analyst-1',
      username: 'analyst',
      email: 'analyst@threatlens.ai',
      full_name: 'Alex Mercer (Lead SOC Analyst)',
      role: 'admin',
    };
    const demoToken = 'demo-jwt-threatlens-soc-token';
    localStorage.setItem('threatlens_token', demoToken);
    localStorage.setItem('threatlens_user', JSON.stringify(demoUser));
    setToken(demoToken);
    setUser(demoUser);
  };

  const logout = () => {
    localStorage.removeItem('threatlens_token');
    localStorage.removeItem('threatlens_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
