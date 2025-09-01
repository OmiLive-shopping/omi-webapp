import { create } from 'zustand';
import { socketManager, StreamStatus } from '@/lib/socket';
import { ChatMessage } from '@/types/chat';
import { useChatStore } from './chat-store';

interface SocketState {
  isConnected: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  messages: ChatMessage[];
  viewerCount: number;
  streamStatus: StreamStatus;
  
  // Actions
  connect: () => void;
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

let listenersSetup = false;

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  connectionError: null,
  reconnectAttempts: 0,
  messages: [],
  viewerCount: 0,
  streamStatus: {
    isLive: false,
  },

  connect: () => {
    // Check if already connected to prevent duplicate connections
    if (get().isConnected) {
      return;
    }
    
    // Check if socket manager is already connected
    if (socketManager.isConnected()) {
      set({ isConnected: true });
      if (!listenersSetup) {
        setupEventListeners();
      }
      return;
    }
    
    // Don't pass token - cookies will be sent with withCredentials
    const socket = socketManager.connect();
    
    // Ensure socket exists
    if (!socket) {
      console.warn('[SocketStore] Socket is null, cannot proceed');
      return;
    }

    // Setup internal connection event handlers
    setupInternalEventHandlers();
  },

  disconnect: () => {
    socketManager.disconnect();
    listenersSetup = false;
    set({ 
      isConnected: false, 
      connectionError: null,
      messages: [],
      viewerCount: 0,
      streamStatus: { isLive: false }
    });
  },

  sendMessage: (message: string) => {
    console.log('Socket store sendMessage - needs streamId!');
    // This will be called from components that should provide streamId
  },

  joinStream: (streamId: string) => {
    socketManager.emit('stream:join', { streamId });
  },

  leaveStream: (streamId: string) => {
    socketManager.emit('stream:leave', { streamId });
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message].slice(-100)
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

// Setup event listeners function - called after socket connects
function setupEventListeners() {
  if (listenersSetup) {
    return;
  }

  listenersSetup = true;

  socketManager.on('chat:message', (message) => {
    useSocketStore.getState().addMessage(message);
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
    useChatStore.getState().addVdoSystemMessage(message);
  });

  // Stream integration system messages
  socketManager.on('chat:system-message', (message) => {
    useChatStore.getState().addStreamSystemMessage(message);
  });

  // VDO.Ninja stream events
  socketManager.on('vdo:stream:live', (data) => {
    console.log('VDO stream event:', data);
  });

  // VDO.Ninja viewer events
  socketManager.on('vdo:viewer:joined', (data) => {
    const { setViewerCount } = useSocketStore.getState();
    setViewerCount(data.viewerCount || useSocketStore.getState().viewerCount + 1);
  });

  socketManager.on('vdo:viewer:left', (data) => {
    const { setViewerCount } = useSocketStore.getState();
    setViewerCount(data.viewerCount || Math.max(0, useSocketStore.getState().viewerCount - 1));
  });

  // VDO.Ninja quality events
  socketManager.on('vdo:quality:changed', (data) => {
    console.log('VDO quality changed:', data.quality);
  });

  socketManager.on('vdo:quality:warning', (data) => {
    console.warn('VDO quality warning:', data.message);
  });

  socketManager.on('stream:viewer-count', (count) => {
    useSocketStore.getState().setViewerCount(count);
  });

  socketManager.on('stream:status', (status) => {
    useSocketStore.getState().setStreamStatus(status);
  });

  socketManager.on('stream:error', (error) => {
    useSocketStore.setState({ connectionError: error });
  });
  
  // Stream lifecycle events handled by StreamSocketIntegration
  
  socketManager.on('stream:ended', (data) => {
    console.log('Stream ended:', data);
    const currentState = useSocketStore.getState();
    if (currentState.streamStatus.streamId === data.streamId) {
      currentState.setStreamStatus({ isLive: false });
    }
  });
  
  socketManager.on('stream:offline', (data) => {
    console.log('Stream went offline:', data);
  });
}

// Setup internal connection event handlers
function setupInternalEventHandlers() {
  // Setup listeners when socket connects
  socketManager.onInternal('connection:established', () => {
    useSocketStore.setState({ isConnected: true, connectionError: null, reconnectAttempts: 0 });
    setupEventListeners();
  });

  socketManager.onInternal('connection:lost', ({ reason }: { reason: string }) => {
    useSocketStore.setState({ isConnected: false, connectionError: reason });
  });

  socketManager.onInternal('connection:failed', ({ error, attempts }: { error: string; attempts: number }) => {
    useSocketStore.setState({ 
      isConnected: false, 
      connectionError: error, 
      reconnectAttempts: attempts 
    });
  });
}