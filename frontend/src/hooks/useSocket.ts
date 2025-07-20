import { useEffect } from 'react';
import { useSocketStore } from '@/stores/socket-store';
import { useAuthStore } from '@/stores/auth.store';

interface UseSocketOptions {
  autoConnect?: boolean;
  streamId?: string;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true, streamId } = options;
  const { token } = useAuthStore();
  
  const {
    isConnected,
    connectionError,
    messages,
    viewerCount,
    streamStatus,
    connect,
    disconnect,
    sendMessage,
    joinStream,
    leaveStream,
    clearMessages,
  } = useSocketStore();

  useEffect(() => {
    if (autoConnect && token) {
      connect(token);
    } else if (!token) {
      disconnect();
    }

    return () => {
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, token, connect, disconnect]);

  useEffect(() => {
    if (isConnected && streamId) {
      joinStream(streamId);
      
      return () => {
        leaveStream(streamId);
      };
    }
  }, [isConnected, streamId, joinStream, leaveStream]);

  return {
    isConnected,
    connectionError,
    messages,
    viewerCount,
    streamStatus,
    sendMessage,
    clearMessages,
    connect,
    disconnect,
  };
}