import { Redis } from 'redis';

/**
 * Rate limiting configuration for different event types
 */
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  cooldownMs?: number; // Optional cooldown period after exceeding limit
  bursts?: {
    maxBurst: number; // Allow short bursts up to this limit
    burstWindowMs: number; // Time window for burst detection
  };
}

/**
 * Rate limit entry with advanced tracking
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  violations: number;
  lastViolation?: number;
  isBlocked: boolean;
  blockUntil?: number;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Enhanced rate limiter with event-specific limits, IP/user tracking, and Redis support
 */
export class EnhancedRateLimiter {
  private static instance: EnhancedRateLimiter;
  private limits: Map<string, RateLimitEntry> = new Map();
  private redis?: Redis;
  private useRedis: boolean = false;

  // Event-specific rate limit configurations
  private readonly EVENT_CONFIGS: Record<string, RateLimitConfig> = {
    // Chat events
    'chat:message': {
      maxAttempts: 10,
      windowMs: 60 * 1000, // 1 minute
      cooldownMs: 5 * 60 * 1000, // 5 minutes after violation
      bursts: {
        maxBurst: 3,
        burstWindowMs: 5 * 1000, // 5 seconds
      },
    },
    'chat:typing': {
      maxAttempts: 20,
      windowMs: 60 * 1000,
      bursts: {
        maxBurst: 5,
        burstWindowMs: 10 * 1000,
      },
    },
    'chat:reaction': {
      maxAttempts: 30,
      windowMs: 60 * 1000,
    },
    'chat:delete': {
      maxAttempts: 10,
      windowMs: 60 * 1000,
    },
    'chat:moderate': {
      maxAttempts: 5,
      windowMs: 60 * 1000,
      cooldownMs: 10 * 60 * 1000, // 10 minutes
    },

    // VDO.ninja stream events
    'vdo:stream:event': {
      maxAttempts: 20,
      windowMs: 60 * 1000,
      cooldownMs: 2 * 60 * 1000, // 2 minutes
    },
    'vdo:stats:update': {
      maxAttempts: 60, // Allow frequent stats updates
      windowMs: 60 * 1000,
      bursts: {
        maxBurst: 10,
        burstWindowMs: 5 * 1000,
      },
    },
    'vdo:viewer:event': {
      maxAttempts: 30,
      windowMs: 60 * 1000,
    },
    'vdo:media:event': {
      maxAttempts: 15,
      windowMs: 60 * 1000,
      cooldownMs: 1 * 60 * 1000, // 1 minute
    },
    'vdo:quality:event': {
      maxAttempts: 10,
      windowMs: 60 * 1000,
    },
    'vdo:recording:event': {
      maxAttempts: 5,
      windowMs: 60 * 1000,
      cooldownMs: 5 * 60 * 1000, // 5 minutes
    },
    'vdo:get:analytics': {
      maxAttempts: 20,
      windowMs: 60 * 1000,
    },

    // General stream events
    'stream:join': {
      maxAttempts: 10,
      windowMs: 60 * 1000,
    },
    'stream:leave': {
      maxAttempts: 10,
      windowMs: 60 * 1000,
    },
    'stream:get:stats': {
      maxAttempts: 30,
      windowMs: 60 * 1000,
    },

    // Connection events
    'connection:ping': {
      maxAttempts: 120, // Allow frequent pings
      windowMs: 60 * 1000,
    },
    'connection:reconnect': {
      maxAttempts: 5,
      windowMs: 5 * 60 * 1000, // 5 minutes
    },

    // Default fallback
    default: {
      maxAttempts: 30,
      windowMs: 60 * 1000,
      cooldownMs: 1 * 60 * 1000,
    },
  };

  // Role-based multipliers (applied to base limits)
  private readonly ROLE_MULTIPLIERS: Record<string, number> = {
    anonymous: 0.5,
    viewer: 1.0,
    subscriber: 1.5,
    moderator: 3.0,
    streamer: 5.0,
    admin: 10.0,
  };

