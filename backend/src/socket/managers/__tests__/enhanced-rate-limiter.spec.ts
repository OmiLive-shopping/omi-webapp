import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createRateLimitedHandler, EnhancedRateLimiter } from '../enhanced-rate-limiter';

describe('EnhancedRateLimiter', () => {
  let rateLimiter: EnhancedRateLimiter;

  beforeEach(() => {
    rateLimiter = EnhancedRateLimiter.getInstance();
    // Clear any existing data
    vi.clearAllMocks();
  });

  describe('Basic Rate Limiting', () => {
    test('should allow requests within limit', async () => {
      const result = await rateLimiter.checkLimit('chat:message', 'user123', 'viewer');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 limit - 1 used
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    test('should deny requests exceeding limit', async () => {
      const userId = 'user123';
      const eventType = 'chat:message';

      // Make 10 requests (the limit for chat:message)
      for (let i = 0; i < 10; i++) {
        await rateLimiter.recordEvent(eventType, userId, 'viewer');
      }

      // 11th request should be denied
      const result = await rateLimiter.checkLimit(eventType, userId, 'viewer');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reason).toBe('Rate limit exceeded');
    });

    test('should reset limits after window expires', async () => {
      const userId = 'user123';
      const eventType = 'chat:message';

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await rateLimiter.recordEvent(eventType, userId, 'viewer');
      }

      // Mock time to simulate window expiration
      const originalNow = Date.now;
      Date.now = vi.fn(() => originalNow() + 61 * 1000); // 61 seconds later

      const result = await rateLimiter.checkLimit(eventType, userId, 'viewer');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('Role-based Limits', () => {
    test('should apply role multipliers correctly', async () => {
      const userId = 'user123';
      const eventType = 'chat:message';

      // Viewer: 10 messages (1.0 multiplier)
      const viewerResult = await rateLimiter.checkLimit(eventType, userId, 'viewer');
      expect(viewerResult.allowed).toBe(true);

      // Moderator: 30 messages (3.0 multiplier)
      const moderatorResult = await rateLimiter.checkLimit(eventType, userId, 'moderator');
      expect(moderatorResult.allowed).toBe(true);

      // Admin: 100 messages (10.0 multiplier)
      const adminResult = await rateLimiter.checkLimit(eventType, userId, 'admin');
      expect(adminResult.allowed).toBe(true);
    });

    test('should allow unlimited requests for streamers and admins for certain events', async () => {
      const userId = 'streamer123';
      const eventType = 'chat:message';

      // Make many requests as streamer
      for (let i = 0; i < 100; i++) {
        await rateLimiter.recordEvent(eventType, userId, 'streamer');
        const result = await rateLimiter.checkLimit(eventType, userId, 'streamer');
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe('Event-specific Limits', () => {
    test('should have different limits for different event types', async () => {
      const userId = 'user123';

      // Chat message: 10 per minute
      const chatResult = await rateLimiter.getLimitStatus('chat:message', userId, 'viewer');
      expect(chatResult.remaining).toBe(10);

      // VDO stats: 60 per minute
      const statsResult = await rateLimiter.getLimitStatus('vdo:stats:update', userId, 'viewer');
      expect(statsResult.remaining).toBe(60);

      // Chat typing: 20 per minute
      const typingResult = await rateLimiter.getLimitStatus('chat:typing', userId, 'viewer');
      expect(typingResult.remaining).toBe(20);
    });
  });

  describe('IP-based Rate Limiting', () => {
    test('should limit by IP address when provided', async () => {
      const userId1 = 'user123';
      const userId2 = 'user456';
      const ipAddress = '192.168.1.100';
      const eventType = 'chat:message';

      // Both users from same IP
      // Exhaust limit for first user
      for (let i = 0; i < 10; i++) {
        await rateLimiter.recordEvent(eventType, userId1, 'viewer', ipAddress);
      }

      // Check if IP limit affects second user
      const result = await rateLimiter.checkLimit(eventType, userId2, 'viewer', ipAddress);

      // Should be limited by IP even though it's a different user
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('IP address rate limit exceeded');
    });
  });

  describe('Penalty System', () => {
    test('should apply penalties for violations', async () => {
      const userId = 'user123';
      const eventType = 'chat:message';

      // Apply penalty
      await rateLimiter.applyPenalty(eventType, userId, 5000, 'Spam detected');

      // Check that user is blocked
      const result = await rateLimiter.checkLimit(eventType, userId, 'viewer');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Temporarily blocked due to rate limit violations');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should track violations count', async () => {
      const userId = 'user123';
      const eventType = 'chat:message';

      // Apply multiple penalties
      await rateLimiter.applyPenalty(eventType, userId, 1000);
      await rateLimiter.applyPenalty(eventType, userId, 1000);

      const status = await rateLimiter.getLimitStatus(eventType, userId, 'viewer');
      expect(status.violations).toBe(2);
    });
  });

  describe('Statistics', () => {
    test('should provide rate limiting statistics', async () => {
      const userId = 'user123';
      const eventType = 'chat:message';

      // Create some violations
      await rateLimiter.applyPenalty(eventType, userId, 1000);
      await rateLimiter.applyPenalty('chat:typing', userId, 1000);

      const stats = await rateLimiter.getStats();

      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.blockedEntries).toBeGreaterThan(0);
      expect(stats.violationsByEvent).toHaveProperty('chat:message');
      expect(stats.topViolators.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    test('should reset limits for user', async () => {
      const userId = 'user123';
      const eventType = 'chat:message';

      // Create some data
      await rateLimiter.recordEvent(eventType, userId, 'viewer');
      await rateLimiter.applyPenalty(eventType, userId, 1000);

      // Reset limits
      await rateLimiter.resetLimits(userId, eventType);

      // Check that limits are reset
      const status = await rateLimiter.getLimitStatus(eventType, userId, 'viewer');
      expect(status.isBlocked).toBe(false);
      expect(status.violations).toBe(0);
    });
  });
});

describe('createRateLimitedHandler', () => {
  test('should create a rate-limited handler that enforces limits', async () => {
    const mockHandler = vi.fn();
    const mockSocket = {
      userId: 'user123',
      role: 'viewer',
      emit: vi.fn(),
      handshake: {
        address: '192.168.1.100',
        headers: {
          'user-agent': 'test-agent',
        },
      },
    };

    const rateLimitedHandler = createRateLimitedHandler('chat:message', mockHandler);

    // First call should succeed
    await rateLimitedHandler(mockSocket, { message: 'test1' });
    expect(mockHandler).toHaveBeenCalledTimes(1);

    // Make many more calls to exceed limit
    for (let i = 0; i < 15; i++) {
      await rateLimitedHandler(mockSocket, { message: `test${i + 2}` });
    }

    // Should emit rate limit exceeded
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'rate_limit_exceeded',
      expect.objectContaining({
        eventType: 'chat:message',
        reason: expect.any(String),
        retryAfter: expect.any(Number),
      }),
    );

    // Original handler should not be called for rate-limited requests
    expect(mockHandler).toHaveBeenCalledTimes(10); // Only up to the limit
  });

  test('should handle errors gracefully', async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const mockSocket = {
      userId: 'user123',
      role: 'viewer',
      emit: vi.fn(),
      handshake: {
        address: '192.168.1.100',
      },
    };

    const rateLimitedHandler = createRateLimitedHandler('chat:message', mockHandler);

    await rateLimitedHandler(mockSocket, { message: 'test' });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      message: 'Internal server error',
    });
  });
});
