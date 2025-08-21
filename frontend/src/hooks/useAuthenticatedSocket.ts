import { useEffect } from 'react';
import { useSocketStore } from '@/stores/socket-store';
import { getSession } from '@/lib/auth-client';

/**
 * Hook to establish an authenticated WebSocket connection
 * Automatically retrieves the Better Auth session token and connects
 */
export function useAuthenticatedSocket() {
  const { connect, disconnect, isConnected } = useSocketStore();

  useEffect(() => {
    let mounted = true;

    const initSocket = async () => {
      try {
        // Get the current session from Better Auth
        const session = await getSession();
        
        if (!mounted) return;
        
        // Connect with the session token if available
        // If no token, connection will be anonymous (for viewers)
        const token = session?.session?.token || session?.token;
        connect(token);
      } catch (error) {
        console.error('Failed to initialize authenticated socket:', error);
        // Connect as anonymous if session retrieval fails
        if (mounted) {
          connect();
        }
      }
    };

    // Initialize socket connection
    if (!isConnected) {
      initSocket();
    }

    // Cleanup on unmount
    return () => {
      mounted = false;
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
      const session = await getSession();
      
      if (!session?.session?.token && !session?.token) {
        throw new Error('No authentication token available');
      }
      
      const token = session.session?.token || session.token;
      connect(token);
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