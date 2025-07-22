import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';

describe('UserController Integration Tests', () => {
  let userController: UserController;
  let mockUserService: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock service
    mockUserService = {
      login: vi.fn(),
      register: vi.fn(),
      getProfile: vi.fn(),
    };

    // Create controller instance with mock service
    userController = new UserController(mockUserService as UserService);

    // Setup mock request and response
    mockRequest = {
      body: {},
      userId: undefined,
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('POST /register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Test123456!',
      password2: 'Test123456!',
      firstName: 'Test',
    };

    it('should successfully register a new user', async () => {
      const mockRegisterResponse = {
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: 'new-user-id',
            email: validRegisterData.email,
            username: validRegisterData.username,
            firstName: validRegisterData.firstName,
            isAdmin: false,
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 1800,
          },
          streamKey: 'mock-stream-key',
        },
      };

      mockUserService.register.mockResolvedValue(mockRegisterResponse);
      mockRequest.body = validRegisterData;

      await userController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.register).toHaveBeenCalledWith(validRegisterData);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockRegisterResponse);
    });

    it('should handle registration errors', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'User already exists with this email',
      };

      mockUserService.register.mockResolvedValue(mockErrorResponse);
      mockRequest.body = validRegisterData;

      await userController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(mockErrorResponse);
    });

    it('should handle service exceptions', async () => {
      const error = new Error('Database connection failed');
      mockUserService.register.mockRejectedValue(error);
      mockRequest.body = validRegisterData;

      await userController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Test123456!',
    };

    it('should successfully login with valid credentials', async () => {
      const mockLoginResponse = {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user-id',
            email: validLoginData.email,
            username: 'testuser',
            firstName: 'Test',
            isAdmin: false,
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 1800,
          },
        },
      };

      mockUserService.login.mockResolvedValue(mockLoginResponse);
      mockRequest.body = validLoginData;

      await userController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.login).toHaveBeenCalledWith(validLoginData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockLoginResponse);
    });

    it('should handle invalid credentials', async () => {
      const mockErrorResponse = {
        success: false,
        message: 'Invalid credentials',
      };

      mockUserService.login.mockResolvedValue(mockErrorResponse);
      mockRequest.body = validLoginData;

      await userController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(mockErrorResponse);
    });

    it('should handle user not found', async () => {
      const mockNotFoundResponse = {
        success: false,
        message: 'User not found',
      };

      mockUserService.login.mockResolvedValue(mockNotFoundResponse);
      mockRequest.body = validLoginData;

      await userController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(mockNotFoundResponse);
    });
  });

  describe('GET /profile', () => {
    it('should successfully get user profile', async () => {
      const mockProfileResponse = {
        success: true,
        message: 'User found',
        data: {
          id: 'user-id',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          isAdmin: false,
        },
      };

      mockUserService.getProfile.mockResolvedValue(mockProfileResponse);
      mockRequest.userId = 'user-id';

      await userController.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockUserService.getProfile).toHaveBeenCalledWith('user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockProfileResponse);
    });

    it('should handle profile not found', async () => {
      const mockNotFoundResponse = {
        success: false,
        message: 'User not found',
      };

      mockUserService.getProfile.mockResolvedValue(mockNotFoundResponse);
      mockRequest.userId = 'nonexistent-id';

      await userController.getProfile(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(mockNotFoundResponse);
    });
  });

  describe('Error handling', () => {
    it('should properly handle unexpected errors in login', async () => {
      const error = new Error('Unexpected error');
      mockUserService.login.mockRejectedValue(error);
      mockRequest.body = { email: 'test@example.com', password: 'password' };

      await userController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should properly handle unexpected errors in register', async () => {
      const error = new Error('Database error');
      mockUserService.register.mockRejectedValue(error);
      mockRequest.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123456!',
        password2: 'Test123456!',
        firstName: 'Test',
      };

      await userController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});