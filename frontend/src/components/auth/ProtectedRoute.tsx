import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
// TODO: Replace with Better Auth
// import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  // TODO: Replace with Better Auth
  // const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthenticated = false; // Temporary placeholder - all routes unprotected for now

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;