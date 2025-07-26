import { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROLES } from '../../constants/roles.js';
import {
  requireAdmin,
  requireOwnerOrAdmin,
  requirePermission,
  requireRole,
} from '../role.middleware.js';

describe('Role Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnThis();

    mockReq = {
      user: undefined,
      params: {},
      body: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = vi.fn();
  });

  describe('requireRole', () => {
    it('should reject if no user is authenticated', () => {
      const middleware = requireRole(ROLES.ADMIN);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin users to bypass role checks', () => {
      mockReq.user = {
        id: '123',
        email: 'admin@test.com',
        username: 'admin',
        isAdmin: true,
      };

      const middleware = requireRole(ROLES.STREAMER);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow users with matching role', () => {
      mockReq.user = {
        id: '123',
        email: 'streamer@test.com',
        username: 'streamer',
        role: ROLES.STREAMER,
      };

      const middleware = requireRole(ROLES.STREAMER, ROLES.ADMIN);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject users without matching role', () => {
      mockReq.user = {
        id: '123',
        email: 'user@test.com',
        username: 'user',
        role: ROLES.USER,
      };

      const middleware = requireRole(ROLES.STREAMER, ROLES.ADMIN);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Insufficient permissions',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should reject if no user is authenticated', () => {
      const middleware = requirePermission('products.create');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin users to bypass permission checks', () => {
      mockReq.user = {
        id: '123',
        email: 'admin@test.com',
        username: 'admin',
        isAdmin: true,
      };

      const middleware = requirePermission('products.create');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow users with required permissions', () => {
      mockReq.user = {
        id: '123',
        email: 'streamer@test.com',
        username: 'streamer',
        role: ROLES.STREAMER,
      };

      const middleware = requirePermission('streams.create');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject users without required permissions', () => {
      mockReq.user = {
        id: '123',
        email: 'user@test.com',
        username: 'user',
        role: ROLES.USER,
      };

      const middleware = requirePermission('products.create');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Insufficient permissions',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should check multiple permissions', () => {
      mockReq.user = {
        id: '123',
        email: 'streamer@test.com',
        username: 'streamer',
        role: ROLES.STREAMER,
      };

      const middleware = requirePermission('streams.create', 'streams.update');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should reject if no user is authenticated', () => {
      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow users with isAdmin flag', () => {
      mockReq.user = {
        id: '123',
        email: 'admin@test.com',
        username: 'admin',
        isAdmin: true,
      };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow users with admin role', () => {
      mockReq.user = {
        id: '123',
        email: 'admin@test.com',
        username: 'admin',
        role: ROLES.ADMIN,
      };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      mockReq.user = {
        id: '123',
        email: 'user@test.com',
        username: 'user',
        role: ROLES.USER,
      };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Admin access required',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnerOrAdmin', () => {
    it('should reject if no user is authenticated', () => {
      const middleware = requireOwnerOrAdmin();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow admin users', () => {
      mockReq.user = {
        id: '123',
        email: 'admin@test.com',
        username: 'admin',
        isAdmin: true,
      };
      mockReq.params = { userId: '456' };

      const middleware = requireOwnerOrAdmin();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow resource owner', () => {
      mockReq.user = {
        id: '123',
        email: 'user@test.com',
        username: 'user',
      };
      mockReq.params = { userId: '123' };

      const middleware = requireOwnerOrAdmin();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should check custom parameter name', () => {
      mockReq.user = {
        id: '123',
        email: 'user@test.com',
        username: 'user',
      };
      mockReq.body = { ownerId: '123' };

      const middleware = requireOwnerOrAdmin('ownerId');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject non-owner non-admin users', () => {
      mockReq.user = {
        id: '123',
        email: 'user@test.com',
        username: 'user',
      };
      mockReq.params = { userId: '456' };

      const middleware = requireOwnerOrAdmin();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied',
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
