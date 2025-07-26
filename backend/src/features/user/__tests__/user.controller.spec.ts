import { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserController } from '../controllers/user.controller.js';
import { UserService } from '../services/user.service.js';

describe('UserController', () => {
  let userController: UserController;
  let mockUserService: UserService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockUserService = {
      heartbeat: vi.fn().mockResolvedValue({ success: true }),
      login: vi.fn().mockResolvedValue({ success: true, token: 'mockToken' }),
      register: vi
        .fn()
        .mockResolvedValue({ success: true, user: { id: 1, email: 'test@example.com' } }),
      getProfile: vi
        .fn()
        .mockResolvedValue({ success: true, user: { id: 1, email: 'test@example.com' } }),
      getPublicProfile: vi
        .fn()
        .mockResolvedValue({ success: true, user: { id: 1, username: 'testuser' } }),
      updateProfile: vi
        .fn()
        .mockResolvedValue({ success: true, user: { id: 1, bio: 'Updated bio' } }),
      followUser: vi
        .fn()
        .mockResolvedValue({ success: true, message: 'Successfully followed user' }),
      unfollowUser: vi
        .fn()
        .mockResolvedValue({ success: true, message: 'Successfully unfollowed user' }),
      getFollowers: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getFollowing: vi.fn().mockResolvedValue({ success: true, data: [] }),
    } as unknown as UserService;

    userController = new UserController(mockUserService);
    mockRequest = {};
    mockResponse = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    mockNext = vi.fn();
  });

  it('should return heartbeat response', async () => {
    await userController.heartbeat(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockUserService.heartbeat).toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
  });

  it('should login a user and return token', async () => {
    mockRequest.body = { email: 'test@example.com', password: 'password123' };

    await userController.login(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockUserService.login).toHaveBeenCalledWith(mockRequest.body);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({ success: true, token: 'mockToken' });
  });

  it('should register a user and return user data', async () => {
    mockRequest.body = { email: 'test@example.com', password: 'password123', name: 'Test User' };

    await userController.register(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockUserService.register).toHaveBeenCalledWith(mockRequest.body);
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      user: { id: 1, email: 'test@example.com' },
    });
  });

  it('should return user profile', async () => {
    mockRequest.userId = '1'; // Simulating userId from middleware

    await userController.getProfile(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockUserService.getProfile).toHaveBeenCalledWith('1');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      user: { id: 1, email: 'test@example.com' },
    });
  });

  it('should return public profile', async () => {
    mockRequest.params = { id: '2' };
    mockRequest.userId = '1'; // Viewer ID

    await userController.getPublicProfile(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );
    expect(mockUserService.getPublicProfile).toHaveBeenCalledWith('2', '1');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      user: { id: 1, username: 'testuser' },
    });
  });

  it('should update user profile', async () => {
    mockRequest.userId = '1';
    mockRequest.body = { bio: 'New bio' };

    await userController.updateProfile(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockUserService.updateProfile).toHaveBeenCalledWith('1', { bio: 'New bio' });
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      user: { id: 1, bio: 'Updated bio' },
    });
  });

  it('should follow a user', async () => {
    mockRequest.userId = '1';
    mockRequest.params = { id: '2' };

    await userController.followUser(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockUserService.followUser).toHaveBeenCalledWith('1', '2');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: 'Successfully followed user',
    });
  });

  it('should unfollow a user', async () => {
    mockRequest.userId = '1';
    mockRequest.params = { id: '2' };

    await userController.unfollowUser(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockUserService.unfollowUser).toHaveBeenCalledWith('1', '2');
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: 'Successfully unfollowed user',
    });
  });

  it('should get user followers', async () => {
    mockRequest.params = { id: '1' };
    mockRequest.query = { page: '1', pageSize: '20' };

    await userController.getFollowers(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockUserService.getFollowers).toHaveBeenCalledWith('1', 1, 20);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      data: [],
    });
  });

  it('should get user following', async () => {
    mockRequest.params = { id: '1' };
    mockRequest.query = { page: '2', pageSize: '10' };

    await userController.getFollowing(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockUserService.getFollowing).toHaveBeenCalledWith('1', 2, 10);
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      data: [],
    });
  });

  it('should return 401 for update profile without auth', async () => {
    mockRequest.userId = undefined;
    mockRequest.body = { bio: 'New bio' };

    await userController.updateProfile(mockRequest as Request, mockResponse as Response, mockNext);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unauthorized',
    });
    expect(mockUserService.updateProfile).not.toHaveBeenCalled();
  });
});
