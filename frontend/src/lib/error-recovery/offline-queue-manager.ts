import { EventEmitter } from 'events';

/**
 * Message types that can be queued
 */
export type QueueableMessageType = 
  | 'chat:send-message'
  | 'stream:join'
  | 'stream:leave'
  | 'stream:reaction'
  | 'analytics:event'
  | 'user:action'
  | 'vdo:command';

/**
 * Priority levels for queued messages
 */
export type MessagePriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Queued message structure
 */
export interface QueuedMessage {
  id: string;
  type: QueueableMessageType;
  priority: MessagePriority;
  data: any;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  expiresAt?: Date;
  context?: {
    userId?: string;
    streamId?: string;
    sessionId?: string;
    originalEvent?: string;
  };
  status: 'pending' | 'processing' | 'failed' | 'expired' | 'sent';
  metadata?: {
    userAgent?: string;
    connectionQuality?: string;
    retryReason?: string;
  };
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxSize: number;
  maxAge: number; // ms
  batchSize: number;
  flushInterval: number; // ms
  retryDelay: number; // ms
  maxRetries: number;
  persistToStorage: boolean;
  storageKey: string;
  priorities: {
    [key in MessagePriority]: {
      maxRetries: number;
      retryDelay: number;
      timeout: number;
    };
  };
}

/**
 * Queue statistics
 */
export interface QueueStats {
  totalMessages: number;
  pendingMessages: number;
  processingMessages: number;
  failedMessages: number;
  sentMessages: number;
  expiredMessages: number;
  averageProcessingTime: number;
  lastFlushTime: Date | null;
  queueSize: number;
  storageUsage: number; // bytes
}

/**
 * Queue events
 */
export interface QueueEvents {
  'message:queued': (message: QueuedMessage) => void;
  'message:sent': (message: QueuedMessage) => void;
  'message:failed': (message: QueuedMessage, error: Error) => void;
  'message:expired': (message: QueuedMessage) => void;
  'batch:processing': (messages: QueuedMessage[]) => void;
  'batch:completed': (sent: number, failed: number) => void;
  'queue:full': (droppedMessage: QueuedMessage) => void;
  'queue:flushed': (messageCount: number) => void;
  'storage:error': (error: Error) => void;
}

/**
 * Message sender interface
 */
export interface MessageSender {
  sendMessage(message: QueuedMessage): Promise<void>;
  isConnectionAvailable(): boolean;
}

/**
 * Offline Message Queue Manager
 */
export class OfflineQueueManager extends EventEmitter {
  private static instance: OfflineQueueManager;
  private queue: Map<string, QueuedMessage> = new Map(); // messageId -> message
  private priorityQueues: Map<MessagePriority, string[]> = new Map(); // priority -> messageIds
  private config: QueueConfig;
  private messageSender: MessageSender | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private stats: QueueStats;
  private isProcessing = false;

  private static readonly DEFAULT_CONFIG: QueueConfig = {
    maxSize: 1000,
    maxAge: 3600000, // 1 hour
    batchSize: 10,
    flushInterval: 5000, // 5 seconds
    retryDelay: 2000, // 2 seconds
    maxRetries: 3,
    persistToStorage: true,
    storageKey: 'omi_offline_queue',
    priorities: {
      critical: { maxRetries: 5, retryDelay: 1000, timeout: 30000 },
      high: { maxRetries: 3, retryDelay: 2000, timeout: 60000 },
      medium: { maxRetries: 2, retryDelay: 5000, timeout: 120000 },
      low: { maxRetries: 1, retryDelay: 10000, timeout: 300000 },
    },
  };

  private constructor(config: Partial<QueueConfig> = {}) {
    super();
    this.config = { ...OfflineQueueManager.DEFAULT_CONFIG, ...config };
    this.initializePriorityQueues();
    this.initializeStats();
    this.loadFromStorage();
    this.startFlushTimer();
    this.startCleanupTimer();
  }

  public static getInstance(config?: Partial<QueueConfig>): OfflineQueueManager {
    if (!OfflineQueueManager.instance) {
      OfflineQueueManager.instance = new OfflineQueueManager(config);
    }
    return OfflineQueueManager.instance;
  }

