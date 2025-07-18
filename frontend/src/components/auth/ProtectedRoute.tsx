import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  isAuthenticated = false 
}) => {
  const location = useLocation();

  // TODO: Replace with actual auth check from your auth context/store
  // For now, we'll use the prop or check localStorage
  const isUserAuthenticated = isAuthenticated || localStorage.getItem('authToken') !== null;

  if (!isUserAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;