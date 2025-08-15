import { create } from 'zustand';
import { socketManager, ChatMessage, StreamStatus } from '@/lib/socket';
import { useChatStore } from './chat-store';

interface SocketState {
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  messages: ChatMessage[];
  viewerCount: number;
  streamStatus: StreamStatus;
  
  // Actions
  connect: (token?: string) => void;
  disconnect: () => void;
  sendMessage: (message: string) => void;
  joinStream: (streamId: string) => void;
  leaveStream: (streamId: string) => void;
  clearMessages: () => void;
  addMessage: (message: ChatMessage) => void;
  setViewerCount: (count: number) => void;
  setStreamStatus: (status: StreamStatus) => void;
  setConnectionStatus: (isConnected: boolean) => void;
  setConnectionError: (error: string | null) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  connectionError: null,
  reconnectAttempts: 0,
  messages: [],
  viewerCount: 0,
  streamStatus: {
    isLive: false,
  },

  connect: (token?: string) => {
    socketManager.connect(undefined, token);
    
    // Setup event listeners
    socketManager.on('chat:message', (message) => {
      get().addMessage(message);
      // Also add to chat store
      useChatStore.getState().addMessage({
        userId: message.userId,
        username: message.username,
        content: message.content || message.message || '',
        type: message.type || 'message',
        isPinned: false,
        isDeleted: false,
        role: message.role,
        avatarUrl: message.avatarUrl,
        metadata: message.metadata,
      });
    });

    // VDO.Ninja system messages
    socketManager.on('chat:system:message', (message) => {
      // Add to chat store as system message
      useChatStore.getState().addVdoSystemMessage(message);
    });

    // VDO.Ninja stream events
    socketManager.on('vdo:stream:live', (data) => {
      console.log('VDO stream event:', data);
    });

    // VDO.Ninja viewer events
    socketManager.on('vdo:viewer:joined', (data) => {
      get().setViewerCount(data.viewerCount || get().viewerCount + 1);
    });

    socketManager.on('vdo:viewer:left', (data) => {
      get().setViewerCount(data.viewerCount || Math.max(0, get().viewerCount - 1));
    });

    // VDO.Ninja quality events
    socketManager.on('vdo:quality:changed', (data) => {
      console.log('VDO quality changed:', data.quality);
    });

    socketManager.on('vdo:quality:warning', (data) => {
      console.warn('VDO quality warning:', data.message);
    });

    socketManager.on('stream:viewer-count', (count) => {
      get().setViewerCount(count);
    });

    socketManager.on('stream:status', (status) => {
      get().setStreamStatus(status);
    });

    socketManager.on('stream:error', (error) => {
      set({ connectionError: error });
    });

    // Internal connection events
    socketManager.onInternal('connection:established', () => {
      set({ isConnected: true, connectionError: null, reconnectAttempts: 0 });
    });

    socketManager.onInternal('connection:lost', ({ reason }: { reason: string }) => {
      set({ isConnected: false, connectionError: reason });
    });

    socketManager.onInternal('connection:failed', ({ error, attempts }: { error: string; attempts: number }) => {
      set({ 
        isConnected: false, 
        connectionError: error, 
        reconnectAttempts: attempts 
      });
    });
  },

  disconnect: () => {
    socketManager.disconnect();
    set({ 
      isConnected: false, 
      connectionError: null,
      messages: [],
      viewerCount: 0,
      streamStatus: { isLive: false }
    });
  },

  sendMessage: (message: string) => {
    socketManager.emit('chat:send', message);
  },

  joinStream: (streamId: string) => {
    socketManager.emit('stream:join', streamId);
  },

  leaveStream: (streamId: string) => {
    socketManager.emit('stream:leave', streamId);
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message].slice(-100) // Keep last 100 messages
    }));
  },

  setViewerCount: (count: number) => {
    set({ viewerCount: count });
  },

  setStreamStatus: (status: StreamStatus) => {
    set({ streamStatus: status });
  },

  setConnectionStatus: (isConnected: boolean) => {
    set({ isConnected });
  },

  setConnectionError: (error: string | null) => {
    set({ connectionError: error });
  },
}));