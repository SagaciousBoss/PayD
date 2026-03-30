import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'EMPLOYER' | 'EMPLOYEE';
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (provider: 'google' | 'github') => void;
  logout: () => void;
  setTokenFromCallback: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'payd_auth_token';

interface JwtPayload {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  picture?: string;
}

function decodeJwtPayload(token: string): User | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    const decoded = atob(parts[1]);
    const payload = JSON.parse(decoded) as JwtPayload;
    return {
      id: payload.sub ?? payload.id ?? '',
      email: payload.email ?? '',
      name: payload.name ?? '',
      role: payload.role === 'EMPLOYER' || payload.role === 'EMPLOYEE' ? payload.role : 'EMPLOYEE',
      picture: payload.picture,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      const decoded = decodeJwtPayload(stored);
      if (decoded) {
        setToken(stored);
        setUser(decoded);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((provider: 'google' | 'github') => {
    const backendUrl = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:4000';
    window.location.href = `${backendUrl}/auth/${provider}`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const setTokenFromCallback = useCallback((newToken: string) => {
    const decoded = decodeJwtPayload(newToken);
    if (decoded) {
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(decoded);
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    setTokenFromCallback,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