  private constructor(redis?: Redis) {
    this.redis = redis;
    this.useRedis = !!redis;

    // Clean up expired entries every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  static getInstance(redis?: Redis): EnhancedRateLimiter {
    if (!EnhancedRateLimiter.instance) {
      EnhancedRateLimiter.instance = new EnhancedRateLimiter(redis);
    }
    return EnhancedRateLimiter.instance;
  }

  /**
   * Check if an event is allowed for a user/IP
   */
  async checkLimit(
    eventType: string,
    identifier: string,
    role: string = 'viewer',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
    reason?: string;
  }> {
    const config = this.getConfigForEvent(eventType, role);
    const now = Date.now();

    // Check both user-based and IP-based limits
    const userKey = `user:${identifier}:${eventType}`;
    const ipKey = ipAddress ? `ip:${ipAddress}:${eventType}` : null;

    const userLimit = await this.checkSingleLimit(userKey, config, now, ipAddress, userAgent);
    const ipLimit = ipKey
      ? await this.checkSingleLimit(ipKey, config, now, ipAddress, userAgent)
      : null;

    // If either limit is exceeded, deny the request
    if (!userLimit.allowed) {
      return userLimit;
    }

    if (ipLimit && !ipLimit.allowed) {
      return {
        ...ipLimit,
        reason: 'IP address rate limit exceeded',
      };
    }

    // Both limits allow the request
    return userLimit;
  }

  /**
   * Record a successful event (increment counters)
   */
  async recordEvent(
    eventType: string,
    identifier: string,
    role: string = 'viewer',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const config = this.getConfigForEvent(eventType, role);
    const now = Date.now();

    const userKey = `user:${identifier}:${eventType}`;
    const ipKey = ipAddress ? `ip:${ipAddress}:${eventType}` : null;

    await this.incrementCounter(userKey, config, now, ipAddress, userAgent);
    if (ipKey) {
      await this.incrementCounter(ipKey, config, now, ipAddress, userAgent);
    }
  }

  /**
   * Apply a penalty/cooldown for violations
   */
  async applyPenalty(
    eventType: string,
    identifier: string,
    duration?: number,
    reason?: string,
  ): Promise<void> {
    const config = this.getConfigForEvent(eventType);
    const penaltyDuration = duration || config.cooldownMs || 5 * 60 * 1000; // 5 minutes default
    const now = Date.now();

    const userKey = `user:${identifier}:${eventType}`;
    const entry = await this.getEntry(userKey);

    entry.violations = (entry.violations || 0) + 1;
    entry.lastViolation = now;
    entry.isBlocked = true;
    entry.blockUntil = now + penaltyDuration;

    await this.setEntry(userKey, entry);

    console.warn(
      `Rate limit penalty applied: ${userKey}, duration: ${penaltyDuration}ms, reason: ${reason}`,
    );
  }

  /**
   * Reset limits for a user (admin action)
   */
  async resetLimits(identifier: string, eventType?: string): Promise<void> {
    if (eventType) {
      const userKey = `user:${identifier}:${eventType}`;
      await this.deleteEntry(userKey);
    } else {
      // Reset all events for this user
      const keys = await this.getAllKeys();
      const userKeys = keys.filter(key => key.startsWith(`user:${identifier}:`));

      for (const key of userKeys) {
        await this.deleteEntry(key);
      }
    }
  }

  /**
   * Get current rate limit status for a user
   */
  async getLimitStatus(
    eventType: string,
    identifier: string,
    role: string = 'viewer',
  ): Promise<{
    remaining: number;
    resetTime: number;
    isBlocked: boolean;
    blockUntil?: number;
    violations: number;
  }> {
    const config = this.getConfigForEvent(eventType, role);
    const userKey = `user:${identifier}:${eventType}`;
    const entry = await this.getEntry(userKey);
    const now = Date.now();

    if (now > entry.resetTime) {
      // Window has expired, reset
      return {
        remaining: config.maxAttempts,
        resetTime: now + config.windowMs,
        isBlocked: false,
        violations: entry.violations || 0,
      };
    }

    return {
      remaining: Math.max(0, config.maxAttempts - entry.count),
      resetTime: entry.resetTime,
      isBlocked: entry.isBlocked && (entry.blockUntil ? now < entry.blockUntil : true),
      blockUntil: entry.blockUntil,
      violations: entry.violations || 0,
    };
  }

