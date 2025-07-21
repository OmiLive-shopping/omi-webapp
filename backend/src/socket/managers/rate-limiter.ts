interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class ChatRateLimiter {
  private static instance: ChatRateLimiter;
  private limits: Map<string, RateLimitEntry> = new Map();

  // Configuration
  private readonly MAX_MESSAGES_PER_WINDOW = 10; // 10 messages
  private readonly WINDOW_DURATION = 60 * 1000; // 1 minute
  private readonly COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes cooldown after limit hit

  // Role-based limits
  private readonly ROLE_LIMITS: Record<string, { maxMessages: number; windowDuration: number }> = {
    anonymous: { maxMessages: 5, windowDuration: 60 * 1000 },
    viewer: { maxMessages: 10, windowDuration: 60 * 1000 },
    subscriber: { maxMessages: 20, windowDuration: 60 * 1000 },
    moderator: { maxMessages: 100, windowDuration: 60 * 1000 },
    streamer: { maxMessages: -1, windowDuration: 0 }, // Unlimited
    admin: { maxMessages: -1, windowDuration: 0 }, // Unlimited
  };

  private constructor() {
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  static getInstance(): ChatRateLimiter {
    if (!ChatRateLimiter.instance) {
      ChatRateLimiter.instance = new ChatRateLimiter();
    }
    return ChatRateLimiter.instance;
  }

  /**
   * Check if a user can send a message
   * @returns true if allowed, false if rate limited
   */
  canSendMessage(userId: string, role: string = 'viewer'): boolean {
    const limits = this.ROLE_LIMITS[role] || this.ROLE_LIMITS.viewer;

    // Unlimited for certain roles
    if (limits.maxMessages === -1) {
      return true;
    }

    const key = `${userId}:${role}`;
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry) {
      // First message
      this.limits.set(key, {
        count: 1,
        resetTime: now + limits.windowDuration,
      });
      return true;
    }

    // Check if window has expired
    if (now > entry.resetTime) {
      // Reset window
      this.limits.set(key, {
        count: 1,
        resetTime: now + limits.windowDuration,
      });
      return true;
    }

    // Check if under limit
    if (entry.count < limits.maxMessages) {
      entry.count++;
      return true;
    }

    // Rate limited
    return false;
  }

  /**
   * Get remaining messages for a user
   */
  getRemainingMessages(userId: string, role: string = 'viewer'): number {
    const limits = this.ROLE_LIMITS[role] || this.ROLE_LIMITS.viewer;

    if (limits.maxMessages === -1) {
      return -1; // Unlimited
    }

    const key = `${userId}:${role}`;
    const entry = this.limits.get(key);

    if (!entry || Date.now() > entry.resetTime) {
      return limits.maxMessages;
    }

    return Math.max(0, limits.maxMessages - entry.count);
  }

  /**
   * Get time until rate limit reset
   */
  getResetTime(userId: string, role: string = 'viewer'): number {
    const key = `${userId}:${role}`;
    const entry = this.limits.get(key);

    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }

    return entry.resetTime - Date.now();
  }

  /**
   * Apply a cooldown penalty for spam
   */
  applyCooldown(userId: string, duration?: number): void {
    const cooldownDuration = duration || this.COOLDOWN_DURATION;
    const key = `${userId}:cooldown`;

    this.limits.set(key, {
      count: 999, // High number to ensure blocking
      resetTime: Date.now() + cooldownDuration,
    });
  }

  /**
   * Check if user is in cooldown
   */
  isInCooldown(userId: string): boolean {
    const key = `${userId}:cooldown`;
    const entry = this.limits.get(key);

    return entry ? Date.now() < entry.resetTime : false;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a user (admin action)
   */
  resetUserLimit(userId: string): void {
    // Remove all entries for this user
    for (const key of this.limits.keys()) {
      if (key.startsWith(userId)) {
        this.limits.delete(key);
      }
    }
  }
}

// Slow mode manager for streams
export class SlowModeManager {
  private static instance: SlowModeManager;
  private slowModes: Map<string, number> = new Map(); // streamId -> delay in seconds
  private userLastMessage: Map<string, number> = new Map(); // userId:streamId -> timestamp

  private constructor() {}

  static getInstance(): SlowModeManager {
    if (!SlowModeManager.instance) {
      SlowModeManager.instance = new SlowModeManager();
    }
    return SlowModeManager.instance;
  }

  /**
   * Enable slow mode for a stream
   */
  enableSlowMode(streamId: string, delaySeconds: number): void {
    this.slowModes.set(streamId, delaySeconds);
  }

  /**
   * Disable slow mode for a stream
   */
  disableSlowMode(streamId: string): void {
    this.slowModes.delete(streamId);

    // Clean up user timestamps for this stream
    for (const key of this.userLastMessage.keys()) {
      if (key.endsWith(`:${streamId}`)) {
        this.userLastMessage.delete(key);
      }
    }
  }

  /**
   * Check if stream has slow mode enabled
   */
  isSlowModeEnabled(streamId: string): boolean {
    return this.slowModes.has(streamId);
  }

  /**
   * Get slow mode delay for a stream
   */
  getSlowModeDelay(streamId: string): number {
    return this.slowModes.get(streamId) || 0;
  }

  /**
   * Check if user can send message in slow mode
   */
  canSendInSlowMode(userId: string, streamId: string, role: string = 'viewer'): boolean {
    // Moderators and above bypass slow mode
    if (['moderator', 'streamer', 'admin'].includes(role)) {
      return true;
    }

    const delay = this.slowModes.get(streamId);
    if (!delay) {
      return true; // No slow mode
    }

    const key = `${userId}:${streamId}`;
    const lastMessage = this.userLastMessage.get(key);
    const now = Date.now();

    if (!lastMessage) {
      this.userLastMessage.set(key, now);
      return true;
    }

    const timeSinceLastMessage = (now - lastMessage) / 1000; // Convert to seconds
    if (timeSinceLastMessage >= delay) {
      this.userLastMessage.set(key, now);
      return true;
    }

    return false;
  }

  /**
   * Get remaining time before user can send next message
   */
  getRemainingSlowModeTime(userId: string, streamId: string): number {
    const delay = this.slowModes.get(streamId);
    if (!delay) {
      return 0;
    }

    const key = `${userId}:${streamId}`;
    const lastMessage = this.userLastMessage.get(key);
    if (!lastMessage) {
      return 0;
    }

    const timeSinceLastMessage = (Date.now() - lastMessage) / 1000;
    return Math.max(0, delay - timeSinceLastMessage);
  }
}
