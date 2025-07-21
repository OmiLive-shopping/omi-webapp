import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { corsMiddleware } from '../../config/cors.config';
import { RedisClient } from '../../config/redis.config';
import {
  apiKeyRateLimit,
  apiKeyStore,
  requirePermission,
  validateApiKey,
} from '../api-key.middleware';
import { handleValidationErrors, userValidations } from '../input-validation.middleware';
import {
  apiRateLimiter,
  authRateLimiter,
  createRateLimiter,
  RATE_LIMIT_CONFIGS,
} from '../rate-limit.middleware';

// Mock Redis
vi.mock('../../config/redis.config', () => ({
  RedisClient: {
    getInstance: vi.fn(() => ({
      getClient: vi.fn().mockReturnValue(null), // Simulate Redis not available
      isReady: vi.fn().mockReturnValue(false),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

describe('Security Middleware Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const limiter = createRateLimiter({ max: 2, windowMs: 1000 });
      app.get('/test', limiter, (req, res) => res.json({ success: true }));

      // First two requests should succeed
      const res1 = await request(app).get('/test');
      expect(res1.status).toBe(200);

      const res2 = await request(app).get('/test');
      expect(res2.status).toBe(200);

      // Third request should be rate limited
      const res3 = await request(app).get('/test');
      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
    });

    it('should use different limits for auth endpoints', async () => {
      app.post('/auth', authRateLimiter, (req, res) => res.json({ success: true }));

      // Auth endpoints have lower limits (5 per 15 min)
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(request(app).post('/auth'));
      }

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBe(5);
      expect(rateLimitedCount).toBe(1);
    });

    it('should include rate limit headers', async () => {
      app.get('/test', apiRateLimiter, (req, res) => res.json({ success: true }));

      const res = await request(app).get('/test');
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('API Key Authentication', () => {
    let testApiKey: { id: string; key: string };

    beforeEach(() => {
      // Generate a test API key
      testApiKey = apiKeyStore.generateNewKey('test-key', ['read', 'write']);
    });

    it('should reject requests without API key when required', async () => {
      app.get('/api', validateApiKey(true), (req, res) => res.json({ success: true }));

      const res = await request(app).get('/api');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('API key is required');
    });

    it('should accept requests with valid API key', async () => {
      app.get('/api', validateApiKey(true), (req, res) => res.json({ success: true }));

      const res = await request(app).get('/api').set('x-api-key', testApiKey.key);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid API keys', async () => {
      app.get('/api', validateApiKey(true), (req, res) => res.json({ success: true }));

      const res = await request(app).get('/api').set('x-api-key', 'invalid-key');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid API key');
    });

    it('should check API key permissions', async () => {
      app.get('/api', validateApiKey(true), requirePermission('delete'), (req, res) =>
        res.json({ success: true }),
      );

      const res = await request(app).get('/api').set('x-api-key', testApiKey.key);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Missing required permission: delete');
    });

    it('should revoke API keys', async () => {
      app.get('/api', validateApiKey(true), (req, res) => res.json({ success: true }));

      // First request should work
      const res1 = await request(app).get('/api').set('x-api-key', testApiKey.key);
      expect(res1.status).toBe(200);

      // Revoke the key
      apiKeyStore.revokeKey(testApiKey.id);

      // Second request should fail
      const res2 = await request(app).get('/api').set('x-api-key', testApiKey.key);
      expect(res2.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      app.post('/register', userValidations.register, handleValidationErrors, (req, res) =>
        res.json({ success: true }),
      );

      const res = await request(app).post('/register').send({
        email: 'invalid-email',
        username: 'testuser',
        password: 'Test1234!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.data.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: 'Invalid email address',
        }),
      );
    });

    it('should validate password strength', async () => {
      app.post('/register', userValidations.register, handleValidationErrors, (req, res) =>
        res.json({ success: true }),
      );

      const res = await request(app).post('/register').send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
      });

      expect(res.status).toBe(400);
      expect(res.body.data.errors).toContainEqual(
        expect.objectContaining({
          field: 'password',
          message: expect.stringContaining('Password must'),
        }),
      );
    });

    it('should sanitize input', async () => {
      app.post('/test', userValidations.updateProfile, handleValidationErrors, (req, res) =>
        res.json({ bio: req.body.bio }),
      );

      const res = await request(app).post('/test').send({
        bio: '  Test bio with spaces  ',
      });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBe('Test bio with spaces'); // Trimmed
    });
  });

  describe('CORS', () => {
    beforeEach(() => {
      app.use(corsMiddleware);
      app.get('/test', (req, res) => res.json({ success: true }));
    });

    it('should handle preflight requests', async () => {
      const res = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow whitelisted origins', async () => {
      const res = await request(app).get('/test').set('Origin', 'http://localhost:5173');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should expose custom headers', async () => {
      const res = await request(app).get('/test').set('Origin', 'http://localhost:3000');

      const exposedHeaders = res.headers['access-control-expose-headers'];
      expect(exposedHeaders).toContain('X-Request-ID');
      expect(exposedHeaders).toContain('X-RateLimit-Limit');
    });
  });

  describe('Security Headers', () => {
    it('should set security headers with helmet', async () => {
      const helmet = await import('helmet');
      app.use(helmet.default());
      app.get('/test', (req, res) => res.json({ success: true }));

      const res = await request(app).get('/test');

      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Request Logging', () => {
    it('should log requests with morgan', async () => {
      const mockWrite = vi.fn();
      const morgan = await import('morgan');

      app.use(
        morgan.default('dev', {
          stream: { write: mockWrite },
        }),
      );
      app.get('/test', (req, res) => res.json({ success: true }));

      await request(app).get('/test');

      expect(mockWrite).toHaveBeenCalled();
      expect(mockWrite.mock.calls[0][0]).toContain('GET /test');
    });
  });
});
