import { EnhancedSocketManager, type ClientToServerEvents, type ServerToClientEvents } from '../enhanced-socket-manager';
import { errorRecoveryManager, type ErrorSeverity, type ErrorCategory } from './error-recovery-manager';
import { offlineQueueManager, type QueueableMessageType, type MessageSender, type QueuedMessage } from './offline-queue-manager';
import { ConnectionHealthMonitor } from '../connection-health-monitor';

/**
 * Resilient Socket Manager with comprehensive error recovery
 * Extends EnhancedSocketManager with advanced error handling, offline queuing, and fallback modes
 */
export class ResilientSocketManager extends EnhancedSocketManager implements MessageSender {
  private errorRecovery = errorRecoveryManager;
  private offlineQueue = offlineQueueManager;
  private lastSuccessfulConnection: Date | null = null;
  private connectionAttemptCount = 0;
  private maxConsecutiveFailures = 5;
  private isInFallbackMode = false;
  private fallbackModeStartTime: Date | null = null;
  private messageDeduplication: Map<string, Date> = new Map(); // messageHash -> timestamp

  constructor(config?: any) {
    super(config);
    this.setupErrorRecoveryIntegration();
    this.setupOfflineQueueIntegration();
    this.setupCircuitBreakerIntegration();
  }

  /**
   * Enhanced connect with error recovery
   */
  public connect(url?: string, token?: string): any {
    this.connectionAttemptCount++;
    
    try {
      const socket = super.connect(url, token);
      this.setupResilientEventHandlers();
      return socket;
    } catch (error) {
      this.handleConnectionError(error as Error, 'connection_attempt');
      throw error;
    }
  }

  /**
   * Enhanced emit with offline queuing and error recovery
   */
  public emit<K extends keyof ClientToServerEvents>(
    event: K,
    ...args: Parameters<ClientToServerEvents[K]>
  ): void {
    const messageData = args[0] as any;
    const messageHash = this.generateMessageHash(event, messageData);
    
    // Check for duplicate messages (deduplication)
    if (this.isDuplicateMessage(messageHash)) {
      console.log('Duplicate message detected, skipping:', event);
      return;
    }

    // Mark message as seen
    this.messageDeduplication.set(messageHash, new Date());

    // Try to send immediately if connected
    if (this.isConnected() && !this.isInFallbackMode) {
      try {
        super.emit(event, ...args);
        this.recordSuccessfulMessage(event);
        return;
      } catch (error) {
        console.warn('Failed to send message immediately, queuing:', error);
        this.handleMessageError(event, messageData, error as Error);
      }
    }

    // Queue message for later if not connected or in fallback mode
    this.queueMessage(event, messageData);
  }

  /**
   * Queue message for offline processing
   */
  private queueMessage(event: string, data: any): void {
    const queueableType = this.mapEventToQueueableType(event);
    
    this.offlineQueue.queueMessage(queueableType, {
      event,
      data,
      timestamp: new Date().toISOString(),
    }, {
      priority: this.getMessagePriority(event),
      context: {
        userId: this.getUserId(),
        streamId: this.getStreamId(data),
        sessionId: this.getSessionId(),
        originalEvent: event,
      },
      expiresIn: this.getMessageTTL(event),
    });
  }

  /**
   * Implementation of MessageSender interface
   */
  public async sendMessage(message: QueuedMessage): Promise<void> {
    if (!this.isConnectionAvailable()) {
      throw new Error('Connection not available');
    }

    try {
      const { event, data } = message.data;
      super.emit(event, data);
      this.recordSuccessfulMessage(event);
    } catch (error) {
      this.handleMessageError(message.data.event, message.data.data, error as Error);
      throw error;
    }
  }

  /**
   * Check if connection is available for sending messages
   */
  public isConnectionAvailable(): boolean {
    return this.isConnected() && 
           !this.isInFallbackMode && 
           this.errorRecovery.getCircuitBreakerState().state !== 'open';
  }

