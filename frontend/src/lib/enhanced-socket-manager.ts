import { io, Socket } from 'socket.io-client';
import { ConnectionHealthMonitor, type ConnectionMetrics, type ConnectionQuality, type HealthEvents } from './connection-health-monitor';
import { authClient } from './auth-client';

/**
 * Enhanced Socket Manager with connection health monitoring and auto-recovery
 */

export interface ServerToClientEvents {
  'chat:message': (message: ChatMessage) => void;
  'chat:system:message': (message: VdoSystemMessage) => void;
  'chat:system-message': (message: any) => void;
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
  // Rate limiting
  'rate_limit_exceeded': (data: { eventType: string; reason: string; retryAfter: number; resetTime: number }) => void;
  'rate_limit_status': (data: { eventType: string; remaining: number; resetTime: number; isBlocked: boolean }) => void;
  // Connection health
  'pong': (timestamp: number) => void;
  'connection:health': (metrics: ConnectionMetrics) => void;
  // Standard socket.io events
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
  reconnect: (attempt: number) => void;
  reconnect_attempt: (attempt: number) => void;
  reconnect_error: (error: Error) => void;
  reconnect_failed: () => void;
}

export interface ClientToServerEvents {
  'chat:send-message': (data: { streamId: string; content: string; replyTo?: string }) => void;
  'stream:join': (data: { streamId: string }) => void;
  'stream:leave': (data: { streamId: string }) => void;
  'ping': (timestamp: number) => void;
  'connection:ping': (timestamp: number) => void;
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

/**
 * Reconnection strategy configuration
 */
export interface ReconnectConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryOnRateLimit: boolean;
}

/**
 * Enhanced socket manager events
 */
export interface EnhancedSocketEvents extends HealthEvents {
  'connection:established': (data: { socketId: string; connectionTime: number }) => void;
  'connection:lost': (data: { reason: string; wasHealthy: boolean }) => void;
  'connection:failed': (data: { error: string; attempts: number; finalFailure: boolean }) => void;
  'reconnect:started': (data: { attempt: number; delay: number }) => void;
  'reconnect:success': (data: { attempt: number; totalTime: number }) => void;
  'token:refreshed': (data: { newToken: string }) => void;
  'token:refresh-failed': (data: { error: string }) => void;
}

export class EnhancedSocketManager {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private healthMonitor: ConnectionHealthMonitor;
  private reconnectConfig: ReconnectConfig;
  private listeners: Map<string, Set<Function>> = new Map();
  private currentUrl: string = '';
  private currentToken: string | null = null;
  private isManualDisconnect: boolean = false;
  private reconnectTimeouts: NodeJS.Timeout[] = [];
  private connectionAttemptStartTime: number = 0;
  private lastConnectionTime: number = 0;

