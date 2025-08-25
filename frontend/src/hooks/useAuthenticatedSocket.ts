import { useEffect } from 'react';
import { useSocketStore } from '@/stores/socket-store';
import { getSession } from '@/lib/auth-client';
import { extractSessionToken } from '@/utils/auth-helpers';

/**
 * Hook to establish an authenticated WebSocket connection
 * Automatically retrieves the Better Auth session token and connects
 */
export function useAuthenticatedSocket() {
  const { connect, isConnected } = useSocketStore();

  useEffect(() => {
    let mounted = true;

    const initSocket = async () => {
      try {
        // Get the current session from Better Auth
        const sessionResponse = await getSession();
        
        if (!mounted) return;
        
        // Extract token using the proper type-safe helper
        const token = extractSessionToken(sessionResponse);
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
      const sessionResponse = await getSession();
      console.log('Session retrieved:', sessionResponse); // Debug log
      
      // Extract token using the proper type-safe helper
      const token = extractSessionToken(sessionResponse);
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
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