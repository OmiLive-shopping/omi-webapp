import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;