  /**
   * Set the message sender implementation
   */
  public setMessageSender(sender: MessageSender): void {
    this.messageSender = sender;
  }

  /**
   * Queue a message for later sending
   */
  public queueMessage(
    type: QueueableMessageType,
    data: any,
    options: {
      priority?: MessagePriority;
      maxAttempts?: number;
      expiresIn?: number; // ms
      context?: QueuedMessage['context'];
    } = {}
  ): QueuedMessage {
    const messageId = this.generateMessageId();
    const now = new Date();
    const priority = options.priority || this.getDefaultPriority(type);
    const priorityConfig = this.config.priorities[priority];

    const message: QueuedMessage = {
      id: messageId,
      type,
      priority,
      data,
      timestamp: now,
      attempts: 0,
      maxAttempts: options.maxAttempts || priorityConfig.maxRetries,
      expiresAt: options.expiresIn ? new Date(now.getTime() + options.expiresIn) : 
                  new Date(now.getTime() + priorityConfig.timeout),
      context: options.context,
      status: 'pending',
      metadata: {
        userAgent: navigator.userAgent,
        connectionQuality: this.getConnectionQuality(),
      },
    };

    // Check if queue is full
    if (this.queue.size >= this.config.maxSize) {
      const droppedMessage = this.dropLowestPriorityMessage();
      if (droppedMessage) {
        this.emit('queue:full', droppedMessage);
      }
    }

    // Add to queue
    this.queue.set(messageId, message);
    this.addToPriorityQueue(messageId, priority);
    this.updateStats('queued');

    // Persist to storage
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }

    this.emit('message:queued', message);

    // Try to process immediately if connection is available
    if (this.messageSender?.isConnectionAvailable()) {
      this.processQueue();
    }

