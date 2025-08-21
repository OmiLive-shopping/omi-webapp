import { io, Socket } from 'socket.io-client';

export interface ServerToClientEvents {
  'chat:message': (message: ChatMessage) => void;
  'chat:system:message': (message: VdoSystemMessage) => void;
  'stream:viewer-count': (count: number) => void;
  'stream:status': (status: StreamStatus) => void;
  'stream:error': (error: string) => void;
  // Stream lifecycle events
  'stream:started': (data: { streamId: string; title: string; vdoRoomId?: string; timestamp: string }) => void;
  'stream:live': (data: { streamId: string; title: string; streamer: any; isLive: boolean; startedAt?: string }) => void;
  'stream:ended': (data: { streamId: string; endedAt?: string; message: string }) => void;
  'stream:offline': (data: { streamId: string }) => void;
  // VDO.Ninja events
  'vdo:stream:live': (data: any) => void;
  'vdo:viewer:joined': (data: { viewerCount?: number; viewer?: any }) => void;
  'vdo:viewer:left': (data: { viewerCount?: number; viewer?: any }) => void;
  'vdo:quality:changed': (data: { quality: any }) => void;
  'vdo:quality:warning': (data: { message: string; quality?: any }) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
}

export interface ClientToServerEvents {
  'chat:send': (message: string) => void;
  'stream:join': (streamId: string) => void;
  'stream:leave': (streamId: string) => void;
}

export interface ChatMessage {
  id: string;
  username: string;
  message?: string; // Optional for compatibility
  content?: string; // New field name
  timestamp: string;
  userId: string;
  type?: 'message' | 'announcement' | 'donation' | 'subscription' | 'system';
  role?: string;
  avatarUrl?: string | null;
  metadata?: Record<string, any>;
}

export interface VdoSystemMessage {
  id: string;
  content: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  timestamp: Date | string;
  type: 'system';
  subType?: 'stream' | 'viewer' | 'quality' | 'error';
  metadata?: any;
}

export interface StreamStatus {
  isLive: boolean;
  streamId?: string;
  startedAt?: string;
  viewerCount?: number;
}

class SocketManager {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(url: string = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', token?: string) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.socket = io(url, {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      withCredentials: true,
      auth: token ? { token } : undefined,
    });

    this.setupBaseListeners();
    return this.socket;
  }

  private setupBaseListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.emitInternal('connection:established', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.emitInternal('connection:lost', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emitInternal('connection:failed', { 
          error: error.message,
          attempts: this.reconnectAttempts 
        });
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  on<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ) {
    if (!this.socket) {
      console.warn('Socket not initialized. Call connect() first.');
      return;
    }

    this.socket.on(event, callback as any);
  }

  off<K extends keyof ServerToClientEvents>(
    event: K,
    callback?: ServerToClientEvents[K]
  ) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback as any);
    } else {
      this.socket.off(event);
    }
  }

  emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected. Message not sent:', event);
      return;
    }

    this.socket.emit(event, ...args);
  }

  // Custom event emitter for internal events
  private emitInternal(event: string, data?: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  onInternal(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  offInternal(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(callback);
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const socketManager = new SocketManager();