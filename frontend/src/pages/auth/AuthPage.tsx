import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePageTitle from '@/hooks/usePageTitle';
import { useAuthStore } from '@/stores/authStore';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  usePageTitle(isLogin ? 'Login' : 'Register');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            OMI Live
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isLogin 
              ? 'Welcome back! Sign in to continue' 
              : 'Create your account to get started'
            }
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-center mb-6 text-gray-900 dark:text-white">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h2>
          
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>

        {/* Demo Note */}
        {isLogin && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-center text-blue-700 dark:text-blue-400">
              <strong>Demo Mode:</strong> Since the backend is not connected, 
              you can use any credentials to simulate login.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;