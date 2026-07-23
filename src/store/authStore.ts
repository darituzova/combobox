import { create } from 'zustand';
import { UserRole } from '@/types';

interface AuthState {
  token: string | null;
  refreshTokenValue: string | null;
  user: UserRole | null;
  isAuthenticated: boolean;
  setSession: (token: string, refreshTokenValue: string, user: UserRole) => void;
  clearSession: () => void;
}

const storedToken = localStorage.getItem('token');
const storedRefreshToken = localStorage.getItem('refresh_token');
const storedUserRaw = localStorage.getItem('user');
const storedUser: UserRole | null = storedUserRaw ? (JSON.parse(storedUserRaw) as UserRole) : null;

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  refreshTokenValue: storedRefreshToken,
  user: storedUser,
  isAuthenticated: Boolean(storedToken),
  setSession: (token, refreshTokenValue, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refresh_token', refreshTokenValue);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, refreshTokenValue, user, isAuthenticated: true });
  },
  clearSession: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ token: null, refreshTokenValue: null, user: null, isAuthenticated: false });
  },
}));
