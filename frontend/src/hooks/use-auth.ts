'use client';

import { createContext, useContext } from 'react';
import type { User } from '@/types/user';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (nextPath?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    name?: string;
    email?: string;
    phone?: string | null;
  }) => Promise<User>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => Promise<User>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
