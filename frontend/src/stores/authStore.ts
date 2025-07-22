import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens, LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth';
import api from '@/lib/axios';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<AuthResponse>('/users/login', credentials);
          
          const { user, tokens } = response.data.data;
          
          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          // Store token in localStorage
          localStorage.setItem('authToken', tokens.accessToken);
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post<AuthResponse>('/users/register', {
            email: credentials.email,
            username: credentials.username,
            password: credentials.password,
            password2: credentials.confirmPassword,
            firstName: credentials.firstName,
            lastName: credentials.lastName,
          });
          
          const { user, tokens } = response.data.data;
          
          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          // Store token in localStorage
          localStorage.setItem('authToken', tokens.accessToken);
          
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });
        localStorage.removeItem('authToken');
        // Redirect to home or login page
        window.location.href = '/';
      },

      refreshToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) {
          get().logout();
          return;
        }

        try {
          const response = await api.post<AuthResponse>(
            '/auth/refresh',
            { refreshToken: tokens.refreshToken }
          );
          
          const newTokens = response.data.tokens;
          set({ tokens: newTokens });
          localStorage.setItem('authToken', newTokens.accessToken);
          
        } catch (error) {
          get().logout();
        }
      },

      clearError: () => set({ error: null }),
      
      setUser: (user: User) => set({ user }),
      
      setTokens: (tokens: AuthTokens) => {
        set({ tokens, isAuthenticated: true });
        localStorage.setItem('authToken', tokens.accessToken);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);