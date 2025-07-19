import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (formData.password !== formData.confirmPassword) {
      return;
    }
    
    try {
      await register(formData);
      navigate('/');
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
              placeholder="John"
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
              placeholder="Doe"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            placeholder="johndoe"
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Email <span className="text-red-500">*</span>
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
            Password <span className="text-red-500">*</span>
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
            placeholder="Create a password"
          />
          <p className="mt-1 text-sm text-gray-500">Must be at least 8 characters</p>
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            placeholder="Confirm your password"
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
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </div>

      <div className="text-center text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
        </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Sign in
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;