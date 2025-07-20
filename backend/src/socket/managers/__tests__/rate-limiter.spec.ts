import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChatRateLimiter, SlowModeManager } from '../rate-limiter';

describe('ChatRateLimiter', () => {
  let rateLimiter: ChatRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    rateLimiter = ChatRateLimiter.getInstance();
    // Reset internal state
    (rateLimiter as any).limits.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('canSendMessage', () => {
    it('should allow first message', () => {
      const canSend = rateLimiter.canSendMessage('user-123', 'viewer');
      expect(canSend).toBe(true);
    });

    it('should enforce viewer limits', () => {
      const userId = 'user-123';
      
      // Send 10 messages (viewer limit)
      for (let i = 0; i < 10; i++) {
        expect(rateLimiter.canSendMessage(userId, 'viewer')).toBe(true);
      }
      
      // 11th message should be blocked
      expect(rateLimiter.canSendMessage(userId, 'viewer')).toBe(false);
    });

    it('should have different limits for different roles', () => {
      // Viewer: 10 messages
      for (let i = 0; i < 10; i++) {
        rateLimiter.canSendMessage('viewer-123', 'viewer');
      }
      expect(rateLimiter.canSendMessage('viewer-123', 'viewer')).toBe(false);

      // Subscriber: 20 messages
      for (let i = 0; i < 20; i++) {
        expect(rateLimiter.canSendMessage('sub-123', 'subscriber')).toBe(true);
      }
      expect(rateLimiter.canSendMessage('sub-123', 'subscriber')).toBe(false);

      // Admin: unlimited
      for (let i = 0; i < 100; i++) {
        expect(rateLimiter.canSendMessage('admin-123', 'admin')).toBe(true);
      }
    });

    it('should reset after window expires', () => {
      const userId = 'user-123';
      
      // Use up limit
      for (let i = 0; i < 10; i++) {
        rateLimiter.canSendMessage(userId, 'viewer');
      }
      expect(rateLimiter.canSendMessage(userId, 'viewer')).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(61 * 1000); // 61 seconds

      // Should be able to send again
      expect(rateLimiter.canSendMessage(userId, 'viewer')).toBe(true);
    });
  });

  describe('getRemainingMessages', () => {
    it('should return correct remaining messages', () => {
      const userId = 'user-123';
      
      expect(rateLimiter.getRemainingMessages(userId, 'viewer')).toBe(10);
      
      rateLimiter.canSendMessage(userId, 'viewer');
      expect(rateLimiter.getRemainingMessages(userId, 'viewer')).toBe(9);
      
      for (let i = 0; i < 9; i++) {
        rateLimiter.canSendMessage(userId, 'viewer');
      }
      expect(rateLimiter.getRemainingMessages(userId, 'viewer')).toBe(0);
    });

    it('should return -1 for unlimited roles', () => {
      expect(rateLimiter.getRemainingMessages('admin-123', 'admin')).toBe(-1);
      expect(rateLimiter.getRemainingMessages('streamer-123', 'streamer')).toBe(-1);
    });
  });

  describe('getResetTime', () => {
    it('should return time until reset', () => {
      const userId = 'user-123';
      
      rateLimiter.canSendMessage(userId, 'viewer');
      
      const resetTime = rateLimiter.getResetTime(userId, 'viewer');
      expect(resetTime).toBeGreaterThan(59000); // > 59 seconds
      expect(resetTime).toBeLessThanOrEqual(60000); // <= 60 seconds
    });

    it('should return 0 if no limit active', () => {
      expect(rateLimiter.getResetTime('new-user', 'viewer')).toBe(0);
    });
  });

  describe('cooldown', () => {
    it('should apply cooldown', () => {
      const userId = 'user-123';
      
      rateLimiter.applyCooldown(userId);
      
      expect(rateLimiter.isInCooldown(userId)).toBe(true);
      expect(rateLimiter.canSendMessage(userId, 'viewer')).toBe(true); // Cooldown checked separately
    });

    it('should expire cooldown', () => {
      const userId = 'user-123';
      
      rateLimiter.applyCooldown(userId, 10000); // 10 second cooldown
      expect(rateLimiter.isInCooldown(userId)).toBe(true);
      
      vi.advanceTimersByTime(11000);
      expect(rateLimiter.isInCooldown(userId)).toBe(false);
    });
  });

  describe('resetUserLimit', () => {
    it('should reset all limits for a user', () => {
      const userId = 'user-123';
      
      // Create limits
      for (let i = 0; i < 10; i++) {
        rateLimiter.canSendMessage(userId, 'viewer');
      }
      rateLimiter.applyCooldown(userId);
      
      expect(rateLimiter.canSendMessage(userId, 'viewer')).toBe(false);
      expect(rateLimiter.isInCooldown(userId)).toBe(true);
      
      // Reset
      rateLimiter.resetUserLimit(userId);
      
      expect(rateLimiter.canSendMessage(userId, 'viewer')).toBe(true);
      expect(rateLimiter.isInCooldown(userId)).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up expired entries', () => {
      // Create some entries
      rateLimiter.canSendMessage('user-1', 'viewer');
      rateLimiter.canSendMessage('user-2', 'viewer');
      
      // Check internal state has entries
      expect((rateLimiter as any).limits.size).toBe(2);
      
      // Advance time past expiry
      vi.advanceTimersByTime(2 * 60 * 1000); // 2 minutes
      
      // Trigger cleanup (normally runs every minute)
      (rateLimiter as any).cleanup();
      
      expect((rateLimiter as any).limits.size).toBe(0);
    });
  });
});

