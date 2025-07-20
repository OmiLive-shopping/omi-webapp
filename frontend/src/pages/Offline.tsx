import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const Offline: React.FC = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 p-6 rounded-full bg-background-secondary inline-block">
          <WifiOff className="h-16 w-16 text-text-tertiary" />
        </div>
        
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          You're Offline
        </h1>
        
        <p className="text-text-secondary mb-8">
          It looks like you've lost your internet connection. Please check your connection and try again.
        </p>
        
        <button
          onClick={handleRefresh}
          className="flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors mx-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
        
        <div className="mt-8 text-sm text-text-tertiary">
          <p>Some features may be available offline if you've visited them before.</p>
        </div>
      </div>
    </div>
  );
};