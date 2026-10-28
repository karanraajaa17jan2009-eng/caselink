import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/types';
import { api, setAuthToken, getAuthToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSeniorMgmt: boolean;
  canCreateCase: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadMe() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.get<User>('/auth/me');
        setUser(me);
        setToken(storedToken);
      } catch (err) {
        console.error('Failed to load authenticated user profile', err);
        setAuthToken(null);
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadMe();
  }, []);

  const login = async (email: string, password = 'Caselink@2026') => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      setAuthToken(res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'ADMIN';
  const isSeniorMgmt = user?.role === 'SENIOR_MGMT';
  const canCreateCase = user ? !isSeniorMgmt : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAdmin,
        isSeniorMgmt,
        canCreateCase,
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
