'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '@/hooks/use-auth';
import { api, fetchCsrfCookie } from '@/lib/api';
import type { User } from '@/types/user';

type AuthResponse = {
  data: User;
  message?: string;
};

type GoogleRedirectResponse = {
  url: string;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
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
    const timeoutId = window.setTimeout(() => {
      void fetchUser();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    await fetchCsrfCookie();
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    queryClient.clear();
    setUser(response.data);
    setIsLoading(false);

    return response.data;
  };

  const loginWithGoogle = async (nextPath?: string) => {
    const query = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    const response = await api.get<GoogleRedirectResponse>(`/auth/google/redirect${query}`);
    window.location.assign(response.url);
  };

  const logout = async () => {
    try {
      await fetchCsrfCookie();
      await api.post('/auth/logout');
    } finally {
      queryClient.clear();
      setUser(null);
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; phone?: string | null }) => {
    await fetchCsrfCookie();
    const response = await api.put<AuthResponse>('/auth/profile', data);
    setUser(response.data);
    setIsLoading(false);

    return response.data;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => {
    await fetchCsrfCookie();
    const response = await api.post<AuthResponse>('/auth/register', data);
    queryClient.clear();
    setUser(response.data);
    setIsLoading(false);

    return response.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