  /**
   * Get configuration for an event type with role multiplier applied
   */
  private getConfigForEvent(eventType: string, role: string = 'viewer'): RateLimitConfig {
    const baseConfig = this.EVENT_CONFIGS[eventType] || this.EVENT_CONFIGS.default;
    const multiplier = this.ROLE_MULTIPLIERS[role] || 1.0;

    // Apply role multiplier to limits
    return {
      ...baseConfig,
      maxAttempts: Math.floor(baseConfig.maxAttempts * multiplier),
      bursts: baseConfig.bursts
        ? {
            ...baseConfig.bursts,
            maxBurst: Math.floor(baseConfig.bursts.maxBurst * multiplier),
          }
        : undefined,
    };
  }

  /**
   * Check a single rate limit (user or IP)
   */
  private async checkSingleLimit(
    key: string,
    config: RateLimitConfig,
    now: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
    reason?: string;
  }> {
    const entry = await this.getEntry(key);

    // Check if blocked
    if (entry.isBlocked && entry.blockUntil && now < entry.blockUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
        reason: 'Temporarily blocked due to rate limit violations',
      };
    }

    // Check if window has expired
    if (now > entry.resetTime) {
      // Reset window
      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetTime: now + config.windowMs,
      };
    }

    // Check if under limit
    if (entry.count < config.maxAttempts) {
      return {
        allowed: true,
        remaining: config.maxAttempts - entry.count - 1,
        resetTime: entry.resetTime,
      };
    }

    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      reason: 'Rate limit exceeded',
    };
  }

  /**
   * Increment counter for a key
   */
  private async incrementCounter(
    key: string,
    config: RateLimitConfig,
    now: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const entry = await this.getEntry(key);

    // Reset if window expired
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
      entry.isBlocked = false;
      entry.blockUntil = undefined;
    } else {
      entry.count++;
    }

    // Update metadata
    if (ipAddress) entry.ipAddress = ipAddress;
    if (userAgent) entry.userAgent = userAgent;

    await this.setEntry(key, entry);
  }

  /**
   * Get entry from storage (Redis or memory)
   */
  private async getEntry(key: string): Promise<RateLimitEntry> {
    if (this.useRedis && this.redis) {
      try {
        const data = await this.redis.get(`rate_limit:${key}`);
        if (data) {
          return JSON.parse(data);
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    return (
      this.limits.get(key) || {
        count: 0,
        resetTime: Date.now(),
        violations: 0,
        isBlocked: false,
      }
    );
  }

  /**
   * Set entry in storage
   */
  private async setEntry(key: string, entry: RateLimitEntry): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        const ttl = Math.max(300, Math.ceil((entry.resetTime - Date.now()) / 1000)); // Minimum 5 minutes TTL
        await this.redis.setEx(`rate_limit:${key}`, ttl, JSON.stringify(entry));
        return;
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }

    this.limits.set(key, entry);
  }

  /**
   * Delete entry from storage
   */
  private async deleteEntry(key: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(`rate_limit:${key}`);
        return;
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }

    this.limits.delete(key);
  }

  /**
   * Get all keys (for cleanup and admin operations)
   */
  private async getAllKeys(): Promise<string[]> {
    if (this.useRedis && this.redis) {
      try {
        return await this.redis.keys('rate_limit:*');
      } catch (error) {
        console.error('Redis keys error:', error);
      }
    }

    return Array.from(this.limits.keys());
  }

  /**
   * Clean up expired entries
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();

    if (this.useRedis) {
      // Redis handles TTL automatically, but we can clean up blocked entries
      return;
    }

    // Memory cleanup
    for (const [key, entry] of this.limits.entries()) {
      const isExpired = now > entry.resetTime;
      const isUnblocked = !entry.isBlocked || (entry.blockUntil && now > entry.blockUntil);

      if (isExpired && isUnblocked) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Get statistics for monitoring
   */
  async getStats(): Promise<{
    totalEntries: number;
    blockedEntries: number;
    violationsByEvent: Record<string, number>;
    topViolators: Array<{ key: string; violations: number }>;
  }> {
    const keys = await this.getAllKeys();
    const stats = {
      totalEntries: keys.length,
      blockedEntries: 0,
      violationsByEvent: {} as Record<string, number>,
      topViolators: [] as Array<{ key: string; violations: number }>,
    };

    const violators: Array<{ key: string; violations: number }> = [];

    for (const key of keys) {
      const entry = await this.getEntry(key);

      if (entry.isBlocked) {
        stats.blockedEntries++;
      }

      if (entry.violations > 0) {
        const eventType = key.split(':').pop() || 'unknown';
        stats.violationsByEvent[eventType] =
          (stats.violationsByEvent[eventType] || 0) + entry.violations;
        violators.push({ key, violations: entry.violations });
      }
    }

    // Sort violators by violation count
    stats.topViolators = violators.sort((a, b) => b.violations - a.violations).slice(0, 10);

    return stats;
  }
}

