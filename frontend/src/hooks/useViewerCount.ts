import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseViewerCountOptions {
  socketUrl?: string;
  roomId?: string;
  initialCount?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface ViewerCountData {
  count: number;
  trend: 'up' | 'down' | 'stable';
  isConnected: boolean;
  error: Error | null;
}

export const useViewerCount = ({
  socketUrl = '',
  roomId,
  initialCount = 0,
  onConnect,
  onDisconnect,
  onError
}: UseViewerCountOptions = {}): ViewerCountData => {
  const [count, setCount] = useState(initialCount);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const socketRef = useRef<Socket | null>(null);

  // Calculate trend
  const calculateTrend = useCallback((newCount: number, oldCount: number) => {
    if (newCount > oldCount) return 'up';
    if (newCount < oldCount) return 'down';
    return 'stable';
  }, []);

  useEffect(() => {
    if (!socketUrl) return;

    try {
      // Initialize socket connection
      const socket = io(socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        setIsConnected(true);
        setError(null);
        onConnect?.();

        // Join room if specified
        if (roomId) {
          socket.emit('join-room', { roomId });
        }
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        onDisconnect?.();
      });

      socket.on('connect_error', (err) => {
        const error = new Error(`Socket connection error: ${err.message}`);
        setError(error);
        onError?.(error);
      });

      // Viewer count events
      socket.on('viewer-count', (data: { count: number }) => {
        setCount(prevCount => {
          const newCount = data.count;
          setTrend(calculateTrend(newCount, prevCount));
          return newCount;
        });
      });

      socket.on('viewer-joined', () => {
        setCount(prev => {
          const newCount = prev + 1;
          setTrend('up');
          return newCount;
        });
      });

      socket.on('viewer-left', () => {
        setCount(prev => {
          const newCount = Math.max(0, prev - 1);
          setTrend('down');
          return newCount;
        });
      });

      // Initial viewer count request
      socket.emit('get-viewer-count', { roomId });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to connect to socket');
      setError(error);
      onError?.(error);
    }

    // Cleanup
    return () => {
      if (socketRef.current) {
        if (roomId) {
          socketRef.current.emit('leave-room', { roomId });
        }
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [socketUrl, roomId, onConnect, onDisconnect, onError, calculateTrend, count]);

  return {
    count,
    trend,
    isConnected,
    error
  };
};

// Hook for using viewer count in stream context
export const useStreamViewerCount = (streamId: string) => {
  const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
  
  return useViewerCount({
    socketUrl,
    roomId: `stream-${streamId}`,
    initialCount: 0,
    onConnect: () => console.log(`Connected to stream ${streamId}`),
    onDisconnect: () => console.log(`Disconnected from stream ${streamId}`),
    onError: (error) => console.error(`Stream ${streamId} error:`, error)
  });
};