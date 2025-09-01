import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { enhancedSocketManager, type StreamStatus } from '@/lib/enhanced-socket-manager';
import { type ConnectionMetrics, type ConnectionQuality } from '@/lib/connection-health-monitor';
import { type ChatMessage } from '@/types/chat';
import { useChatStore } from './chat-store';
import { authClient } from '@/lib/auth-client';

/**
 * Enhanced Socket Store with connection health monitoring
 */
interface EnhancedSocketState {
  // Connection status
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  
  // Connection health
  connectionQuality: ConnectionQuality;
  connectionMetrics: ConnectionMetrics | null;
  isConnectionHealthy: boolean;
  
  // Stream data
  messages: ChatMessage[];
  viewerCount: number;
  streamStatus: StreamStatus;
  
  // Token management
  currentToken: string | null;
  tokenRefreshError: string | null;
  
  // Actions
  connect: (token?: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  sendMessage: (streamId: string, message: string, replyTo?: string) => void;
  joinStream: (streamId: string) => void;
  leaveStream: (streamId: string) => void;
  clearMessages: () => void;
  addMessage: (message: ChatMessage) => void;
  setViewerCount: (count: number) => void;
  setStreamStatus: (status: StreamStatus) => void;
  
  // Internal setters (called by event listeners)
  setConnectionStatus: (isConnected: boolean, isReconnecting?: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setConnectionHealth: (quality: ConnectionQuality, metrics: ConnectionMetrics, isHealthy: boolean) => void;
  setTokenInfo: (token: string | null, error?: string | null) => void;
}

export const useEnhancedSocketStore = create<EnhancedSocketState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isConnected: false,
    isReconnecting: false,
    connectionError: null,
    reconnectAttempts: 0,
    connectionQuality: 'good',
    connectionMetrics: null,
    isConnectionHealthy: true,
    messages: [],
    viewerCount: 0,
    streamStatus: { isLive: false },
    currentToken: null,
    tokenRefreshError: null,

    connect: async (token?: string) => {
      // Get token from auth if not provided
      let authToken = token;
      if (!authToken) {
        try {
          const session = await authClient.getSession();
          authToken = session?.token || undefined;
        } catch (error) {
          console.warn('Failed to get auth token:', error);
        }
      }

      set({ currentToken: authToken || null });

      // Connect using enhanced socket manager
      enhancedSocketManager.connect(undefined, authToken);
      
      // Set up event listeners
      setupEventListeners(set, get);
    },

    disconnect: () => {
      enhancedSocketManager.disconnect();
      set({ 
        isConnected: false,
        isReconnecting: false,
        connectionError: null,
        messages: [],
        viewerCount: 0,
        streamStatus: { isLive: false },
        currentToken: null,
      });
    },

    reconnect: () => {
      enhancedSocketManager.forceReconnect();
    },

    sendMessage: (streamId: string, message: string, replyTo?: string) => {
      enhancedSocketManager.emit('chat:send-message', {
        streamId,
        content: message,
        replyTo,
      });
    },

    joinStream: (streamId: string) => {
      enhancedSocketManager.emit('stream:join', { streamId });
    },

    leaveStream: (streamId: string) => {
      enhancedSocketManager.emit('stream:leave', { streamId });
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

    setConnectionStatus: (isConnected: boolean, isReconnecting = false) => {
      set({ isConnected, isReconnecting });
    },

    setConnectionError: (error: string | null) => {
      set({ connectionError: error });
    },

    setConnectionHealth: (quality: ConnectionQuality, metrics: ConnectionMetrics, isHealthy: boolean) => {
      set({ 
        connectionQuality: quality,
        connectionMetrics: metrics,
        isConnectionHealthy: isHealthy,
      });
    },

    setTokenInfo: (token: string | null, error: string | null = null) => {
      set({ 
        currentToken: token,
        tokenRefreshError: error,
      });
    },
  }))
);

/**
 * Set up event listeners for enhanced socket manager
 */
