import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      await login(formData);
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by the auth store
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            placeholder="john@example.com"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            placeholder="Enter your password"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
        
        <div className="text-center">
          <button
            type="button"
            onClick={() => setFormData({ email: 'demo@example.com', password: 'demo123' })}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            Use demo credentials
          </button>
        </div>
      </div>

      <div className="text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
        </span>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Sign up
        </button>
      </div>
    </form>
  );
};

export default LoginForm;