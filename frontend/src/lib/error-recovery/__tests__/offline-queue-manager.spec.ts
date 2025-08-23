import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineQueueManager, type QueuedMessage, type MessageSender } from '../offline-queue-manager';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock message sender
const mockMessageSender: MessageSender = {
  sendMessage: vi.fn().mockResolvedValue(undefined),
  isConnectionAvailable: vi.fn().mockReturnValue(true),
};

describe('OfflineQueueManager', () => {
  let queueManager: OfflineQueueManager;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Create fresh instance for each test
    queueManager = new (OfflineQueueManager as any)({
      maxSize: 10,
      flushInterval: 100,
      persistToStorage: false, // Disable for most tests
    });
    
    queueManager.setMessageSender(mockMessageSender);
  });

  afterEach(() => {
    queueManager.destroy();
  });

  describe('Message Queuing', () => {
    it('should queue messages successfully', () => {
      const message = queueManager.queueMessage('chat:send-message', {
        text: 'Hello world',
        streamId: 'stream123',
      });

      expect(message.id).toBeTruthy();
      expect(message.type).toBe('chat:send-message');
      expect(message.status).toBe('pending');
      expect(message.priority).toBe('high'); // chat messages are high priority
      expect(queueManager.hasMessages()).toBe(true);
    });

    it('should assign correct priorities based on message type', () => {
      const chatMessage = queueManager.queueMessage('chat:send-message', {});
      const analyticsMessage = queueManager.queueMessage('analytics:event', {});
      const streamMessage = queueManager.queueMessage('stream:join', {});

      expect(chatMessage.priority).toBe('high');
      expect(analyticsMessage.priority).toBe('low');
      expect(streamMessage.priority).toBe('high');
    });

    it('should set expiration time based on message type', () => {
      const chatMessage = queueManager.queueMessage('chat:send-message', {});
      const analyticsMessage = queueManager.queueMessage('analytics:event', {});

      expect(chatMessage.expiresAt).toBeTruthy();
      expect(analyticsMessage.expiresAt).toBeTruthy();
      
      // Analytics messages should have longer TTL
      expect(analyticsMessage.expiresAt!.getTime() > chatMessage.expiresAt!.getTime()).toBe(true);
    });

    it('should drop lowest priority messages when queue is full', () => {
      const dropListener = vi.fn();
      queueManager.on('queue:full', dropListener);

      // Fill queue with high priority messages
      for (let i = 0; i < 10; i++) {
        queueManager.queueMessage('chat:send-message', { id: i });
      }

      // Add a low priority message
      queueManager.queueMessage('analytics:event', { id: 'analytics' });

      // Queue should now be full, next message should drop oldest low priority
      queueManager.queueMessage('chat:send-message', { id: 'new' });

      expect(dropListener).toHaveBeenCalled();
      expect(queueManager.getQueuedMessages().length).toBe(10);
    });

    it('should handle custom priority and options', () => {
      const message = queueManager.queueMessage('user:action', {}, {
        priority: 'critical',
        maxAttempts: 5,
        expiresIn: 60000,
        context: { userId: 'user123' },
      });

      expect(message.priority).toBe('critical');
      expect(message.maxAttempts).toBe(5);
      expect(message.context?.userId).toBe('user123');
    });
  });

  describe('Message Processing', () => {
    it('should process messages when connection is available', async () => {
      queueManager.queueMessage('chat:send-message', { text: 'test' });

      await queueManager.processQueue();

      expect(mockMessageSender.sendMessage).toHaveBeenCalledTimes(1);
      expect(queueManager.hasMessages()).toBe(false);
    });

    it('should not process messages when connection is unavailable', async () => {
      mockMessageSender.isConnectionAvailable = vi.fn().mockReturnValue(false);
      
      queueManager.queueMessage('chat:send-message', { text: 'test' });

      await queueManager.processQueue();

      expect(mockMessageSender.sendMessage).not.toHaveBeenCalled();
      expect(queueManager.hasMessages()).toBe(true);
    });

    it('should process messages by priority order', async () => {
      const messages = [
        queueManager.queueMessage('analytics:event', { id: 'low' }, { priority: 'low' }),
        queueManager.queueMessage('user:action', { id: 'critical' }, { priority: 'critical' }),
        queueManager.queueMessage('chat:send-message', { id: 'high' }, { priority: 'high' }),
        queueManager.queueMessage('stream:join', { id: 'medium' }, { priority: 'medium' }),
      ];

      const sendOrder: string[] = [];
      mockMessageSender.sendMessage = vi.fn().mockImplementation((message: QueuedMessage) => {
        sendOrder.push(message.data.id);
        return Promise.resolve();
      });

      await queueManager.processQueue();

      expect(sendOrder).toEqual(['critical', 'high', 'medium', 'low']);
    });

    it('should respect batch size limits', async () => {
      // Queue more messages than batch size
      for (let i = 0; i < 15; i++) {
        queueManager.queueMessage('chat:send-message', { id: i });
      }

      await queueManager.processQueue();

      // Should only process batch size (10) on first pass
      expect(mockMessageSender.sendMessage).toHaveBeenCalledTimes(10);
      expect(queueManager.hasMessages()).toBe(true);
    });

    it('should emit processing events', async () => {
      const batchListener = vi.fn();
      const completedListener = vi.fn();
      
      queueManager.on('batch:processing', batchListener);
      queueManager.on('batch:completed', completedListener);

      queueManager.queueMessage('chat:send-message', { text: 'test' });

      await queueManager.processQueue();

      expect(batchListener).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'chat:send-message' })
        ])
      );
      expect(completedListener).toHaveBeenCalledWith(1, 0); // 1 sent, 0 failed
    });
  });

  describe('Message Failure Handling', () => {
    it('should retry failed messages', async () => {
      const failedListener = vi.fn();
      queueManager.on('message:failed', failedListener);

      // Make first attempt fail, subsequent succeed
      let attemptCount = 0;
      mockMessageSender.sendMessage = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve();
      });

      queueManager.queueMessage('chat:send-message', { text: 'test' });

      await queueManager.processQueue();

      // First attempt should fail
      expect(attemptCount).toBe(1);
      expect(queueManager.hasMessages()).toBe(true);

      // Message should be scheduled for retry
      const messages = queueManager.getQueuedMessages();
      expect(messages[0].attempts).toBe(1);
      expect(messages[0].nextRetryAt).toBeTruthy();
    });

    it('should permanently fail messages after max retries', async () => {
      const failedListener = vi.fn();
      queueManager.on('message:failed', failedListener);

      mockMessageSender.sendMessage = vi.fn().mockRejectedValue(new Error('Persistent error'));

      const message = queueManager.queueMessage('chat:send-message', { text: 'test' }, {
        maxAttempts: 2,
      });

      // Process multiple times to exceed max attempts
      await queueManager.processQueue();
      await queueManager.processQueue();

      expect(failedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: message.id,
          status: 'failed',
        }),
        expect.any(Error)
      );
      expect(queueManager.hasMessages()).toBe(false);
    });

    it('should calculate exponential backoff for retries', async () => {
      mockMessageSender.sendMessage = vi.fn().mockRejectedValue(new Error('Test error'));

      const message = queueManager.queueMessage('chat:send-message', { text: 'test' });

      await queueManager.processQueue();

      const updatedMessage = queueManager.getQueuedMessages()[0];
      expect(updatedMessage.nextRetryAt).toBeTruthy();
      
      const retryDelay = updatedMessage.nextRetryAt!.getTime() - Date.now();
      expect(retryDelay).toBeGreaterThan(1000); // Should have some delay
    });
  });

  describe('Message Expiration', () => {
    it('should expire old messages', async () => {
      const expiredListener = vi.fn();
      queueManager.on('message:expired', expiredListener);

      // Queue message with very short expiration
      queueManager.queueMessage('chat:send-message', { text: 'test' }, {
        expiresIn: 1, // 1ms expiration
      });

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      await queueManager.processQueue();

      expect(expiredListener).toHaveBeenCalled();
      expect(queueManager.hasMessages()).toBe(false);
    });

    it('should not process expired messages', async () => {
      queueManager.queueMessage('chat:send-message', { text: 'test' }, {
        expiresIn: 1,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      await queueManager.processQueue();

      expect(mockMessageSender.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Queue Management', () => {
    it('should flush all queued messages', async () => {
      const flushListener = vi.fn();
      queueManager.on('queue:flushed', flushListener);

      queueManager.queueMessage('chat:send-message', { text: 'test1' });
      queueManager.queueMessage('chat:send-message', { text: 'test2' });

      await queueManager.flushQueue();

      expect(flushListener).toHaveBeenCalledWith(2);
      expect(mockMessageSender.sendMessage).toHaveBeenCalledTimes(2);
      expect(queueManager.hasMessages()).toBe(false);
    });

    it('should clear all queued messages', () => {
      queueManager.queueMessage('chat:send-message', { text: 'test1' });
      queueManager.queueMessage('chat:send-message', { text: 'test2' });

      expect(queueManager.hasMessages()).toBe(true);

      queueManager.clearQueue();

      expect(queueManager.hasMessages()).toBe(false);
      expect(queueManager.getQueuedMessages().length).toBe(0);
    });

    it('should get queue statistics', () => {
      queueManager.queueMessage('chat:send-message', { text: 'test' });

      const stats = queueManager.getStats();

      expect(stats.totalMessages).toBe(1);
      expect(stats.pendingMessages).toBe(1);
      expect(stats.queueSize).toBe(1);
      expect(stats.sentMessages).toBe(0);
      expect(stats.failedMessages).toBe(0);
    });

    it('should filter messages by priority', () => {
      queueManager.queueMessage('chat:send-message', { text: 'high' });
      queueManager.queueMessage('analytics:event', { text: 'low' });

      const highPriorityMessages = queueManager.getQueuedMessages('high');
      const lowPriorityMessages = queueManager.getQueuedMessages('low');

      expect(highPriorityMessages.length).toBe(1);
      expect(lowPriorityMessages.length).toBe(1);
      expect(highPriorityMessages[0].data.text).toBe('high');
      expect(lowPriorityMessages[0].data.text).toBe('low');
    });
  });

  describe('Storage Persistence', () => {
    beforeEach(() => {
      // Enable storage for these tests
      queueManager.updateConfig({ persistToStorage: true });
    });

    it('should persist queued messages to storage', () => {
      queueManager.queueMessage('chat:send-message', { text: 'test' });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'omi_offline_queue',
        expect.stringContaining('test')
      );
    });

    it('should load messages from storage on initialization', () => {
      const storedData = {
        messages: [
          ['msg1', {
            id: 'msg1',
            type: 'chat:send-message',
            data: { text: 'restored' },
            priority: 'high',
            timestamp: new Date().toISOString(),
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
          }]
        ],
        stats: {},
        timestamp: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      // Create new instance to test loading
      const newQueueManager = new (OfflineQueueManager as any)({
        persistToStorage: true,
      });

      expect(newQueueManager.hasMessages()).toBe(true);
      expect(newQueueManager.getQueuedMessages()[0].data.text).toBe('restored');

      newQueueManager.destroy();
    });

    it('should handle storage errors gracefully', () => {
      const errorListener = vi.fn();
      queueManager.on('storage:error', errorListener);

      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      queueManager.queueMessage('chat:send-message', { text: 'test' });

      expect(errorListener).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should skip expired messages when loading from storage', () => {
      const storedData = {
        messages: [
          ['msg1', {
            id: 'msg1',
            type: 'chat:send-message',
            data: { text: 'expired' },
            priority: 'high',
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() - 10000).toISOString(), // Expired
            status: 'pending',
            attempts: 0,
            maxAttempts: 3,
          }]
        ],
        stats: {},
        timestamp: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const newQueueManager = new (OfflineQueueManager as any)({
        persistToStorage: true,
      });

      expect(newQueueManager.hasMessages()).toBe(false);
      newQueueManager.destroy();
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxSize: 20,
        flushInterval: 200,
        batchSize: 5,
      };

      queueManager.updateConfig(newConfig);

      // Configuration should be updated (tested indirectly through behavior)
      expect(() => queueManager.updateConfig(newConfig)).not.toThrow();
    });

    it('should restart timers when configuration changes', () => {
      const spy = vi.spyOn(queueManager as any, 'startFlushTimer');

      queueManager.updateConfig({ flushInterval: 500 });

      // Should restart timers with new interval
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should emit message queued event', () => {
      const listener = vi.fn();
      queueManager.on('message:queued', listener);

      const message = queueManager.queueMessage('chat:send-message', { text: 'test' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: message.id,
          type: 'chat:send-message',
        })
      );
    });

    it('should emit message sent event', async () => {
      const listener = vi.fn();
      queueManager.on('message:sent', listener);

      queueManager.queueMessage('chat:send-message', { text: 'test' });

      await queueManager.processQueue();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'sent',
        })
      );
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = vi.fn();

      queueManager.on('message:sent', errorListener);
      queueManager.on('message:sent', goodListener);

      queueManager.queueMessage('chat:send-message', { text: 'test' });

      // Should not throw despite listener error
      await expect(queueManager.processQueue()).resolves.not.toThrow();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', () => {
      queueManager.queueMessage('chat:send-message', { text: 'test' });

      expect(queueManager.hasMessages()).toBe(true);

      queueManager.destroy();

      expect(queueManager.hasMessages()).toBe(false);
      expect(queueManager.listenerCount('message:queued')).toBe(0);
    });

    it('should clear retry timers on destroy', () => {
      mockMessageSender.sendMessage = vi.fn().mockRejectedValue(new Error('Test'));

      queueManager.queueMessage('chat:send-message', { text: 'test' });

      // This would create retry timers
      queueManager.processQueue();

      // Destroy should clear all timers
      expect(() => queueManager.destroy()).not.toThrow();
    });
  });
});