/**
 * Rate limiting middleware for Socket.IO handlers
 */
export function createRateLimitedHandler<T = any>(
  eventType: string,
  handler: (socket: any, data: T) => Promise<void> | void,
  options?: {
    skipAuthCheck?: boolean;
    customKey?: (socket: any, data: T) => string;
  },
) {
  return async (socket: any, data: T) => {
    const rateLimiter = EnhancedRateLimiter.getInstance();

    // Get identifier and metadata (require authentication for chat events)
    const identifier = options?.customKey?.(socket, data) || socket.userId;
    const role = socket.role || 'viewer';
    const ipAddress = socket.handshake?.address;
    const userAgent = socket.handshake?.headers?.['user-agent'];

    try {
      // For chat events, require authentication
      if (eventType.startsWith('chat:') && !identifier) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      // Check rate limit
      const limitCheck = await rateLimiter.checkLimit(
        eventType,
        identifier,
        role,
        ipAddress,
        userAgent,
      );

      if (!limitCheck.allowed) {
        socket.emit('rate_limit_exceeded', {
          eventType,
          reason: limitCheck.reason || 'Rate limit exceeded',
          retryAfter: limitCheck.retryAfter,
          resetTime: limitCheck.resetTime,
        });

        // Apply penalty for repeated violations
        if (limitCheck.reason?.includes('violations')) {
          await rateLimiter.applyPenalty(eventType, identifier, undefined, 'Repeated violations');
        }

        return;
      }

      // Record the event
      await rateLimiter.recordEvent(eventType, identifier, role, ipAddress, userAgent);

      // Call the original handler
      await handler(socket, data);
    } catch (error) {
      console.error(`Rate limited handler error for ${eventType}:`, error);
      socket.emit('error', { message: 'Internal server error' });
    }
  };
}

/**
 * Helper to check if user should receive rate limit status in responses
 */
export async function getRateLimitHeaders(
  eventType: string,
  identifier: string,
  role: string = 'viewer',
): Promise<Record<string, string>> {
  const rateLimiter = EnhancedRateLimiter.getInstance();
  const status = await rateLimiter.getLimitStatus(eventType, identifier, role);

  return {
    'X-RateLimit-Limit': rateLimiter['getConfigForEvent'](eventType, role).maxAttempts.toString(),
    'X-RateLimit-Remaining': status.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(status.resetTime / 1000).toString(),
    ...(status.isBlocked && {
      'X-RateLimit-Blocked-Until': Math.ceil((status.blockUntil || 0) / 1000).toString(),
    }),
  };
}