    return message;
  }

  /**
   * Process queued messages
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessing || !this.messageSender) {
      return;
    }

    if (!this.messageSender.isConnectionAvailable()) {
      console.log('Connection not available, skipping queue processing');
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.getNextBatch();
      if (batch.length === 0) {
        return;
      }

      console.log(`Processing batch of ${batch.length} messages`);
      this.emit('batch:processing', batch);

      let sentCount = 0;
      let failedCount = 0;

      for (const message of batch) {
        try {
          message.status = 'processing';
          message.attempts++;

          const startTime = Date.now();
          await this.messageSender.sendMessage(message);
          const endTime = Date.now();

          message.status = 'sent';
          this.removeFromQueue(message.id);
          this.updateStats('sent', endTime - startTime);
          this.emit('message:sent', message);
          sentCount++;

        } catch (error) {
          failedCount++;
          await this.handleMessageFailure(message, error as Error);
        }
      }

      this.emit('batch:completed', sentCount, failedCount);

      // Continue processing if there are more messages
      if (this.hasMessages() && this.messageSender.isConnectionAvailable()) {
        setTimeout(() => this.processQueue(), 100);
      }

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle message sending failure
   */
  private async handleMessageFailure(message: QueuedMessage, error: Error): Promise<void> {
    const priorityConfig = this.config.priorities[message.priority];
    
    if (message.attempts >= message.maxAttempts) {
      message.status = 'failed';
      this.removeFromQueue(message.id);
      this.updateStats('failed');
      this.emit('message:failed', message, error);
      return;
    }

    // Schedule retry
    message.status = 'pending';
    message.metadata!.retryReason = error.message;
    
    const retryDelay = this.calculateRetryDelay(message, priorityConfig.retryDelay);
    message.nextRetryAt = new Date(Date.now() + retryDelay);

    const retryTimer = setTimeout(() => {
      this.retryTimers.delete(message.id);
      if (this.messageSender?.isConnectionAvailable()) {
        this.processQueue();
      }
    }, retryDelay);

    this.retryTimers.set(message.id, retryTimer);

    console.log(`Message ${message.id} failed, retrying in ${retryDelay}ms (attempt ${message.attempts}/${message.maxAttempts})`);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(message: QueuedMessage, baseDelay: number): number {
    const exponential = baseDelay * Math.pow(2, message.attempts - 1);
    const jitter = Math.random() * 0.3 * exponential; // ±30% jitter
    return Math.min(exponential + jitter, 60000); // Max 1 minute
  }

  /**
   * Get next batch of messages to process
   */
  private getNextBatch(): QueuedMessage[] {
    const batch: QueuedMessage[] = [];
    const now = new Date();

    // Process by priority order
    const priorities: MessagePriority[] = ['critical', 'high', 'medium', 'low'];
    
    for (const priority of priorities) {
      const messageIds = this.priorityQueues.get(priority) || [];
      
      for (const messageId of messageIds) {
        if (batch.length >= this.config.batchSize) {
          break;
        }

        const message = this.queue.get(messageId);
        if (!message) continue;

        // Skip if not ready for retry
        if (message.nextRetryAt && message.nextRetryAt > now) {
          continue;
        }

        // Skip if expired
        if (message.expiresAt && message.expiresAt <= now) {
          this.expireMessage(message);
          continue;
        }

        // Skip if already processing
        if (message.status === 'processing') {
          continue;
        }

        batch.push(message);
      }

      if (batch.length >= this.config.batchSize) {
        break;
      }
    }

    return batch;
  }

  /**
   * Expire a message
   */
  private expireMessage(message: QueuedMessage): void {
    message.status = 'expired';
    this.removeFromQueue(message.id);
    this.updateStats('expired');
    this.emit('message:expired', message);
  }

  /**
   * Remove message from queue
   */
  private removeFromQueue(messageId: string): void {
    const message = this.queue.get(messageId);
    if (!message) return;

    this.queue.delete(messageId);
    this.removeFromPriorityQueue(messageId, message.priority);
    
    // Cancel retry timer if exists
    const retryTimer = this.retryTimers.get(messageId);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimers.delete(messageId);
    }

    // Persist to storage
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }
  }

  /**
   * Drop lowest priority message when queue is full
   */
  private dropLowestPriorityMessage(): QueuedMessage | null {
    const priorities: MessagePriority[] = ['low', 'medium', 'high', 'critical'];
    
    for (const priority of priorities) {
      const messageIds = this.priorityQueues.get(priority) || [];
      if (messageIds.length > 0) {
        const oldestId = messageIds[0]; // Assuming FIFO within priority
        const message = this.queue.get(oldestId);
        if (message) {
          this.removeFromQueue(oldestId);
          return message;
        }
      }
    }
    
    return null;
  }

  /**
   * Flush all queued messages immediately
   */
  public async flushQueue(): Promise<void> {
    console.log('Flushing message queue');
    
    const messageCount = this.queue.size;
    await this.processQueue();
    
    this.emit('queue:flushed', messageCount);
  }

  /**
   * Clear all queued messages
   */
  public clearQueue(): void {
    const messageCount = this.queue.size;
    
    // Clear retry timers
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    
    // Clear queues
    this.queue.clear();
    this.priorityQueues.forEach(queue => queue.length = 0);
    
    // Update storage
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }
    
    console.log(`Cleared ${messageCount} messages from queue`);
  }

  /**
   * Get queue statistics
   */
  public getStats(): QueueStats {
    return { ...this.stats };
  }

  /**
   * Get all queued messages
   */
  public getQueuedMessages(priority?: MessagePriority): QueuedMessage[] {
    if (priority) {
      const messageIds = this.priorityQueues.get(priority) || [];
      return messageIds.map(id => this.queue.get(id)!).filter(Boolean);
    }
    
    return Array.from(this.queue.values());
  }

  /**
   * Check if queue has messages
   */
  public hasMessages(): boolean {
    return this.queue.size > 0;
  }

  /**
   * Update queue configuration
   */
  public updateConfig(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart timers with new intervals
    this.stopTimers();
    this.startFlushTimer();
    this.startCleanupTimer();
  }

  /**
   * Private helper methods
   */

  private initializePriorityQueues(): void {
    this.priorityQueues.set('critical', []);
    this.priorityQueues.set('high', []);
    this.priorityQueues.set('medium', []);
    this.priorityQueues.set('low', []);
  }

  private initializeStats(): void {
    this.stats = {
      totalMessages: 0,
      pendingMessages: 0,
      processingMessages: 0,
      failedMessages: 0,
      sentMessages: 0,
      expiredMessages: 0,
      averageProcessingTime: 0,
      lastFlushTime: null,
      queueSize: 0,
      storageUsage: 0,
    };
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultPriority(type: QueueableMessageType): MessagePriority {
    switch (type) {
      case 'chat:send-message': return 'high';
      case 'stream:join': return 'high';
      case 'stream:leave': return 'medium';
      case 'stream:reaction': return 'medium';
      case 'analytics:event': return 'low';
      case 'user:action': return 'medium';
      case 'vdo:command': return 'high';
      default: return 'medium';
    }
  }

  private getConnectionQuality(): string {
    // This would integrate with the connection health monitor
    return 'unknown';
  }

  private addToPriorityQueue(messageId: string, priority: MessagePriority): void {
    const queue = this.priorityQueues.get(priority);
    if (queue) {
      queue.push(messageId);
    }
  }

  private removeFromPriorityQueue(messageId: string, priority: MessagePriority): void {
    const queue = this.priorityQueues.get(priority);
    if (queue) {
      const index = queue.indexOf(messageId);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    }
  }

  private updateStats(operation: 'queued' | 'sent' | 'failed' | 'expired', processingTime?: number): void {
    switch (operation) {
      case 'queued':
        this.stats.totalMessages++;
        this.stats.pendingMessages++;
        break;
      case 'sent':
        this.stats.sentMessages++;
        this.stats.pendingMessages--;
        if (processingTime) {
          this.stats.averageProcessingTime = 
            (this.stats.averageProcessingTime + processingTime) / 2;
        }
        break;
      case 'failed':
        this.stats.failedMessages++;
        this.stats.pendingMessages--;
        break;
      case 'expired':
        this.stats.expiredMessages++;
        this.stats.pendingMessages--;
        break;
    }
    
    this.stats.queueSize = this.queue.size;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.hasMessages() && this.messageSender?.isConnectionAvailable()) {
        this.processQueue();
        this.stats.lastFlushTime = new Date();
      }
    }, this.config.flushInterval);
  }

  private startCleanupTimer(): void {
    // Clean up expired messages every minute
    setInterval(() => {
      this.cleanupExpiredMessages();
    }, 60000);
  }

  private stopTimers(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private cleanupExpiredMessages(): void {
    const now = new Date();
    const expiredMessages: string[] = [];

    for (const [messageId, message] of this.queue.entries()) {
      if (message.expiresAt && message.expiresAt <= now) {
        expiredMessages.push(messageId);
      }
    }

    expiredMessages.forEach(messageId => {
      const message = this.queue.get(messageId);
      if (message) {
        this.expireMessage(message);
      }
    });

    if (expiredMessages.length > 0) {
      console.log(`Cleaned up ${expiredMessages.length} expired messages`);
    }
  }

  private saveToStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      const data = {
        messages: Array.from(this.queue.entries()),
        stats: this.stats,
        timestamp: new Date().toISOString(),
      };
      
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.config.storageKey, serialized);
      this.stats.storageUsage = new Blob([serialized]).size;
      
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
      this.emit('storage:error', error as Error);
    }
  }

  private loadFromStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);
      
      // Restore messages
      for (const [messageId, messageData] of data.messages) {
        const message: QueuedMessage = {
          ...messageData,
          timestamp: new Date(messageData.timestamp),
          expiresAt: messageData.expiresAt ? new Date(messageData.expiresAt) : undefined,
          nextRetryAt: messageData.nextRetryAt ? new Date(messageData.nextRetryAt) : undefined,
        };
        
        // Skip expired messages
        if (message.expiresAt && message.expiresAt <= new Date()) {
          continue;
        }
        
        this.queue.set(messageId, message);
        this.addToPriorityQueue(messageId, message.priority);
      }

      // Restore stats
      if (data.stats) {
        this.stats = {
          ...this.stats,
          ...data.stats,
          lastFlushTime: data.stats.lastFlushTime ? new Date(data.stats.lastFlushTime) : null,
        };
      }

      console.log(`Loaded ${this.queue.size} messages from storage`);
      
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
      this.emit('storage:error', error as Error);
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopTimers();
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();
    this.clearQueue();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const offlineQueueManager = OfflineQueueManager.getInstance();
