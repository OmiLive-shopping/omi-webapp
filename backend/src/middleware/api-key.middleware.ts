import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { unifiedResponse } from 'uni-response';

import { env } from '../config/env-config.js';

// In production, these would be stored in a database
// For now, we'll use environment variables or a simple in-memory store
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit?: {
    max: number;
    windowMs: number;
  };
  createdAt: Date;
  lastUsedAt?: Date;
  active: boolean;
}

// Simple in-memory store for API keys
// In production, this should be replaced with database storage
class ApiKeyStore {
  private keys: Map<string, ApiKey> = new Map();

  constructor() {
    // Initialize with some default keys from environment if available
    const defaultApiKeys = process.env.API_KEYS?.split(',') || [];
    defaultApiKeys.forEach((keyConfig, index) => {
      const [name, key] = keyConfig.split(':');
      if (name && key) {
        this.addKey({
          id: `default-${index}`,
          key: this.hashKey(key),
          name,
          permissions: ['read', 'write'],
          createdAt: new Date(),
          active: true,
        });
      }
    });
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  addKey(apiKey: Omit<ApiKey, 'key'> & { key: string }): void {
    this.keys.set(apiKey.key, apiKey as ApiKey);
  }

  validateKey(rawKey: string): ApiKey | null {
    const hashedKey = this.hashKey(rawKey);
    const apiKey = this.keys.get(hashedKey);

    if (apiKey && apiKey.active) {
      // Update last used timestamp
      apiKey.lastUsedAt = new Date();
      return apiKey;
    }

    return null;
  }

  generateNewKey(name: string, permissions: string[] = ['read']): { id: string; key: string } {
    const id = crypto.randomUUID();
    const rawKey = crypto.randomBytes(32).toString('hex');
    const hashedKey = this.hashKey(rawKey);

    this.addKey({
      id,
      key: hashedKey,
      name,
      permissions,
      createdAt: new Date(),
      active: true,
    });

    return { id, key: rawKey };
  }

  revokeKey(id: string): boolean {
    for (const [, apiKey] of this.keys.entries()) {
      if (apiKey.id === id) {
        apiKey.active = false;
        return true;
      }
    }
    return false;
  }

  listKeys(): Array<Omit<ApiKey, 'key'>> {
    return Array.from(this.keys.values()).map(({ key, ...rest }) => rest);
  }
}

// Global API key store instance
export const apiKeyStore = new ApiKeyStore();

// Extend Express Request type to include API key info
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
    }
  }
}

/**
 * Middleware to validate API keys
 */
export function validateApiKey(required: boolean = true) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKeyHeader = env.API_KEY_HEADER || 'x-api-key';
    const apiKey = req.headers[apiKeyHeader] as string;

    if (!apiKey) {
      if (required) {
        res.status(401).json(unifiedResponse(false, 'API key is required'));
        return;
      }
      // If not required, continue without API key
      return next();
    }

    const validatedKey = apiKeyStore.validateKey(apiKey);
    if (!validatedKey) {
      res.status(401).json(unifiedResponse(false, 'Invalid API key'));
      return;
    }

    // Attach API key info to request
    req.apiKey = validatedKey;
    next();
  };
}

/**
 * Middleware to check specific permissions
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json(unifiedResponse(false, 'API key required'));
      return;
    }

    if (!req.apiKey.permissions.includes(permission)) {
      res.status(403).json(unifiedResponse(false, `Missing required permission: ${permission}`));
      return;
    }

    next();
  };
}

/**
 * Middleware to apply API key specific rate limits
 */
export function apiKeyRateLimit() {
  const defaultLimits = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey || !req.apiKey.rateLimit) {
      return next();
    }

    const key = req.apiKey.id;
    const limit = req.apiKey.rateLimit;
    const now = Date.now();

    let usage = defaultLimits.get(key);
    if (!usage || now > usage.resetTime) {
      usage = {
        count: 0,
        resetTime: now + limit.windowMs,
      };
      defaultLimits.set(key, usage);
    }

    usage.count++;

    if (usage.count > limit.max) {
      res.status(429).json(
        unifiedResponse(false, 'API key rate limit exceeded', {
          limit: limit.max,
          window: limit.windowMs,
          resetTime: new Date(usage.resetTime).toISOString(),
        }),
      );
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.max.toString());
    res.setHeader('X-RateLimit-Remaining', (limit.max - usage.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(usage.resetTime).toISOString());

    next();
  };
}
