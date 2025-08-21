import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '../../../middleware/auth.middleware.js';
import { UserController } from '../controllers/user.controller.js';
import router from '../routes/user.routes.js';
import { UserService } from '../services/user.service.js';

// Mock the dependencies
vi.mock('../../../middleware/auth.middleware');
vi.mock('../services/user.service');
vi.mock('../repositories/user.repository');
vi.mock('../../../config/prisma.config', () => ({
  PrismaService: {
    getInstance: vi.fn(() => ({
      client: {},
    })),
  },
}));
vi.mock('../../../middleware/input-validation.middleware', () => ({
  commonValidations: {
    uuid: vi.fn(() => []),
    pagination: [],
  },
  handleValidationErrors: vi.fn((req: any, res: any, next: any) => next()),
  userValidations: {
    register: vi.fn((req: any, res: any, next: any) => next()),
    login: vi.fn((req: any, res: any, next: any) => next()),
    updateProfile: vi.fn((req: any, res: any, next: any) => next()),
  },
}));
vi.mock('../../../middleware/rate-limit.middleware', () => ({
  authRateLimiter: vi.fn((req: any, res: any, next: any) => next()),
  searchRateLimiter: vi.fn((req: any, res: any, next: any) => next()),
}));
vi.mock('../../../middleware/validation.middleware', () => ({
  validateRequest: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

describe('Stream Key Endpoints', () => {
  let app: express.Application;
  let mockUserService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());

    // Mock auth middleware
    vi.mocked(auth).mockImplementation((req: any, res: any, next: any) => {
      req.userId = 'test-user-id';
      next();
    });

    // Mock successful responses
    mockUserService = {
      getStreamKey: vi.fn().mockResolvedValue({
        success: true,
        message: 'Stream key retrieved successfully',
        data: {
          streamKey: 'test-stream-key-123',
          vdoRoomName: 'omi-test-stream-key-123',
        },
      }),
      regenerateStreamKey: vi.fn().mockResolvedValue({
        success: true,
        message: 'Stream key regenerated successfully',
        data: {
          streamKey: 'new-stream-key-456',
          vdoRoomName: 'omi-new-stream-key-456',
        },
      }),
    };

    vi.mocked(UserService).mockImplementation(() => mockUserService);

    app.use('/api/v1/users', router);
  });

  describe('GET /stream-key', () => {
    it('should get stream key for authenticated streamer', async () => {
      const response = await request(app)
        .get('/api/v1/users/stream-key')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Stream key retrieved successfully',
        data: {
          streamKey: 'test-stream-key-123',
          vdoRoomName: 'omi-test-stream-key-123',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(auth).mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      });

      const response = await request(app).get('/api/v1/users/stream-key');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return error for non-streamer users', async () => {
      mockUserService.getStreamKey.mockResolvedValueOnce({
        success: false,
        message: 'Only streamers can access stream keys',
      });

      const response = await request(app)
        .get('/api/v1/users/stream-key')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only streamers can access stream keys');
    });
  });

  describe('POST /stream-key/regenerate', () => {
    it('should regenerate stream key for authenticated streamer', async () => {
      const response = await request(app)
        .post('/api/v1/users/stream-key/regenerate')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Stream key regenerated successfully',
        data: {
          streamKey: 'new-stream-key-456',
          vdoRoomName: 'omi-new-stream-key-456',
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(auth).mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      });

      const response = await request(app).post('/api/v1/users/stream-key/regenerate');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return error for non-streamer users', async () => {
      mockUserService.regenerateStreamKey.mockResolvedValueOnce({
        success: false,
        message: 'Only streamers can regenerate stream keys',
      });

      const response = await request(app)
        .post('/api/v1/users/stream-key/regenerate')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Only streamers can regenerate stream keys');
    });
  });
});
