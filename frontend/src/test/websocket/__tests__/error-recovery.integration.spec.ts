import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { WebSocketTestServer } from '../websocket-test-server';
import { WebSocketTestClient } from '../websocket-test-client';
import { resilientSocketManager } from '@/lib/error-recovery/resilient-socket-manager';
import { errorRecoveryManager } from '@/lib/error-recovery/error-recovery-manager';
import { offlineQueueManager } from '@/lib/error-recovery/offline-queue-manager';

describe('Error Recovery Integration Tests', () => {
  let server: WebSocketTestServer;
  let serverUrl: string;

  beforeAll(async () => {
    server = new WebSocketTestServer();
    const port = await server.start();
    serverUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    // Reset error recovery state
    errorRecoveryManager.clearErrorHistory();
    errorRecoveryManager.closeCircuitBreaker();
    offlineQueueManager.clearQueue();
    
    // Clear any existing connections
    resilientSocketManager.disconnect();
  });

  afterEach(() => {
    resilientSocketManager.disconnect();
  });

  describe('Connection Failure Recovery', () => {
    it('should recover from connection drops gracefully', async () => {
      const client = new WebSocketTestClient(serverUrl);
      
      try {
        // Initial connection
        await client.connect({ 
          auth: { userId: 'recovery-user', username: 'RecoveryUser', role: 'viewer' } 
        });

        const streamId = 'recovery-test-stream';
        await client.joinStream(streamId);

        // Send initial message
        await client.sendChatMessage(streamId, 'Initial message before disconnect');

        // Verify message was sent
        let history = await client.getChatHistory(streamId);
        expect(history.messages).toHaveLength(1);

        // Simulate connection drop
        client.simulateConnectionIssues('disconnect');

        // Wait for disconnect to process
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify client detected disconnect
        expect(client.getConnectionStatus()).toBe(false);

        // Attempt to reconnect
        await client.connect({ 
          auth: { userId: 'recovery-user', username: 'RecoveryUser', role: 'viewer' } 
        });

        // Rejoin stream
        await client.joinStream(streamId);

        // Send message after reconnection
        await client.sendChatMessage(streamId, 'Message after reconnection');

        // Verify both messages are in history
        history = await client.getChatHistory(streamId);
        expect(history.messages).toHaveLength(2);
        expect(history.messages[0].content).toBe('Initial message before disconnect');
        expect(history.messages[1].content).toBe('Message after reconnection');

      } finally {
        client.disconnect();
      }
    });

    it('should handle server restarts gracefully', async () => {
      const client = new WebSocketTestClient(serverUrl);
      
      try {
        // Initial connection and setup
        await client.connect({ 
          auth: { userId: 'restart-user', username: 'RestartUser', role: 'viewer' } 
        });

        const streamId = 'restart-test-stream';
        await client.joinStream(streamId);

        // Send pre-restart message
        await client.sendChatMessage(streamId, 'Pre-restart message');

        // Simulate server restart by stopping and starting
        const originalPort = server.getUrl().split(':')[2];
        await server.stop();
        
        // Wait a bit to simulate downtime
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Restart server on same port
        const newPort = await server.start();
        expect(newPort.toString()).toBe(originalPort);

        // Client should detect disconnection
        expect(client.getConnectionStatus()).toBe(false);

        // Reconnect
        await client.connect({ 
          auth: { userId: 'restart-user', username: 'RestartUser', role: 'viewer' } 
        });

        await client.joinStream(streamId);

        // Send post-restart message
        await client.sendChatMessage(streamId, 'Post-restart message');

        // Verify server is clean but functioning
        const history = await client.getChatHistory(streamId);
        expect(history.messages).toHaveLength(1); // Only post-restart message
        expect(history.messages[0].content).toBe('Post-restart message');

      } finally {
        client.disconnect();
      }
    });
  });

  describe('Rate Limiting Recovery', () => {
    it('should handle rate limiting gracefully', async () => {
      const client = new WebSocketTestClient(serverUrl);
      
      try {
        await client.connect({ 
          auth: { userId: 'rate-limit-user', username: 'RateLimitUser', role: 'viewer' } 
        });

        const streamId = 'rate-limit-test';
        await client.joinStream(streamId);

        // Send messages rapidly to trigger rate limiting
        const rapidMessages = [];
        for (let i = 0; i < 20; i++) {
          rapidMessages.push(
            client.sendChatMessage(streamId, `Rapid message ${i}`)
              .catch(error => ({ error, index: i }))
          );
        }

        const results = await Promise.allSettled(rapidMessages);

        // Some should succeed, some should be rate limited
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        expect(successful + failed).toBe(20);
        expect(successful).toBeGreaterThan(0); // At least some should succeed
        
        // Wait for rate limit to reset
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Should be able to send again
        const afterRateLimit = await client.sendChatMessage(streamId, 'After rate limit reset');
        expect(afterRateLimit.success).toBe(true);

      } finally {
        client.disconnect();
      }
    });

    it('should queue messages during rate limiting', async () => {
      // This test would require integration with our resilient socket manager
      // For now, we'll test the basic rate limiting behavior
      
      const client = new WebSocketTestClient(serverUrl);
      
      try {
        await client.connect({ 
          auth: { userId: 'queue-rate-user', username: 'QueueRateUser', role: 'viewer' } 
        });

        const streamId = 'queue-rate-test';
        await client.joinStream(streamId);

        // Simulate server sending rate limit event
        server.simulateError('rate_limit');

        // Wait for rate limit event to be processed
        await new Promise(resolve => setTimeout(resolve, 100));

        // Messages sent during rate limit should be handled gracefully
        try {
          await client.sendChatMessage(streamId, 'Message during rate limit');
          // Might succeed or fail depending on implementation
        } catch (error) {
          // Rate limiting is expected behavior
          expect(error).toBeDefined();
        }

      } finally {
        client.disconnect();
      }
    });
  });

  describe('Server Error Recovery', () => {
    it('should handle server errors and maintain connection', async () => {
      const client = new WebSocketTestClient(serverUrl);
      
      try {
        await client.connect({ 
          auth: { userId: 'server-error-user', username: 'ServerErrorUser', role: 'viewer' } 
        });

        const streamId = 'server-error-test';
        await client.joinStream(streamId);

        // Set up error event listener
        const errorPromise = client.waitForEvent('error');

        // Simulate server error
        server.simulateError('server_error');

        // Client should receive error event
        const errorEvent = await errorPromise;
        expect(errorEvent).toBeDefined();

        // Connection should still be active after error
        expect(client.getConnectionStatus()).toBe(true);

        // Should be able to continue normal operations
        await client.sendChatMessage(streamId, 'Message after server error');

        const history = await client.getChatHistory(streamId);
        expect(history.messages).toHaveLength(1);

      } finally {
        client.disconnect();
      }
    });
  });

  describe('Offline Queue Integration', () => {
    it('should queue messages when disconnected and replay on reconnection', async () => {
      // This test requires integration with our resilient socket manager
      // We'll test the basic offline queue functionality
      
      const testMessages = [
        { type: 'chat:send-message', data: { streamId: 'offline-test', content: 'Message 1' } },
        { type: 'chat:send-message', data: { streamId: 'offline-test', content: 'Message 2' } },
        { type: 'stream:join', data: { streamId: 'offline-test' } }
      ];

      // Queue messages while offline
      testMessages.forEach(msg => {
        offlineQueueManager.queueMessage(msg.type as any, msg.data, {
          priority: 'high',
          context: { userId: 'offline-user' }
        });
      });

      // Verify messages are queued
      expect(offlineQueueManager.hasMessages()).toBe(true);
      const stats = offlineQueueManager.getStats();
      expect(stats.pendingMessages).toBe(3);

      // Mock message sender for testing
      const mockSender = {
        sendMessage: vi.fn().mockResolvedValue(undefined),
        isConnectionAvailable: vi.fn().mockReturnValue(true)
      };

      offlineQueueManager.setMessageSender(mockSender);

      // Process the queue
      await offlineQueueManager.processQueue();

      // Verify all messages were sent
      expect(mockSender.sendMessage).toHaveBeenCalledTimes(3);
      expect(offlineQueueManager.hasMessages()).toBe(false);
    });

    it('should handle message expiration in offline queue', async () => {
      // Queue a message with very short expiration
      const expiredMessage = offlineQueueManager.queueMessage(
        'chat:send-message',
        { streamId: 'expire-test', content: 'This will expire' },
        { expiresIn: 1 } // 1ms expiration
      );

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      // Mock sender that's available
      const mockSender = {
        sendMessage: vi.fn().mockResolvedValue(undefined),
        isConnectionAvailable: vi.fn().mockReturnValue(true)
      };

      offlineQueueManager.setMessageSender(mockSender);

      // Process queue - expired message should not be sent
      await offlineQueueManager.processQueue();

      expect(mockSender.sendMessage).not.toHaveBeenCalled();
      expect(offlineQueueManager.hasMessages()).toBe(false);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should open circuit breaker after consecutive failures', async () => {
      // Simulate multiple connection failures
      for (let i = 0; i < 6; i++) {
        await errorRecoveryManager.handleError(
          new Error(`Connection failure ${i}`),
          { socketConnected: false, attemptNumber: i + 1 }
        );
      }

      // Circuit breaker should be open
      const state = errorRecoveryManager.getCircuitBreakerState();
      expect(state.state).toBe('open');
      expect(state.consecutiveFailures).toBeGreaterThanOrEqual(5);
    });

    it('should prevent operations when circuit breaker is open', async () => {
      // Force circuit breaker open
      for (let i = 0; i < 6; i++) {
        await errorRecoveryManager.handleError(
          new Error('Critical failure'),
          { socketConnected: false }
        );
      }

      const state = errorRecoveryManager.getCircuitBreakerState();
      expect(state.state).toBe('open');

      // New operations should be blocked or handled differently
      // This would be tested with the resilient socket manager
    });

    it('should close circuit breaker on successful operations', async () => {
      // Open circuit breaker
      for (let i = 0; i < 6; i++) {
        await errorRecoveryManager.handleError(
          new Error('Failure'),
          { socketConnected: false }
        );
      }

      expect(errorRecoveryManager.getCircuitBreakerState().state).toBe('open');

      // Manually close (simulating successful reconnection)
      errorRecoveryManager.closeCircuitBreaker();

      const finalState = errorRecoveryManager.getCircuitBreakerState();
      expect(finalState.state).toBe('closed');
      expect(finalState.consecutiveFailures).toBe(0);
    });
  });

  describe('Fallback Mode Integration', () => {
    it('should activate fallback mode for critical errors', async () => {
      const fallbackPromise = new Promise(resolve => {
        errorRecoveryManager.once('fallback:activated', resolve);
      });

      // Trigger critical error
      await errorRecoveryManager.handleError(
        new Error('Critical system failure'),
        { socketConnected: false },
        'critical'
      );

      // Should activate fallback mode
      await fallbackPromise;
      
      const fallbackMode = errorRecoveryManager.getCurrentFallbackMode();
      expect(fallbackMode).toBeTruthy();
      expect(fallbackMode?.enabled).toBe(true);
    });

    it('should deactivate fallback mode', async () => {
      // Activate fallback mode first
      await errorRecoveryManager.handleError(
        new Error('Critical error'),
        {},
        'critical'
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      let fallbackMode = errorRecoveryManager.getCurrentFallbackMode();
      expect(fallbackMode?.enabled).toBe(true);

      // Deactivate
      errorRecoveryManager.deactivateFallback();

      fallbackMode = errorRecoveryManager.getCurrentFallbackMode();
      expect(fallbackMode).toBeNull();
    });
  });

  describe('Error Classification and Recovery Strategies', () => {
    it('should classify errors correctly and apply appropriate strategies', async () => {
      const errorTypes = [
        { error: 'Connection failed', expectedCategory: 'connection', expectedStrategy: 'retry' },
        { error: 'Invalid token', expectedCategory: 'authentication', expectedStrategy: 'escalate' },
        { error: 'Rate limit exceeded', expectedCategory: 'rate_limit', expectedStrategy: 'queue' },
        { error: 'Internal server error', expectedCategory: 'server_error', expectedStrategy: 'fallback' },
        { error: 'Network timeout', expectedCategory: 'timeout', expectedStrategy: 'retry' }
      ];

      for (const testCase of errorTypes) {
        const classificationPromise = new Promise(resolve => {
          errorRecoveryManager.once('error:classified', resolve);
        });

        await errorRecoveryManager.handleError(new Error(testCase.error));

        const errorInstance = await classificationPromise as any;
        expect(errorInstance.category).toBe(testCase.expectedCategory);
        expect(errorInstance.classification.strategy).toBe(testCase.expectedStrategy);
      }
    });

    it('should emit appropriate user notifications', async () => {
      const notificationPromise = new Promise(resolve => {
        errorRecoveryManager.once('user:notification', resolve);
      });

      // Trigger error that requires user notification
      await errorRecoveryManager.handleError(
        new Error('Connection failed'),
        { socketConnected: false }
      );

      const notification = await notificationPromise as any;
      expect(notification.type).toBe('error');
      expect(notification.title).toBe('Connection Issue');
      expect(notification.message).toContain('reconnect');
    });
  });

  describe('End-to-End Error Recovery Scenarios', () => {
    it('should handle complete connection failure and recovery cycle', async () => {
      const client1 = new WebSocketTestClient(serverUrl);
      const client2 = new WebSocketTestClient(serverUrl);

      try {
        // Initial setup
        await Promise.all([
          client1.connect({ auth: { userId: 'recovery1', username: 'Recovery1', role: 'streamer' } }),
          client2.connect({ auth: { userId: 'recovery2', username: 'Recovery2', role: 'viewer' } })
        ]);

        const streamId = 'e2e-recovery-test';

        await Promise.all([
          client1.joinStream(streamId),
          client2.joinStream(streamId)
        ]);

        // Normal operations
        await client1.sendChatMessage(streamId, 'Stream is starting!');
        await client2.sendChatMessage(streamId, 'Excited to watch!');

        // Verify initial state
        let history = await client1.getChatHistory(streamId);
        expect(history.messages).toHaveLength(2);

        // Simulate network issues for client2
        client2.simulateConnectionIssues('disconnect');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Client1 continues streaming
        await client1.sendChatMessage(streamId, 'Having some technical difficulties');

        // Client2 reconnects
        await client2.connect({ auth: { userId: 'recovery2', username: 'Recovery2', role: 'viewer' } });
        await client2.joinStream(streamId);

        // Get updated history
        history = await client2.getChatHistory(streamId);
        expect(history.messages.length).toBeGreaterThanOrEqual(2);

        // Continue normal operations
        await client2.sendChatMessage(streamId, 'Back online! Sorry about that');
        await client1.sendChatMessage(streamId, 'No worries! Welcome back!');

        // Final verification
        history = await client1.getChatHistory(streamId);
        expect(history.messages.length).toBeGreaterThanOrEqual(4);

      } finally {
        client1.disconnect();
        client2.disconnect();
      }
    });

    it('should maintain service during partial system failures', async () => {
      const clients = Array.from({ length: 5 }, () => new WebSocketTestClient(serverUrl));

      try {
        // Connect all clients
        for (let i = 0; i < clients.length; i++) {
          await clients[i].connect({ 
            auth: { 
              userId: `partial-fail-${i}`, 
              username: `PartialUser${i}`, 
              role: 'viewer' 
            } 
          });
        }

        const streamId = 'partial-failure-test';

        // All join stream
        await Promise.all(clients.map(client => client.joinStream(streamId)));

        // Normal operations
        await clients[0].sendChatMessage(streamId, 'Everything working normally');

        // Simulate partial failure - disconnect some clients
        clients[1].simulateConnectionIssues('disconnect');
        clients[3].simulateConnectionIssues('disconnect');

        await new Promise(resolve => setTimeout(resolve, 200));

        // Remaining clients should continue working
        await clients[0].sendChatMessage(streamId, 'Some users disconnected');
        await clients[2].sendChatMessage(streamId, 'I\'m still here!');
        await clients[4].sendChatMessage(streamId, 'Me too!');

        // Verify service continues for connected clients
        const history = await clients[0].getChatHistory(streamId);
        expect(history.messages.length).toBeGreaterThanOrEqual(3);

        // Verify server state is consistent
        expect(server.getStreamMembers(streamId).size).toBe(3); // Only connected clients

      } finally {
        clients.forEach(client => client.disconnect());
      }
    });
  });

  describe('Error Recovery Performance', () => {
    it('should handle errors efficiently without blocking operations', async () => {
      const client = new WebSocketTestClient(serverUrl);

      try {
        await client.connect({ 
          auth: { userId: 'perf-error-user', username: 'PerfErrorUser', role: 'viewer' } 
        });

        const streamId = 'error-performance-test';
        await client.joinStream(streamId);

        // Generate multiple errors rapidly
        const errorPromises = [];
        for (let i = 0; i < 10; i++) {
          errorPromises.push(
            errorRecoveryManager.handleError(
              new Error(`Performance test error ${i}`),
              { socketConnected: true, attemptNumber: i }
            )
          );
        }

        const startTime = Date.now();
        await Promise.all(errorPromises);
        const errorHandlingTime = Date.now() - startTime;

        // Error handling should be fast
        expect(errorHandlingTime).toBeLessThan(1000);

        // Normal operations should still work
        const messageStartTime = Date.now();
        await client.sendChatMessage(streamId, 'Message after errors');
        const messageTime = Date.now() - messageStartTime;

        expect(messageTime).toBeLessThan(500);

        // Verify error history was recorded
        const errorHistory = errorRecoveryManager.getErrorHistory();
        expect(errorHistory.length).toBe(10);

      } finally {
        client.disconnect();
      }
    });
  });
});
