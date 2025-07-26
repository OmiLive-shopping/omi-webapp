// TODO: Replace with Better Auth
// import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import type { LoginCredentials, RegisterCredentials } from '@/types/auth';

export const useAuth = () => {
  const navigate = useNavigate();
  
  // TODO: Replace with Better Auth
  // const {
  //   user,
  //   isAuthenticated,
  //   isLoading,
  //   error,
  //   login: storeLogin,
  //   register: storeRegister,
  //   logout: storeLogout,
  //   clearError,
  // } = useAuthStore();
  
  // Temporary placeholders
  const user = null;
  const isAuthenticated = false;
  const isLoading = false;
  const error = null;
  const clearError = () => {};

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        // TODO: Replace with Better Auth
        // await storeLogin(credentials);
        console.log('Login placeholder:', credentials);
        navigate('/');
      } catch (error) {
        console.error('Login failed:', error);
      }
    },
    [navigate]
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      try {
        // TODO: Replace with Better Auth
        // await storeRegister(credentials);
        console.log('Register placeholder:', credentials);
        navigate('/');
      } catch (error) {
        console.error('Registration failed:', error);
      }
    },
    [navigate]
  );

  const logout = useCallback(() => {
    // TODO: Replace with Better Auth
    // storeLogout();
    console.log('Logout placeholder');
    navigate('/auth');
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