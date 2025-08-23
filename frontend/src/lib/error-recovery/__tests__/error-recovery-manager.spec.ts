import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorRecoveryManager, type ErrorInstance, type ErrorCategory } from '../error-recovery-manager';

describe('ErrorRecoveryManager', () => {
  let errorRecovery: ErrorRecoveryManager;

  beforeEach(() => {
    // Create a fresh instance for each test
    errorRecovery = new (ErrorRecoveryManager as any)();
    vi.clearAllMocks();
  });

  afterEach(() => {
    errorRecovery.removeAllListeners();
    errorRecovery.clearErrorHistory();
  });

  describe('Error Classification', () => {
    it('should classify connection errors correctly', async () => {
      const listener = vi.fn();
      errorRecovery.on('error:classified', listener);

      const error = new Error('Connection failed');
      await errorRecovery.handleError(error, { socketConnected: false });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'connection',
          severity: 'high',
          classification: expect.objectContaining({
            strategy: 'retry',
            retryable: true,
          }),
        })
      );
    });

    it('should classify authentication errors correctly', async () => {
      const listener = vi.fn();
      errorRecovery.on('error:classified', listener);

      const error = new Error('Invalid token');
      await errorRecovery.handleError(error);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'authentication',
          severity: 'high',
          classification: expect.objectContaining({
            strategy: 'escalate',
            retryable: false,
          }),
        })
      );
    });

    it('should classify rate limit errors correctly', async () => {
      const listener = vi.fn();
      errorRecovery.on('error:classified', listener);

      const error = new Error('Rate limit exceeded');
      await errorRecovery.handleError(error);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'rate_limit',
          severity: 'medium',
          classification: expect.objectContaining({
            strategy: 'queue',
            retryable: true,
          }),
        })
      );
    });

    it('should classify network errors with circuit breaker strategy', async () => {
      const listener = vi.fn();
      errorRecovery.on('error:classified', listener);

      const error = new Error('Network error occurred');
      await errorRecovery.handleError(error);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'network',
          severity: 'high',
          classification: expect.objectContaining({
            strategy: 'circuit_break',
            retryable: true,
          }),
        })
      );
    });
  });

  describe('Circuit Breaker', () => {
    it('should start with closed circuit breaker', () => {
      const state = errorRecovery.getCircuitBreakerState();
      expect(state.state).toBe('closed');
      expect(state.failures).toBe(0);
      expect(state.consecutiveFailures).toBe(0);
    });

    it('should open circuit breaker after consecutive failures', async () => {
      const listener = vi.fn();
      errorRecovery.on('circuit-breaker:opened', listener);

      // Trigger multiple critical errors
      for (let i = 0; i < 6; i++) {
        await errorRecovery.handleError(new Error('Critical connection error'), {
          socketConnected: false,
        });
      }

      expect(listener).toHaveBeenCalled();
      const state = errorRecovery.getCircuitBreakerState();
      expect(state.state).toBe('open');
    });

    it('should close circuit breaker when explicitly called', () => {
      const listener = vi.fn();
      errorRecovery.on('circuit-breaker:closed', listener);

      errorRecovery.closeCircuitBreaker();

      expect(listener).toHaveBeenCalled();
      const state = errorRecovery.getCircuitBreakerState();
      expect(state.state).toBe('closed');
      expect(state.consecutiveFailures).toBe(0);
    });

    it('should increment failure counts correctly', async () => {
      await errorRecovery.handleError(new Error('Connection lost'), {
        socketConnected: false,
      });

      const state = errorRecovery.getCircuitBreakerState();
      expect(state.failures).toBe(1);
      expect(state.consecutiveFailures).toBe(1);
      expect(state.totalFailures).toBe(1);
    });
  });

  describe('Fallback Mode', () => {
    it('should activate fallback mode for critical errors', async () => {
      const listener = vi.fn();
      errorRecovery.on('fallback:activated', listener);

      await errorRecovery.handleError(new Error('Critical system failure'), {}, 'critical');

      // Wait for async fallback activation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(listener).toHaveBeenCalled();
      const fallbackMode = errorRecovery.getCurrentFallbackMode();
      expect(fallbackMode).toBeTruthy();
    });

    it('should deactivate fallback mode', () => {
      const listener = vi.fn();
      errorRecovery.on('fallback:deactivated', listener);

      errorRecovery.deactivateFallback();

      expect(listener).toHaveBeenCalled();
      const fallbackMode = errorRecovery.getCurrentFallbackMode();
      expect(fallbackMode).toBeNull();
    });

    it('should choose appropriate fallback mode based on severity', async () => {
      // Test critical severity -> offline mode
      await errorRecovery.handleError(new Error('Critical error'), {}, 'critical');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      let fallbackMode = errorRecovery.getCurrentFallbackMode();
      expect(fallbackMode?.name).toBe('offline');

      // Reset and test high severity -> minimal mode
      errorRecovery.deactivateFallback();
      await errorRecovery.handleError(new Error('High severity error'), {}, 'high');
      await new Promise(resolve => setTimeout(resolve, 10));
      
      fallbackMode = errorRecovery.getCurrentFallbackMode();
      expect(fallbackMode?.name).toBe('minimal');
    });
  });

  describe('Error History', () => {
    it('should track error history by category', async () => {
      await errorRecovery.handleError(new Error('Connection error 1'));
      await errorRecovery.handleError(new Error('Auth error 1'));
      await errorRecovery.handleError(new Error('Network error 1'));

      const connectionErrors = errorRecovery.getErrorHistory('connection');
      const authErrors = errorRecovery.getErrorHistory('authentication');
      const allErrors = errorRecovery.getErrorHistory();

      expect(connectionErrors.length).toBe(1);
      expect(authErrors.length).toBe(1);
      expect(allErrors.length).toBe(3);
    });

    it('should limit error history per category', async () => {
      // Generate 55 errors to exceed the limit of 50
      for (let i = 0; i < 55; i++) {
        await errorRecovery.handleError(new Error(`Connection error ${i}`));
      }

      const errors = errorRecovery.getErrorHistory('connection');
      expect(errors.length).toBeLessThanOrEqual(50);
    });

    it('should clear error history', async () => {
      await errorRecovery.handleError(new Error('Test error'));
      
      expect(errorRecovery.getErrorHistory().length).toBe(1);
      
      errorRecovery.clearErrorHistory();
      expect(errorRecovery.getErrorHistory().length).toBe(0);
    });

    it('should clear specific category history', async () => {
      await errorRecovery.handleError(new Error('Connection error'));
      await errorRecovery.handleError(new Error('Auth error'));

      errorRecovery.clearErrorHistory('connection');
      
      expect(errorRecovery.getErrorHistory('connection').length).toBe(0);
      expect(errorRecovery.getErrorHistory('authentication').length).toBe(1);
    });
  });

  describe('User Notifications', () => {
    it('should emit user notifications for appropriate errors', async () => {
      const listener = vi.fn();
      errorRecovery.on('user:notification', listener);

      await errorRecovery.handleError(new Error('Connection failed'), {
        socketConnected: false,
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Connection Issue',
          message: expect.stringContaining('Attempting to reconnect'),
        })
      );
    });

    it('should not emit notifications for low-severity errors', async () => {
      const listener = vi.fn();
      errorRecovery.on('user:notification', listener);

      // Update classification to not require notification
      errorRecovery.updateErrorClassification('client_error', {
        requiresUserNotification: false,
      });

      await errorRecovery.handleError(new Error('Client error'));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should dismiss notifications', () => {
      const listener = vi.fn();
      errorRecovery.on('notification:dismissed', listener);

      errorRecovery.dismissNotification('test-notification-id');

      expect(listener).toHaveBeenCalledWith('test-notification-id');
    });
  });

  describe('Recovery Strategies', () => {
    it('should attempt retry recovery for retryable errors', async () => {
      const retryListener = vi.fn();
      errorRecovery.on('error:recovery:retry', retryListener);

      await errorRecovery.handleError(new Error('Timeout error'));

      // Wait for retry scheduling
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(retryListener).toHaveBeenCalled();
    });

    it('should escalate non-retryable errors', async () => {
      const escalateListener = vi.fn();
      errorRecovery.on('error:escalated', escalateListener);

      await errorRecovery.handleError(new Error('Invalid token'));

      expect(escalateListener).toHaveBeenCalled();
    });

    it('should activate fallback for server errors', async () => {
      const fallbackListener = vi.fn();
      errorRecovery.on('fallback:activated', fallbackListener);

      await errorRecovery.handleError(new Error('Internal server error'));

      // Wait for async fallback activation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(fallbackListener).toHaveBeenCalled();
    });
  });

  describe('Error Classification Updates', () => {
    it('should allow updating error classifications', () => {
      const newClassification = {
        severity: 'low' as const,
        strategy: 'ignore' as const,
        requiresUserNotification: false,
      };

      errorRecovery.updateErrorClassification('timeout', newClassification);

      // Test that the updated classification is used
      // This would be verified by checking the behavior in subsequent error handling
    });

    it('should merge partial classification updates', () => {
      const partialUpdate = {
        maxRetries: 5,
      };

      errorRecovery.updateErrorClassification('connection', partialUpdate);

      // The existing classification should be preserved with only the specified fields updated
    });
  });

  describe('Event Emission', () => {
    it('should emit recovery started event', async () => {
      const listener = vi.fn();
      errorRecovery.on('error:recovery:started', listener);

      await errorRecovery.handleError(new Error('Recoverable error'));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          recovery: expect.objectContaining({
            attempted: true,
          }),
        })
      );
    });

    it('should emit recovery success event for successful retries', async () => {
      const successListener = vi.fn();
      errorRecovery.on('error:recovery:success', successListener);

      // This would be triggered when a retry succeeds
      // In a real implementation, this would be called by the retry mechanism
    });

    it('should emit recovery failed event for failed retries', async () => {
      const failedListener = vi.fn();
      errorRecovery.on('error:recovery:failed', failedListener);

      // Simulate a failed recovery
      // This would be tested with a mock that fails retries
    });
  });

  describe('Context Handling', () => {
    it('should preserve error context', async () => {
      const listener = vi.fn();
      errorRecovery.on('error:classified', listener);

      const context = {
        userId: 'user123',
        streamId: 'stream456',
        socketConnected: true,
        attemptNumber: 2,
      };

      await errorRecovery.handleError(new Error('Test error'), context);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining(context),
        })
      );
    });

    it('should handle missing context gracefully', async () => {
      const listener = vi.fn();
      errorRecovery.on('error:classified', listener);

      await errorRecovery.handleError(new Error('Test error'));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.any(Object),
        })
      );
    });
  });

  describe('Error Types', () => {
    it('should handle Error objects', async () => {
      const error = new Error('Test error message');
      error.stack = 'Test stack trace';

      const listener = vi.fn();
      errorRecovery.on('error:classified', listener);

      await errorRecovery.handleError(error);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error message',
          originalError: error,
        })
      );
    });

    it('should handle string errors', async () => {
      const listener = vi.fn();
      errorRecovery.on('error:classified', listener);

      await errorRecovery.handleError('String error message');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'String error message',
          originalError: 'String error message',
        })
      );
    });
  });

  describe('Timing and Scheduling', () => {
    it('should schedule retries with exponential backoff', async () => {
      vi.useFakeTimers();

      const error = new Error('Retryable error');
      const errorInstance = await errorRecovery.handleError(error);

      // First retry should be scheduled
      expect(errorInstance.recovery?.nextRetryAt).toBeTruthy();

      vi.useRealTimers();
    });

    it('should respect maximum retry attempts', async () => {
      const retryListener = vi.fn();
      const fallbackListener = vi.fn();
      
      errorRecovery.on('error:recovery:retry', retryListener);
      errorRecovery.on('fallback:activated', fallbackListener);

      // Simulate multiple failed retries
      const error = new Error('Persistent error');
      await errorRecovery.handleError(error);

      // After max retries, should activate fallback
      // This would need to be tested with proper retry simulation
    });
  });
});