function setupEventListeners(
  set: (partial: Partial<EnhancedSocketState>) => void,
  get: () => EnhancedSocketState
) {
  // Connection events
  enhancedSocketManager.onInternal('connection:established', (data) => {
    console.log('Enhanced socket connected:', data.socketId);
    set({ 
      isConnected: true, 
      isReconnecting: false,
      connectionError: null, 
      reconnectAttempts: 0 
    });
  });

  enhancedSocketManager.onInternal('connection:lost', (data) => {
    console.log('Enhanced socket disconnected:', data.reason);
    set({ 
      isConnected: false, 
      connectionError: data.reason 
    });
  });

  enhancedSocketManager.onInternal('connection:failed', (data) => {
    console.error('Enhanced socket connection failed:', data);
    set({ 
      isConnected: false, 
      isReconnecting: false,
      connectionError: data.error, 
      reconnectAttempts: data.attempts 
    });
  });

  enhancedSocketManager.onInternal('reconnect:started', (data) => {
    console.log(`Reconnection attempt ${data.attempt} starting in ${data.delay}ms`);
    set({ 
      isReconnecting: true,
      reconnectAttempts: data.attempt,
    });
  });

  enhancedSocketManager.onInternal('reconnect:success', (data) => {
    console.log(`Reconnection successful after ${data.attempt} attempts in ${data.totalTime}ms`);
    set({ 
      isConnected: true,
      isReconnecting: false,
      connectionError: null,
    });
  });

  // Health monitoring events
  enhancedSocketManager.onInternal('health:quality-changed', (quality, metrics) => {
    const isHealthy = enhancedSocketManager.isConnectionHealthy();
    set({
      connectionQuality: quality,
      connectionMetrics: metrics,
      isConnectionHealthy: isHealthy,
    });
  });

  enhancedSocketManager.onInternal('health:metrics-updated', (metrics) => {
    const quality = enhancedSocketManager.getConnectionQuality();
    const isHealthy = enhancedSocketManager.isConnectionHealthy();
    set({
      connectionQuality: quality,
      connectionMetrics: metrics,
      isConnectionHealthy: isHealthy,
    });
  });

  enhancedSocketManager.onInternal('health:connection-unstable', (metrics) => {
    console.warn('Connection is unstable:', metrics);
    // Could show a notification to user
  });

  enhancedSocketManager.onInternal('health:latency-spike', (latency, threshold) => {
    console.warn(`Latency spike detected: ${latency}ms (threshold: ${threshold}ms)`);
    // Could show a temporary warning
  });

  // Token management events
  enhancedSocketManager.onInternal('token:refreshed', (data) => {
    console.log('Token refreshed successfully');
    set({ 
      currentToken: data.newToken,
      tokenRefreshError: null,
    });
  });

  enhancedSocketManager.onInternal('token:refresh-failed', (data) => {
    console.error('Token refresh failed:', data.error);
    set({ 
      tokenRefreshError: data.error,
    });
  });

  // Chat events
  enhancedSocketManager.on('chat:message', (message) => {
    get().addMessage(message);
    
    // Also add to chat store for compatibility
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
  enhancedSocketManager.on('chat:system:message', (message) => {
    // Add to chat store as system message
    useChatStore.getState().addVdoSystemMessage(message);
  });

  // Stream integration system messages
  enhancedSocketManager.on('chat:system-message', (message) => {
    // Add to chat store as stream system message
    useChatStore.getState().addStreamSystemMessage(message);
  });

  // Stream events
  enhancedSocketManager.on('stream:viewer-count', (count) => {
    get().setViewerCount(count);
  });

  enhancedSocketManager.on('stream:status', (status) => {
    get().setStreamStatus(status);
  });

  enhancedSocketManager.on('stream:error', (error) => {
    set({ connectionError: error });
  });

  // Stream lifecycle events
  enhancedSocketManager.on('stream:started', (data) => {
    console.log('Stream started:', data);
    get().setStreamStatus({ 
      isLive: true, 
      streamId: data.streamId, 
      startedAt: data.timestamp 
    });
  });

  enhancedSocketManager.on('stream:live', (data) => {
    console.log('Stream went live:', data);
  });

  enhancedSocketManager.on('stream:ended', (data) => {
    console.log('Stream ended:', data);
    if (get().streamStatus.streamId === data.streamId) {
      get().setStreamStatus({ isLive: false });
    }
  });

  enhancedSocketManager.on('stream:offline', (data) => {
    console.log('Stream went offline:', data);
  });

  // VDO.Ninja events
  enhancedSocketManager.on('vdo:stream:live', (data) => {
    console.log('VDO stream event:', data);
  });

  enhancedSocketManager.on('vdo:viewer:joined', (data) => {
    get().setViewerCount(data.viewerCount || get().viewerCount + 1);
  });

  enhancedSocketManager.on('vdo:viewer:left', (data) => {
    get().setViewerCount(data.viewerCount || Math.max(0, get().viewerCount - 1));
  });

  enhancedSocketManager.on('vdo:quality:changed', (data) => {
    console.log('VDO quality changed:', data.quality);
  });

  enhancedSocketManager.on('vdo:quality:warning', (data) => {
    console.warn('VDO quality warning:', data.message);
  });

  // Rate limiting events
  enhancedSocketManager.on('rate_limit_exceeded', (data) => {
    console.warn('Rate limit exceeded:', data);
    // Could show user notification about rate limiting
  });

  enhancedSocketManager.on('rate_limit_status', (data) => {
    console.log('Rate limit status:', data);
    // Could update UI with remaining rate limit info
  });
}

// Selector hooks for common use cases
export const useConnectionStatus = () => useEnhancedSocketStore((state) => ({
  isConnected: state.isConnected,
  isReconnecting: state.isReconnecting,
  connectionError: state.connectionError,
  reconnectAttempts: state.reconnectAttempts,
}));

export const useConnectionHealth = () => useEnhancedSocketStore((state) => ({
  quality: state.connectionQuality,
  metrics: state.connectionMetrics,
  isHealthy: state.isConnectionHealthy,
}));

export const useStreamData = () => useEnhancedSocketStore((state) => ({
  messages: state.messages,
  viewerCount: state.viewerCount,
  streamStatus: state.streamStatus,
}));

export const useSocketActions = () => useEnhancedSocketStore((state) => ({
  connect: state.connect,
  disconnect: state.disconnect,
  reconnect: state.reconnect,
  sendMessage: state.sendMessage,
  joinStream: state.joinStream,
  leaveStream: state.leaveStream,
}));
