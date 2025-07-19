import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import type { LoginCredentials, RegisterCredentials } from '@/types/auth';

export const useAuth = () => {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    clearError,
  } = useAuthStore();

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        await storeLogin(credentials);
        navigate('/');
      } catch (error) {
        console.error('Login failed:', error);
      }
    },
    [storeLogin, navigate]
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      try {
        await storeRegister(credentials);
        navigate('/');
      } catch (error) {
        console.error('Registration failed:', error);
      }
    },
    [storeRegister, navigate]
  );

  const logout = useCallback(() => {
    storeLogout();
    navigate('/auth');
  }, [storeLogout, navigate]);

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