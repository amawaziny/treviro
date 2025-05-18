"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { name?: string; email?: string; avatar?: string } | null;
  login: () => void;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string; avatar?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simulate checking auth status from localStorage or a cookie
    const storedAuth = localStorage.getItem('treviro-auth');
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      setIsAuthenticated(authData.isAuthenticated);
      setUser(authData.user);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(() => {
    const mockUser = { 
      name: 'Demo User', 
      email: 'demo@example.com', 
      avatar: 'https://placehold.co/100x100.png' 
    };
    setIsAuthenticated(true);
    setUser(mockUser);
    localStorage.setItem('treviro-auth', JSON.stringify({ isAuthenticated: true, user: mockUser }));
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('treviro-auth');
    router.push('/');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
