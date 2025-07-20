import React, { Suspense, ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  fullScreen?: boolean;
  message?: string;
}

export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({ 
  children, 
  fallback,
  fullScreen = false,
  message = 'Loading...'
}) => {
  return (
    <Suspense 
      fallback={
        fallback || <LoadingSpinner fullScreen={fullScreen} message={message} />
      }
    >
      {children}
    </Suspense>
  );
};