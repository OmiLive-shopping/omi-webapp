import { useEffect } from 'react';
import { useSocketStore } from '@/stores/socket-store';

/**
 * Hook to establish an authenticated WebSocket connection
 * Automatically retrieves the Better Auth session token and connects
 */
export function useAuthenticatedSocket() {
  const { connect, isConnected } = useSocketStore();

  useEffect(() => {
    // Initialize socket connection with credentials
    // Cookies will be sent automatically with withCredentials: true
    if (!isConnected) {
      connect();
    }
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
      // Just connect - cookies will be sent automatically
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