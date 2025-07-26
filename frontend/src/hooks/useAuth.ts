import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import type { LoginCredentials, RegisterCredentials } from '@/types/auth';
import { useAuthState, signInWithEmail, signUpWithEmail, signOut } from '@/lib/auth-client';

export const useAuth = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error } = useAuthState();
  
  const clearError = () => {
    // Better Auth doesn't have a clearError function, errors are cleared on next action
  };

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const result = await signInWithEmail(credentials.email, credentials.password);
        if (result.error) {
          throw new Error(result.error.message || 'Login failed');
        }
        navigate('/');
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    },
    [navigate]
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      try {
        const result = await signUpWithEmail({
          email: credentials.email,
          password: credentials.password,
          name: `${credentials.firstName || ''} ${credentials.lastName || ''}`.trim() || credentials.username,
          username: credentials.username,
        });
        if (result.error) {
          throw new Error(result.error.message || 'Registration failed');
        }
        navigate('/');
      } catch (error) {
        console.error('Registration failed:', error);
        throw error;
      }
    },
    [navigate]
  );

  const logout = useCallback(async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [navigate]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
};

export default useAuth;