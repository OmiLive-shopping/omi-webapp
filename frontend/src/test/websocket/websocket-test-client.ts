import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/lib/enhanced-socket-manager';

/**
 * Test client for WebSocket integration testing
 */
export class WebSocketTestClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private eventLog: Array<{ event: string; data: any; timestamp: Date }> = [];
  private isConnected = false;

  constructor(private serverUrl: string) {}

  /**
   * Connect to the test server
   */
  public async connect(options?: {
    auth?: { token?: string; userId?: string; username?: string; role?: string };
    timeout?: number;
  }): Promise<void> {
    const { auth, timeout = 5000 } = options || {};

    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket'],
        autoConnect: true,
        auth: auth,
        timeout
      });

      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      this.socket.on('connect', () => {
        clearTimeout(timer);
        this.isConnected = true;
        this.logEvent('connected', { socketId: this.socket!.id });
        
        // If auth provided, authenticate
        if (auth) {
          this.authenticate(auth);
        }
        
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timer);
        this.logEvent('connect_error', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        this.logEvent('disconnected', { reason });
      });

      // Log all events
      this.setupEventLogging();
    });
  }

  /**
   * Disconnect from the server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected
   */
  public getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get socket ID
   */
  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  /**
   * Authenticate with the server
   */
  public authenticate(credentials: {
    userId?: string;
    username?: string;
    role?: string;
    token?: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      this.socket.once('authenticated', (response) => {
        clearTimeout(timeout);
        this.logEvent('authenticated', response);
        resolve(response);
      });

      this.socket.emit('authenticate' as any, credentials);
    });
  }

  /**
   * Join a stream
   */
  public joinStream(streamId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Join stream timeout'));
      }, 5000);

      this.socket.once('stream:joined', (response) => {
        clearTimeout(timeout);
        this.logEvent('stream:joined', response);
        resolve(response);
      });

      this.socket.emit('stream:join', { streamId });
    });
  }

  /**
   * Leave a stream
   */
  public leaveStream(streamId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Leave stream timeout'));
      }, 5000);

      this.socket.once('stream:left', (response) => {
        clearTimeout(timeout);
        this.logEvent('stream:left', response);
        resolve(response);
      });

      this.socket.emit('stream:leave', { streamId });
    });
  }

  /**
   * Send a chat message
   */
  public sendChatMessage(streamId: string, content: string, replyTo?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Send message timeout'));
      }, 5000);

      this.socket.once('chat:message:sent', (response) => {
        clearTimeout(timeout);
        this.logEvent('chat:message:sent', response);
        resolve(response);
      });

      this.socket.emit('chat:send-message', { streamId, content, replyTo });
    });
  }

  /**
   * Get chat history
   */
  public getChatHistory(streamId: string, limit?: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Get chat history timeout'));
      }, 5000);

      this.socket.once('chat:history', (response) => {
        clearTimeout(timeout);
        this.logEvent('chat:history', response);
        resolve(response);
      });

      this.socket.emit('chat:get-history', { streamId, limit });
    });
  }

  /**
   * Send typing indicator
   */
  public sendTyping(streamId: string, isTyping: boolean): void {
    if (this.socket) {
      this.socket.emit('chat:typing', { streamId, isTyping });
    }
  }

  /**
   * Subscribe to analytics
   */
  public subscribeToAnalytics(streamId: string, filters?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Analytics subscription timeout'));
      }, 5000);

      this.socket.once('analytics:subscribed', (response) => {
        clearTimeout(timeout);
        this.logEvent('analytics:subscribed', response);
        resolve(response);
      });

      this.socket.emit('analytics:subscribe' as any, { streamId, filters });
    });
  }

  /**
   * Send VDO.Ninja stats
   */
  public sendVdoStats(streamId: string, stats: {
    fps?: number;
    bitrate?: number;
    resolution?: string;
    quality?: string;
  }): void {
    if (this.socket) {
      this.socket.emit('vdo:stats:update' as any, { streamId, ...stats });
    }
  }

  /**
   * Ping the server for health check
   */
  public ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const startTime = Date.now();
      const timeout = setTimeout(() => {
        reject(new Error('Ping timeout'));
      }, 5000);

      this.socket.once('pong', () => {
        clearTimeout(timeout);
        const latency = Date.now() - startTime;
        this.logEvent('pong', { latency });
        resolve(latency);
      });

      this.socket.emit('ping', startTime);
    });
  }

  /**
   * Wait for a specific event
   */
  public waitForEvent(eventName: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);

      this.socket.once(eventName as any, (data) => {
        clearTimeout(timer);
        this.logEvent(eventName, data);
        resolve(data);
      });
    });
  }

  /**
   * Listen to events and collect them
   */
  public listenToEvent(eventName: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(eventName as any, (data) => {
        this.logEvent(eventName, data);
        if (callback) {
          callback(data);
        }
      });
    }
  }

  /**
   * Stop listening to an event
   */
  public stopListening(eventName: string): void {
    if (this.socket) {
      this.socket.off(eventName as any);
    }
  }

  /**
   * Get event log
   */
  public getEventLog(): Array<{ event: string; data: any; timestamp: Date }> {
    return [...this.eventLog];
  }

  /**
   * Clear event log
   */
  public clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Get events of a specific type
   */
  public getEventsOfType(eventType: string): Array<{ event: string; data: any; timestamp: Date }> {
    return this.eventLog.filter(entry => entry.event === eventType);
  }

  /**
   * Get last event of a specific type
   */
  public getLastEventOfType(eventType: string): { event: string; data: any; timestamp: Date } | null {
    const events = this.getEventsOfType(eventType);
    return events.length > 0 ? events[events.length - 1] : null;
  }

  /**
   * Wait for multiple events in order
   */
  public async waitForEventSequence(events: string[], timeout = 10000): Promise<any[]> {
    const results: any[] = [];
    
    for (const eventName of events) {
      try {
        const data = await this.waitForEvent(eventName, timeout);
        results.push({ event: eventName, data });
      } catch (error) {
        throw new Error(`Failed waiting for event sequence at: ${eventName}. Error: ${error}`);
      }
    }
    
    return results;
  }

  /**
   * Simulate connection issues
   */
  public simulateConnectionIssues(type: 'disconnect' | 'reconnect' | 'timeout'): void {
    if (!this.socket) return;

    switch (type) {
      case 'disconnect':
        this.socket.disconnect();
        break;
      case 'reconnect':
        this.socket.connect();
        break;
      case 'timeout':
        // Force a timeout by sending malformed data
        (this.socket as any).engine.write('malformed data');
        break;
    }
  }

  /**
   * Get connection metrics
   */
  public getConnectionMetrics(): {
    isConnected: boolean;
    socketId: string | null;
    eventCount: number;
    connectionTime: number | null;
  } {
    const connectEvent = this.getLastEventOfType('connected');
    const connectionTime = connectEvent ? Date.now() - connectEvent.timestamp.getTime() : null;

    return {
      isConnected: this.isConnected,
      socketId: this.getSocketId(),
      eventCount: this.eventLog.length,
      connectionTime
    };
  }

  /**
   * Setup comprehensive event logging
   */
  private setupEventLogging(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => this.logEvent('connect', {}));
    this.socket.on('disconnect', (reason) => this.logEvent('disconnect', { reason }));
    this.socket.on('connect_error', (error) => this.logEvent('connect_error', error));
    this.socket.on('reconnect', (attemptNumber) => this.logEvent('reconnect', { attemptNumber }));

    // Stream events
    this.socket.on('stream:joined', (data) => this.logEvent('stream:joined', data));
    this.socket.on('stream:left', (data) => this.logEvent('stream:left', data));
    this.socket.on('stream:viewer:joined', (data) => this.logEvent('stream:viewer:joined', data));
    this.socket.on('stream:viewer:left', (data) => this.logEvent('stream:viewer:left', data));
    this.socket.on('stream:started', (data) => this.logEvent('stream:started', data));
    this.socket.on('stream:ended', (data) => this.logEvent('stream:ended', data));
    this.socket.on('stream:live', (data) => this.logEvent('stream:live', data));
    this.socket.on('stream:offline', (data) => this.logEvent('stream:offline', data));

    // Chat events
    this.socket.on('chat:message', (data) => this.logEvent('chat:message', data));
    this.socket.on('chat:message:sent', (data) => this.logEvent('chat:message:sent', data));
    this.socket.on('chat:system:message', (data) => this.logEvent('chat:system:message', data));
    this.socket.on('chat:user:typing', (data) => this.logEvent('chat:user:typing', data));
    this.socket.on('chat:history', (data) => this.logEvent('chat:history', data));

    // VDO.Ninja events
    this.socket.on('vdo:stream:live', (data) => this.logEvent('vdo:stream:live', data));
    this.socket.on('vdo:viewer:joined', (data) => this.logEvent('vdo:viewer:joined', data));
    this.socket.on('vdo:viewer:left', (data) => this.logEvent('vdo:viewer:left', data));
    this.socket.on('vdo:quality:changed', (data) => this.logEvent('vdo:quality:changed', data));
    this.socket.on('vdo:quality:warning', (data) => this.logEvent('vdo:quality:warning', data));

    // Rate limiting events
    this.socket.on('rate_limit_exceeded', (data) => this.logEvent('rate_limit_exceeded', data));
    this.socket.on('rate_limit_status', (data) => this.logEvent('rate_limit_status', data));

    // Health events
    this.socket.on('pong', (data) => this.logEvent('pong', data));
    this.socket.on('connection:health', (data) => this.logEvent('connection:health', data));

    // Analytics events
    this.socket.on('analytics:initial' as any, (data) => this.logEvent('analytics:initial', data));
    this.socket.on('analytics:subscribed' as any, (data) => this.logEvent('analytics:subscribed', data));
    this.socket.on('analytics:update' as any, (data) => this.logEvent('analytics:update', data));

    // Error events
    this.socket.on('error', (error) => this.logEvent('error', error));
    this.socket.on('stream:error', (error) => this.logEvent('stream:error', error));
    this.socket.on('chat:error' as any, (error) => this.logEvent('chat:error', error));
  }

  /**
   * Log an event with timestamp
   */
  private logEvent(event: string, data: any): void {
    this.eventLog.push({
      event,
      data,
      timestamp: new Date()
    });

    // Keep only last 1000 events to prevent memory issues
    if (this.eventLog.length > 1000) {
      this.eventLog = this.eventLog.slice(-1000);
    }
  }
}
