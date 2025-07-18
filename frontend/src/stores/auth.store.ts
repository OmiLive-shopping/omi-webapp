import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState } from '@/types/store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
          }

          const { token, user } = await response.json();
          set({ token, user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, username: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, username }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
          }

          const { token, user } = await response.json();
          set({ token, user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            throw new Error('Auth check failed');
          }

          const user = await response.json();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
    }
  )
);