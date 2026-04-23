import React from 'react';
import { apiRequest } from './api.ts';

export type AdminUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  adminScope?: string;
};

type AuthContextType = {
  token: string | null;
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string, state: string) => Promise<void>;
  logout: () => void;
};

const TOKEN_KEY = 'edrive_admin_token';
const USER_KEY = 'edrive_admin_user';

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = React.useState<AdminUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  });
  const [isLoading] = React.useState(false);

  const login = React.useCallback(async (email: string, password: string, state: string) => {
    const data = await apiRequest<{ access_token: string; user: AdminUser }>('/auth/login', {
      method: 'POST',
      body: { email, password, state },
    });

    if (data.user.role !== 'admin') {
      throw new Error('Access denied. Admin role is required.');
    }

    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }, []);

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const value = React.useMemo<AuthContextType>(() => ({
    token,
    user,
    isLoading,
    login,
    logout,
  }), [token, user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
