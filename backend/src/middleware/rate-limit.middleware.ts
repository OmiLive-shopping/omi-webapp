import { Request, Response } from 'express';
import rateLimit, { Options, RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { unifiedResponse } from 'uni-response';

import { RedisClient } from '../config/redis.config.js';

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  keyPrefix?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Default rate limit configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later',
    keyPrefix: 'auth',
  },
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later',
    keyPrefix: 'api',
  },
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 uploads per hour
    message: 'Upload limit exceeded, please try again later',
    keyPrefix: 'upload',
  },
  stream: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute for real-time features
    message: 'Rate limit exceeded for streaming endpoints',
    keyPrefix: 'stream',
  },
  search: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: 'Too many search requests, please slow down',
    keyPrefix: 'search',
  },
};

/**
 * Creates a rate limiter with Redis store support
 * Falls back to memory store if Redis is not available
 */
export function createRateLimiter(options: RateLimitOptions = {}): RateLimitRequestHandler {
  const redisClient = RedisClient.getInstance();
  const client = redisClient.getClient();

  const baseOptions: Partial<Options> = {
    windowMs: options.windowMs || RATE_LIMIT_CONFIGS.api.windowMs,
    max: options.max || RATE_LIMIT_CONFIGS.api.max,
    message: options.message || RATE_LIMIT_CONFIGS.api.message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json(
        unifiedResponse(false, options.message || 'Too many requests, please try again later', {
          retryAfter: req.rateLimit?.resetTime
            ? new Date(req.rateLimit.resetTime).toISOString()
            : undefined,
        }),
      );
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
  };

  // Use Redis store if available, otherwise fall back to memory store
  if (client) {
    return rateLimit({
      ...baseOptions,
      store: new RedisStore({
        client: client as any,
        prefix: options.keyPrefix || 'rl',
      }),
    });
  } else {
    // Fall back to memory store silently
    return rateLimit(baseOptions);
  }
}

// Pre-configured rate limiters for common use cases
export const authRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.auth);
export const apiRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.api);
export const uploadRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.upload);
export const streamRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.stream);
export const searchRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.search);

// Role-based rate limiting
export function createRoleBasedRateLimiter(
  getRoleFromRequest: (req: Request) => string | undefined,
): RateLimitRequestHandler {
  const rateLimiters: Record<string, RateLimitRequestHandler> = {
    anonymous: createRateLimiter({ max: 50, windowMs: 15 * 60 * 1000 }),
    user: createRateLimiter({ max: 200, windowMs: 15 * 60 * 1000 }),
    premium: createRateLimiter({ max: 500, windowMs: 15 * 60 * 1000 }),
    admin: createRateLimiter({ max: 1000, windowMs: 15 * 60 * 1000 }),
  };

  return (req: Request, res: Response, next: any) => {
    const role = getRoleFromRequest(req) || 'anonymous';
    const limiter = rateLimiters[role] || rateLimiters.anonymous;
    limiter(req, res, next);
  };
}