  /**
   * Setup error recovery integration
   */
  private setupErrorRecoveryIntegration(): void {
    // Listen to error recovery events
    this.errorRecovery.on('circuit-breaker:opened', () => {
      console.warn('Circuit breaker opened - entering fallback mode');
      this.enterFallbackMode('circuit_breaker');
    });

    this.errorRecovery.on('circuit-breaker:closed', () => {
      console.log('Circuit breaker closed - exiting fallback mode');
      this.exitFallbackMode();
    });

    this.errorRecovery.on('fallback:activated', (mode) => {
      console.log('Fallback mode activated:', mode.name);
      this.handleFallbackModeChange(mode);
    });

    this.errorRecovery.on('fallback:deactivated', () => {
      console.log('Fallback mode deactivated');
      this.exitFallbackMode();
    });

    this.errorRecovery.on('error:recovery:retry', (errorInstance) => {
      if (errorInstance.category === 'connection') {
        console.log('Attempting recovery reconnection');
        this.forceReconnect();
      }
    });

    this.errorRecovery.on('user:notification', (notification) => {
      // Forward to user notification system
      this.emitInternal('user:notification', notification);
    });
  }

  /**
   * Setup offline queue integration
   */
  private setupOfflineQueueIntegration(): void {
    // Set this instance as the message sender
    this.offlineQueue.setMessageSender(this);

    // Listen to queue events
    this.offlineQueue.on('message:sent', (message) => {
      console.log('Queued message sent successfully:', message.type);
    });

    this.offlineQueue.on('message:failed', (message, error) => {
      console.error('Queued message failed permanently:', message.type, error);
      this.handleMessageError(message.data.event, message.data.data, error);
    });

    this.offlineQueue.on('message:expired', (message) => {
      console.warn('Queued message expired:', message.type);
    });

    this.offlineQueue.on('queue:full', (droppedMessage) => {
      console.warn('Message queue full, dropped message:', droppedMessage.type);
      this.emitInternal('queue:message-dropped', droppedMessage);
    });
  }

  /**
   * Setup circuit breaker integration
   */
  private setupCircuitBreakerIntegration(): void {
    // Listen to internal events to update circuit breaker
    this.onInternal('connection:established', () => {
      this.lastSuccessfulConnection = new Date();
      this.connectionAttemptCount = 0;
      this.errorRecovery.closeCircuitBreaker();
      
      // Process offline queue when connection is restored
      setTimeout(() => {
        this.offlineQueue.processQueue();
      }, 1000);
    });

    this.onInternal('connection:failed', (data) => {
      this.handleConnectionError(new Error(data.error), 'connection_failed');
    });

    this.onInternal('health:connection-unstable', (metrics) => {
      this.handleConnectionHealth(metrics);
    });
  }

