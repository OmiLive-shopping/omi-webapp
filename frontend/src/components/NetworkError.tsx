import React from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

interface NetworkErrorProps {
  error?: Error | null;
  onRetry?: () => void;
  message?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ 
  error, 
  onRetry,
  message = "Unable to connect to the server"
}) => {
  const isOffline = !navigator.onLine;
  
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 p-4 rounded-full bg-red-100 dark:bg-red-900/20">
        {isOffline ? (
          <WifiOff className="h-12 w-12 text-red-600 dark:text-red-400" />
        ) : (
          <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
        )}
      </div>
      
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {isOffline ? 'No Internet Connection' : 'Connection Error'}
      </h3>
      
      <p className="text-text-secondary max-w-md mb-6">
        {isOffline 
          ? 'Please check your internet connection and try again.'
          : message
        }
      </p>

      {process.env.NODE_ENV === 'development' && error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md max-w-md w-full">
          <p className="text-sm font-mono text-red-600 dark:text-red-400">
            {error.message || error.toString()}
          </p>
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
      )}
    </div>
  );
};