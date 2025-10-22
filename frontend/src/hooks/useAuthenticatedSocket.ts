import { useEffect } from 'react';
import { useSocketStore } from '@/stores/socket-store';
import { socketManager } from '@/lib/socket';

/**
 * Hook to establish an authenticated WebSocket connection
 * Automatically retrieves the Better Auth session token and connects
 */
export function useAuthenticatedSocket() {
  const { connect, isConnected } = useSocketStore();

  useEffect(() => {
    let isComponentMounted = true;
    
    // Add a small delay to handle React StrictMode double mounting
    const timer = setTimeout(() => {
      // Only proceed if component is still mounted and not connected
      if (isComponentMounted && !isConnected && !socketManager.isConnected()) {
        try {
          connect();
        } catch (error) {
          console.error('[useAuthenticatedSocket] Error calling connect:', error);
        }
      }
    }, 100);
    
    return () => {
      isComponentMounted = false;
      clearTimeout(timer);
    };
  }, []); // Only run once on mount
  return { isConnected };
}

/**
 * Hook to ensure socket is connected with authentication before streaming
 * Used specifically for streamer components that require authentication
 */
export function useStreamSocket() {
  const { connect, disconnect, isConnected } = useSocketStore();

  const connectWithAuth = async () => {
    try {
      // Connect with Bearer token authentication
      connect();
      return true;
    } catch (error) {
      console.error('Failed to connect with authentication:', error);
      return false;
    }
  };

  return {
    isConnected,
    connectWithAuth,
    disconnect
  };
}