  /**
   * Setup resilient event handlers
   */
  private setupResilientEventHandlers(): void {
    const socket = this.getSocket();
    if (!socket) return;

    // Handle server errors with error recovery
    socket.on('error', (error) => {
      this.handleServerError(error);
    });

    // Handle disconnect with enhanced recovery
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(reason);
    });

    // Handle rate limiting with queuing
    socket.on('rate_limit_exceeded', (data) => {
      this.handleRateLimit(data);
    });

    // Handle connection health events
    socket.on('connection:health', (metrics) => {
      this.handleConnectionHealth(metrics);
    });
  }

  /**
   * Handle various error scenarios
   */
  private handleConnectionError(error: Error, context: string): void {
    this.errorRecovery.handleError(error, {
      event: 'connection',
      socketConnected: this.isConnected(),
      attemptNumber: this.connectionAttemptCount,
      originalEvent: context,
    });
  }

  private handleMessageError(event: string, data: any, error: Error): void {
    this.errorRecovery.handleError(error, {
      event,
      data,
      socketConnected: this.isConnected(),
      userId: this.getUserId(),
      streamId: this.getStreamId(data),
    });
  }

  private handleServerError(error: Error): void {
    this.errorRecovery.handleError(error, {
      event: 'server_error',
      socketConnected: this.isConnected(),
    });
  }

  private handleDisconnect(reason: string): void {
    this.errorRecovery.handleError(new Error(`Disconnected: ${reason}`), {
      event: 'disconnect',
      socketConnected: false,
      originalEvent: reason,
    });
  }

  private handleRateLimit(data: any): void {
    console.warn('Rate limited, switching to queue mode temporarily');
    
    this.errorRecovery.handleError(new Error('Rate limit exceeded'), {
      event: 'rate_limit',
      data,
      socketConnected: this.isConnected(),
    });

    // Temporarily use offline queue for new messages
    this.isInFallbackMode = true;
    setTimeout(() => {
      this.isInFallbackMode = false;
    }, data.retryAfter * 1000 || 5000);
  }

  private handleConnectionHealth(metrics: any): void {
    if (metrics.quality === 'critical' || metrics.quality === 'poor') {
      this.errorRecovery.handleError(new Error('Poor connection quality'), {
        event: 'connection_quality',
        data: metrics,
        socketConnected: this.isConnected(),
      });
    }
  }

  /**
   * Fallback mode management
   */
  private enterFallbackMode(reason: string): void {
    if (this.isInFallbackMode) return;
    
    this.isInFallbackMode = true;
    this.fallbackModeStartTime = new Date();
    
    console.log(`Entering fallback mode due to: ${reason}`);
    this.emitInternal('fallback:entered', { reason, timestamp: this.fallbackModeStartTime });
  }

  private exitFallbackMode(): void {
    if (!this.isInFallbackMode) return;
    
    this.isInFallbackMode = false;
    const duration = this.fallbackModeStartTime ? 
      Date.now() - this.fallbackModeStartTime.getTime() : 0;
    
    console.log(`Exiting fallback mode after ${duration}ms`);
    this.emitInternal('fallback:exited', { duration });
    this.fallbackModeStartTime = null;
    
    // Process queued messages when exiting fallback mode
    if (this.isConnected()) {
      setTimeout(() => {
        this.offlineQueue.processQueue();
      }, 500);
    }
  }

  private handleFallbackModeChange(mode: any): void {
    this.enterFallbackMode('error_recovery');
    
    // Configure behavior based on fallback mode
    switch (mode.name) {
      case 'basic':
        // Allow essential operations only
        break;
      case 'minimal':
        // Very limited functionality
        break;
      case 'offline':
        // Queue everything
        this.isInFallbackMode = true;
        break;
    }
  }

  /**
   * Message utility methods
   */
  private mapEventToQueueableType(event: string): QueueableMessageType {
    if (event.startsWith('chat:')) return 'chat:send-message';
    if (event.startsWith('stream:')) {
      if (event.includes('join')) return 'stream:join';
      if (event.includes('leave')) return 'stream:leave';
      if (event.includes('reaction')) return 'stream:reaction';
    }
    if (event.startsWith('analytics:')) return 'analytics:event';
    if (event.startsWith('vdo:')) return 'vdo:command';
    return 'user:action';
  }

  private getMessagePriority(event: string): 'low' | 'medium' | 'high' | 'critical' {
    if (event.includes('emergency') || event.includes('critical')) return 'critical';
    if (event.startsWith('chat:') || event.startsWith('stream:join')) return 'high';
    if (event.startsWith('stream:') || event.startsWith('vdo:')) return 'medium';
    return 'low';
  }

  private getMessageTTL(event: string): number {
    // Time-to-live in milliseconds
    if (event.startsWith('chat:')) return 300000; // 5 minutes
    if (event.startsWith('stream:')) return 600000; // 10 minutes
    if (event.startsWith('analytics:')) return 1800000; // 30 minutes
    return 300000; // 5 minutes default
  }

  private generateMessageHash(event: string, data: any): string {
    // Simple hash for deduplication
    const content = JSON.stringify({ event, data });
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private isDuplicateMessage(messageHash: string): boolean {
    const lastSeen = this.messageDeduplication.get(messageHash);
    if (!lastSeen) return false;
    
    // Consider duplicates if seen within last 30 seconds
    const timeSinceLastSeen = Date.now() - lastSeen.getTime();
    return timeSinceLastSeen < 30000;
  }

  private recordSuccessfulMessage(event: string): void {
    // Update statistics or metrics
    console.debug(`Message sent successfully: ${event}`);
  }

  /**
   * Context extraction helpers
   */
  private getUserId(): string | undefined {
    // Extract from auth context or socket auth
    return 'current_user_id'; // Placeholder
  }

  private getStreamId(data: any): string | undefined {
    return data?.streamId || data?.stream_id;
  }

  private getSessionId(): string | undefined {
    return this.getSocket()?.id;
  }

  /**
   * Enhanced public API
   */

  /**
   * Force process offline queue
   */
  public async flushOfflineQueue(): Promise<void> {
    await this.offlineQueue.flushQueue();
  }

  /**
   * Get offline queue statistics
   */
  public getOfflineQueueStats() {
    return this.offlineQueue.getStats();
  }

  /**
   * Get error recovery statistics
   */
  public getErrorRecoveryStats() {
    return {
      circuitBreakerState: this.errorRecovery.getCircuitBreakerState(),
      errorHistory: this.errorRecovery.getErrorHistory(),
      currentFallbackMode: this.errorRecovery.getCurrentFallbackMode(),
      isInFallbackMode: this.isInFallbackMode,
      lastSuccessfulConnection: this.lastSuccessfulConnection,
      connectionAttemptCount: this.connectionAttemptCount,
    };
  }

  /**
   * Manually trigger fallback mode (for testing)
   */
  public triggerFallbackMode(reason: string = 'manual'): void {
    this.enterFallbackMode(reason);
  }

  /**
   * Clear error history and reset recovery state
   */
  public resetErrorRecovery(): void {
    this.errorRecovery.clearErrorHistory();
    this.errorRecovery.closeCircuitBreaker();
    this.exitFallbackMode();
    this.connectionAttemptCount = 0;
  }

  /**
   * Configure error recovery behavior
   */
  public configureErrorRecovery(config: any): void {
    // Update error classifications
    Object.entries(config.errorClassifications || {}).forEach(([category, classification]) => {
      this.errorRecovery.updateErrorClassification(category as any, classification as any);
    });

    // Update offline queue config
    if (config.offlineQueue) {
      this.offlineQueue.updateConfig(config.offlineQueue);
    }
  }

  /**
   * Enhanced disconnect with cleanup
   */
  public disconnect(): void {
    // Process any remaining queued messages before disconnecting
    if (this.offlineQueue.hasMessages()) {
      console.log('Processing remaining queued messages before disconnect');
      this.offlineQueue.flushQueue().then(() => {
        super.disconnect();
      });
    } else {
      super.disconnect();
    }

    // Clean up resources
    this.exitFallbackMode();
    this.messageDeduplication.clear();
  }

  /**
   * Health check for the entire resilient system
   */
  public getSystemHealth() {
    const connectionHealth = this.getConnectionHealth();
    const queueStats = this.getOfflineQueueStats();
    const errorStats = this.getErrorRecoveryStats();

    return {
      overall: this.calculateOverallHealth(),
      connection: {
        isConnected: this.isConnected(),
        quality: connectionHealth.quality,
        isHealthy: connectionHealth.isHealthy,
        metrics: connectionHealth.metrics,
      },
      errorRecovery: {
        circuitBreakerState: errorStats.circuitBreakerState.state,
        isInFallbackMode: errorStats.isInFallbackMode,
        recentErrors: errorStats.errorHistory.slice(-5),
      },
      offlineQueue: {
        hasMessages: queueStats.queueSize > 0,
        pendingMessages: queueStats.pendingMessages,
        failedMessages: queueStats.failedMessages,
        averageProcessingTime: queueStats.averageProcessingTime,
      },
      lastSuccessfulConnection: this.lastSuccessfulConnection,
      uptime: this.lastSuccessfulConnection ? 
        Date.now() - this.lastSuccessfulConnection.getTime() : null,
    };
  }

  private calculateOverallHealth(): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    const isConnected = this.isConnected();
    const connectionQuality = this.getConnectionQuality();
    const circuitBreakerOpen = this.errorRecovery.getCircuitBreakerState().state === 'open';
    const inFallbackMode = this.isInFallbackMode;
    const queueSize = this.offlineQueue.getStats().queueSize;

    if (!isConnected || circuitBreakerOpen) return 'critical';
    if (inFallbackMode || connectionQuality === 'poor') return 'poor';
    if (connectionQuality === 'fair' || queueSize > 50) return 'fair';
    if (connectionQuality === 'good' || queueSize > 10) return 'good';
    return 'excellent';
  }
}

// Export singleton instance
export const resilientSocketManager = new ResilientSocketManager();
