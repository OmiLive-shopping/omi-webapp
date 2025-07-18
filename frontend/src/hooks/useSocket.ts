import { useEffect } from 'react';
import { socket } from '@/lib/socket';
import { useAppStore } from '@/stores/app.store';
import { useAuthStore } from '@/stores/auth.store';

export function useSocket() {
  const { token } = useAuthStore();
  const { chat } = useAppStore();

  useEffect(() => {
    if (!token) {
      socket.disconnect();
      return;
    }

    socket.auth = { token };
    socket.connect();

    socket.on('connect', () => {
      chat.setConnected(true);
    });

    socket.on('disconnect', () => {
      chat.setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.disconnect();
    };
  }, [token, chat]);

  return { socket, isConnected: chat.isConnected };
}