  // Default reconnection configuration
  private static readonly DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
    maxAttempts: 10,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffFactor: 1.5,
    jitter: true,
    retryOnRateLimit: false,
  };

  constructor(reconnectConfig: Partial<ReconnectConfig> = {}) {
    this.reconnectConfig = { ...EnhancedSocketManager.DEFAULT_RECONNECT_CONFIG, ...reconnectConfig };
    this.healthMonitor = new ConnectionHealthMonitor();
    this.setupHealthMonitorListeners();
  }

  /**
   * Connect to the socket server
   */
  public connect(url: string = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', token?: string): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    this.currentUrl = url;
    this.currentToken = token || null;
    this.isManualDisconnect = false;
    this.connectionAttemptStartTime = Date.now();

    this.socket = io(url, {
      reconnection: false, // We handle reconnection manually
      timeout: 20000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      withCredentials: true,
      auth: token ? { token } : undefined,
    });

    this.setupSocketListeners();
    this.healthMonitor.monitor(this.socket);

    return this.socket;
  }

  /**
   * Manually disconnect the socket
   */
  public disconnect(): void {
    this.isManualDisconnect = true;
    this.clearReconnectTimeouts();
    this.healthMonitor.stop();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.listeners.clear();
  }

  /**
   * Get current connection metrics
   */
  public getConnectionMetrics(): ConnectionMetrics {
    return this.healthMonitor.getMetrics();
  }

  /**
   * Get current connection quality
   */
  public getConnectionQuality(): ConnectionQuality {
    return this.healthMonitor.getQuality();
  }

  /**
   * Check if connection is healthy
   */
  public isConnectionHealthy(): boolean {
    return this.healthMonitor.isHealthy();
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the socket instance
   */
  public getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
    return this.socket;
  }

  /**
   * Add event listener for socket events
   */
  public on<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ): void {
    if (!this.socket) {
      console.warn('Socket not initialized. Call connect() first.');
      return;
    }

    this.socket.on(event, callback as any);
  }

  /**
   * Remove event listener for socket events
   */
  public off<K extends keyof ServerToClientEvents>(
    event: K,
    callback?: ServerToClientEvents[K]
  ): void {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback as any);
    } else {
      this.socket.off(event);
    }
  }

  /**
   * Emit event to server
   */
  public emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected. Message not sent:', event);
      return;
    }

    this.socket.emit(event, ...args);
  }

  /**
   * Add listener for enhanced socket events (internal events)
   */
  public onInternal<K extends keyof EnhancedSocketEvents>(
    event: K,
    callback: EnhancedSocketEvents[K]
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove listener for enhanced socket events
   */
  public offInternal<K extends keyof EnhancedSocketEvents>(
    event: K,
    callback?: EnhancedSocketEvents[K]
  ): void {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(callback);
    }
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      const connectionTime = Date.now() - this.connectionAttemptStartTime;
      this.lastConnectionTime = Date.now();
      
      console.log('Socket connected:', this.socket?.id);
      this.emitInternal('connection:established', { 
        socketId: this.socket?.id || '', 
        connectionTime 
      });

      // Reset health monitor for new connection
      this.healthMonitor.resetMetrics();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      const wasHealthy = this.healthMonitor.isHealthy();
      
      this.emitInternal('connection:lost', { reason, wasHealthy });

      // Start reconnection if not manual disconnect
      if (!this.isManualDisconnect) {
        this.startReconnection(reason);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      this.handleConnectionError(error);
    });

    // Handle rate limiting
    this.socket.on('rate_limit_exceeded', (data) => {
      console.warn('Rate limit exceeded:', data);
      
      // Delay next reconnection if rate limited
      if (this.reconnectConfig.retryOnRateLimit) {
        setTimeout(() => {
          if (!this.socket?.connected && !this.isManualDisconnect) {
            this.attemptReconnection(0);
          }
        }, data.retryAfter * 1000);
      }
    });

    // Handle server ping responses
    this.socket.on('pong', (timestamp) => {
      // Health monitor handles this automatically
    });
  }

  /**
   * Setup health monitor event listeners
   */
  private setupHealthMonitorListeners(): void {
    this.healthMonitor.on('health:quality-changed', (quality, metrics) => {
      this.emitInternal('health:quality-changed', quality, metrics);
    });

    this.healthMonitor.on('health:latency-spike', (latency, threshold) => {
      this.emitInternal('health:latency-spike', latency, threshold);
    });

    this.healthMonitor.on('health:connection-unstable', (metrics) => {
      this.emitInternal('health:connection-unstable', metrics);
      
      // Consider preemptive reconnection for very poor connections
      if (metrics.quality === 'critical' && metrics.consecutiveFailures > 5) {
        console.warn('Connection critically unstable, attempting reconnection');
        this.socket?.disconnect();
      }
    });

    this.healthMonitor.on('health:metrics-updated', (metrics) => {
      this.emitInternal('health:metrics-updated', metrics);
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    const metrics = this.healthMonitor.getMetrics();
    metrics.reconnectAttempts++;

    if (metrics.reconnectAttempts >= this.reconnectConfig.maxAttempts) {
      this.emitInternal('connection:failed', { 
        error: error.message,
        attempts: metrics.reconnectAttempts,
        finalFailure: true
      });
    } else if (!this.isManualDisconnect) {
      this.startReconnection(error.message);
    }
  }

  /**
   * Start reconnection process
   */
  private startReconnection(reason: string): void {
    if (this.isManualDisconnect) return;

    const metrics = this.healthMonitor.getMetrics();
    const attempt = metrics.reconnectAttempts + 1;

    if (attempt > this.reconnectConfig.maxAttempts) {
      this.emitInternal('connection:failed', { 
        error: reason,
        attempts: attempt,
        finalFailure: true
      });
      return;
    }

    const delay = this.calculateBackoffDelay(attempt);
    
    this.emitInternal('reconnect:started', { attempt, delay });

    const timeout = setTimeout(() => {
      this.attemptReconnection(attempt);
    }, delay);

    this.reconnectTimeouts.push(timeout);
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.reconnectConfig.baseDelay * Math.pow(this.reconnectConfig.backoffFactor, attempt - 1),
      this.reconnectConfig.maxDelay
    );

    if (this.reconnectConfig.jitter) {
      // Add ±25% jitter to prevent thundering herd
      const jitterRange = exponentialDelay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(100, exponentialDelay + jitter); // Minimum 100ms
    }

    return exponentialDelay;
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnection(attempt: number): Promise<void> {
    if (this.isManualDisconnect) return;

    console.log(`Attempting reconnection ${attempt}/${this.reconnectConfig.maxAttempts}`);

    try {
      // Try to refresh token before reconnecting
      await this.refreshTokenIfNeeded();

      // Disconnect existing socket if still connected
      if (this.socket) {
        this.socket.disconnect();
      }

      // Create new connection
      this.connectionAttemptStartTime = Date.now();
      this.connect(this.currentUrl, this.currentToken);

      // Wait for connection result
      await this.waitForConnectionResult();

      if (this.socket?.connected) {
        const totalTime = Date.now() - this.connectionAttemptStartTime;
        this.emitInternal('reconnect:success', { attempt, totalTime });
        this.clearReconnectTimeouts();
      } else {
        throw new Error('Connection failed');
      }

    } catch (error) {
      console.error(`Reconnection attempt ${attempt} failed:`, error);
      
      const metrics = this.healthMonitor.getMetrics();
      metrics.reconnectAttempts = attempt;

      this.emitInternal('connection:failed', { 
        error: error instanceof Error ? error.message : String(error),
        attempts: attempt,
        finalFailure: false
      });

      // Try again if we haven't reached max attempts
      if (attempt < this.reconnectConfig.maxAttempts) {
        this.startReconnection('Reconnection failed');
      }
    }
  }

  /**
   * Wait for connection result with timeout
   */
  private waitForConnectionResult(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('No socket instance'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000); // 10 second timeout

      const onConnect = () => {
        clearTimeout(timeout);
        this.socket?.off('connect_error', onError);
        resolve();
      };

      const onError = (error: Error) => {
        clearTimeout(timeout);
        this.socket?.off('connect', onConnect);
        reject(error);
      };

      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onError);
    });
  }

  /**
   * Refresh authentication token if needed
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    if (!this.currentToken) return;

    try {
      // Check if token needs refresh (this depends on your auth implementation)
      const session = await authClient.getSession();
      
      if (session?.token && session.token !== this.currentToken) {
        this.currentToken = session.token;
        this.emitInternal('token:refreshed', { newToken: session.token });
        console.log('Token refreshed for reconnection');
      }
    } catch (error) {
      console.error('Failed to refresh token:', error);
      this.emitInternal('token:refresh-failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue with old token - the server will reject if it's invalid
    }
  }

  /**
   * Clear all reconnection timeouts
   */
  private clearReconnectTimeouts(): void {
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts = [];
  }

  /**
   * Emit internal event
   */
  private emitInternal<K extends keyof EnhancedSocketEvents>(
    event: K, 
    ...args: Parameters<EnhancedSocketEvents[K]>
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`Error in socket manager listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Force reconnection (useful for testing or manual recovery)
   */
  public forceReconnect(): void {
    if (this.socket) {
      console.log('Forcing reconnection...');
      this.socket.disconnect();
      // Reconnection will start automatically via disconnect handler
    }
  }

  /**
   * Update reconnection configuration
   */
  public updateReconnectConfig(config: Partial<ReconnectConfig>): void {
    this.reconnectConfig = { ...this.reconnectConfig, ...config };
  }

  /**
   * Get current reconnection configuration
   */
  public getReconnectConfig(): ReconnectConfig {
    return { ...this.reconnectConfig };
  }
}

// Export singleton instance
export const enhancedSocketManager = new EnhancedSocketManager();