describe('SlowModeManager', () => {
  let slowModeManager: SlowModeManager;

  beforeEach(() => {
    vi.useFakeTimers();
    slowModeManager = SlowModeManager.getInstance();
    // Reset internal state
    (slowModeManager as any).slowModes.clear();
    (slowModeManager as any).userLastMessage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('enable/disable slow mode', () => {
    it('should enable slow mode for a stream', () => {
      slowModeManager.enableSlowMode('stream-123', 30);
      
      expect(slowModeManager.isSlowModeEnabled('stream-123')).toBe(true);
      expect(slowModeManager.getSlowModeDelay('stream-123')).toBe(30);
    });

    it('should disable slow mode', () => {
      slowModeManager.enableSlowMode('stream-123', 30);
      slowModeManager.disableSlowMode('stream-123');
      
      expect(slowModeManager.isSlowModeEnabled('stream-123')).toBe(false);
      expect(slowModeManager.getSlowModeDelay('stream-123')).toBe(0);
    });

    it('should clean up user timestamps when disabling', () => {
      slowModeManager.enableSlowMode('stream-123', 30);
      slowModeManager.canSendInSlowMode('user-123', 'stream-123');
      
      expect((slowModeManager as any).userLastMessage.size).toBe(1);
      
      slowModeManager.disableSlowMode('stream-123');
      
      expect((slowModeManager as any).userLastMessage.size).toBe(0);
    });
  });

  describe('canSendInSlowMode', () => {
    it('should allow first message immediately', () => {
      slowModeManager.enableSlowMode('stream-123', 30);
      
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-123')).toBe(true);
    });

    it('should enforce slow mode delay', () => {
      slowModeManager.enableSlowMode('stream-123', 30);
      
      // First message
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-123')).toBe(true);
      
      // Immediate second message should be blocked
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-123')).toBe(false);
      
      // After 30 seconds, should be allowed
      vi.advanceTimersByTime(30000);
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-123')).toBe(true);
    });

    it('should bypass slow mode for privileged roles', () => {
      slowModeManager.enableSlowMode('stream-123', 30);
      
      // Send multiple messages as moderator
      expect(slowModeManager.canSendInSlowMode('mod-123', 'stream-123', 'moderator')).toBe(true);
      expect(slowModeManager.canSendInSlowMode('mod-123', 'stream-123', 'moderator')).toBe(true);
      
      // Same for streamer and admin
      expect(slowModeManager.canSendInSlowMode('streamer-123', 'stream-123', 'streamer')).toBe(true);
      expect(slowModeManager.canSendInSlowMode('streamer-123', 'stream-123', 'streamer')).toBe(true);
    });

    it('should track users per stream independently', () => {
      slowModeManager.enableSlowMode('stream-123', 30);
      slowModeManager.enableSlowMode('stream-456', 60);
      
      // User can send to both streams
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-123')).toBe(true);
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-456')).toBe(true);
      
      // But then blocked on both
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-123')).toBe(false);
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-456')).toBe(false);
      
      // Stream 123 unblocks first (30s)
      vi.advanceTimersByTime(30000);
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-123')).toBe(true);
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-456')).toBe(false);
      
      // Stream 456 needs more time (60s total)
      vi.advanceTimersByTime(30000);
      expect(slowModeManager.canSendInSlowMode('user-123', 'stream-456')).toBe(true);
    });
  });

  describe('getRemainingSlowModeTime', () => {
    it('should return remaining time', () => {
      slowModeManager.enableSlowMode('stream-123', 30);
      
      // No last message
      expect(slowModeManager.getRemainingSlowModeTime('new-user', 'stream-123')).toBe(0);
      
      // Send message
      slowModeManager.canSendInSlowMode('user-123', 'stream-123');
      
      // Should have ~30 seconds remaining
      expect(slowModeManager.getRemainingSlowModeTime('user-123', 'stream-123')).toBeCloseTo(30, 1);
      
      // After 10 seconds
      vi.advanceTimersByTime(10000);
      expect(slowModeManager.getRemainingSlowModeTime('user-123', 'stream-123')).toBeCloseTo(20, 1);
      
      // After 30 seconds total
      vi.advanceTimersByTime(20000);
      expect(slowModeManager.getRemainingSlowModeTime('user-123', 'stream-123')).toBe(0);
    });

    it('should return 0 if slow mode disabled', () => {
      expect(slowModeManager.getRemainingSlowModeTime('user-123', 'stream-123')).toBe(0);
    });
  });
});