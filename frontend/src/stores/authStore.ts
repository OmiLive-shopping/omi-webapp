import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthTokens, LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth';
import axios from 'axios';

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

// For development, we'll use localStorage. In production, tokens should be in httpOnly cookies
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

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
          // Mock authentication for development
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          // Mock successful response
          const mockUser: User = {
            id: '1',
            email: credentials.email,
            username: credentials.email.split('@')[0],
            role: 'viewer',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const mockTokens: AuthTokens = {
            accessToken: 'mock-access-token-' + Date.now(),
            refreshToken: 'mock-refresh-token-' + Date.now(),
            expiresIn: 3600,
          };
          
          set({
            user: mockUser,
            tokens: mockTokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          // Store token in localStorage for now (development)
          localStorage.setItem('authToken', mockTokens.accessToken);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
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
          // Mock registration for development
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
          
          // Mock successful response
          const mockUser: User = {
            id: Date.now().toString(),
            email: credentials.email,
            username: credentials.username,
            firstName: credentials.firstName,
            lastName: credentials.lastName,
            role: 'viewer',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const mockTokens: AuthTokens = {
            accessToken: 'mock-access-token-' + Date.now(),
            refreshToken: 'mock-refresh-token-' + Date.now(),
            expiresIn: 3600,
          };
          
          set({
            user: mockUser,
            tokens: mockTokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          // Store token in localStorage for now (development)
          localStorage.setItem('authToken', mockTokens.accessToken);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
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
          const response = await axios.post<AuthResponse>(
            `${API_URL}/auth/refresh`,
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