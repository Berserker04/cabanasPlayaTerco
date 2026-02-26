'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { AuthContext } from '@/hooks/use-auth';
import { api, fetchCsrfCookie } from '@/lib/api';
import type { User } from '@/types/user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.get<{ data: User }>('/auth/user');
      setUser(data.data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    await fetchCsrfCookie();
    await api.post('/auth/login', { email, password });
    await fetchUser();
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => {
    await fetchCsrfCookie();
    await api.post('/auth/register', data);
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}
