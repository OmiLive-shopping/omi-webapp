import bcrypt from 'bcrypt';
import { unifiedResponse } from 'uni-response';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR, SUCCESS } from '../../../constants/messages.js';
import { generateToken } from '../../../utils/generate-token.util.js';
import { UserRepository } from '../repositories/user.repository.js';
import { UserService } from '../services/user.service.js';

vi.mock('bcrypt');

vi.mock('../../../utils/generate-token.util', () => ({
  generateToken: vi.fn().mockReturnValue('mocked-jwt-token'),
}));

vi.mock('uni-response', () => ({
  unifiedResponse: vi.fn((success, message, data?) => ({ success, message, data })),
}));

describe('UserService', () => {
  let userRepository: UserRepository;
  let userService: UserService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup bcrypt mocks
    vi.mocked(bcrypt.hash).mockResolvedValue('hashedpassword' as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    userRepository = {
      findUserByEmail: vi.fn(),
      findUserById: vi.fn(),
      findUserByUsername: vi.fn(),
      createUser: vi.fn(),
    } as unknown as UserRepository;

    userService = new UserService(userRepository);
  });

  describe('heartbeat', () => {
    it('should return heartbeat response', async () => {
      const response = await userService.heartbeat();

      expect(response).toEqual({
        success: true,
        message: 'Ok, From user',
      });
    });
  });

  describe('login', () => {
    const mockLoginCredentials = {
      email: 'test@example.com',
      password: 'Test123456!',
    };

    it('should return error when user not found', async () => {
      (userRepository.findUserByEmail as any).mockResolvedValue(null);

      const response = await userService.login(mockLoginCredentials);

      expect(userRepository.findUserByEmail).toHaveBeenCalledWith(mockLoginCredentials.email);
      expect(response).toEqual({
        success: false,
        message: ERROR.USER_NOT_FOUND,
      });
    });

    it('should return error when password is invalid', async () => {
      const mockUser = {
        id: '123',
        email: mockLoginCredentials.email,
        password: 'hashedpassword',
        role: { name: 'user' },
      };

      (userRepository.findUserByEmail as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const response = await userService.login(mockLoginCredentials);

      expect(bcrypt.compare).toHaveBeenCalledWith(mockLoginCredentials.password, mockUser.password);
      expect(response).toEqual({
        success: false,
        message: 'Invalid credentials',
      });
    });

    it('should successfully login with correct credentials', async () => {
      const mockUser = {
        id: '123',
        email: mockLoginCredentials.email,
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        role: { name: 'user' },
        isAdmin: false,
        streamKey: 'test-stream-key',
      };

      (userRepository.findUserByEmail as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const response = await userService.login(mockLoginCredentials);

      expect(generateToken).toHaveBeenCalledWith('123', 'user');
      expect(response).toEqual({
        success: true,
        message: SUCCESS.LOGIN_SUCCESSFUL,
        data: {
          user: {
            id: '123',
            email: mockLoginCredentials.email,
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser',
            role: { name: 'user' },
            isAdmin: false,
            streamKey: 'test-stream-key',
          },
          tokens: {
            accessToken: 'mocked-jwt-token',
            refreshToken: 'mocked-jwt-token',
            expiresIn: 1800,
          },
        },
      });
    });

    it('should handle missing role gracefully', async () => {
      const mockUser = {
        id: '123',
        email: mockLoginCredentials.email,
        password: 'hashedpassword',
        role: null,
      };

      (userRepository.findUserByEmail as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const response = await userService.login(mockLoginCredentials);

      expect(generateToken).toHaveBeenCalledWith('123', 'user');
      expect(response.success).toBe(true);
    });
  });

  describe('register', () => {
    const mockRegisterData = {
      email: 'newuser@example.com',
      username: 'newuser',
      password: 'Test123456!',
      password2: 'Test123456!',
      firstName: 'New',
    };

    it('should return error if email already exists', async () => {
      (userRepository.findUserByEmail as any).mockResolvedValue({ id: '123' });

      const response = await userService.register(mockRegisterData);

      expect(response).toEqual({
        success: false,
        message: ERROR.USER_EXISTS_WITH_EMAIL,
      });
    });

    it('should return error if username already exists', async () => {
      (userRepository.findUserByEmail as any).mockResolvedValue(null);
      (userRepository.findUserByUsername as any).mockResolvedValue({ id: '123' });

      const response = await userService.register(mockRegisterData);

      expect(response).toEqual({
        success: false,
        message: 'User already exists with this username',
      });
    });

    it('should successfully register a new user', async () => {
      const mockNewUser = {
        id: 'new-user-id',
        email: mockRegisterData.email,
        username: mockRegisterData.username,
        firstName: mockRegisterData.firstName,
        password: 'hashedpassword',
        role: { name: 'user' },
        streamKey: 'new-stream-key',
      };

      (userRepository.findUserByEmail as any).mockResolvedValue(null);
      (userRepository.findUserByUsername as any).mockResolvedValue(null);
      (userRepository.createUser as any).mockResolvedValue(mockNewUser);

      const response = await userService.register(mockRegisterData);

      expect(bcrypt.hash).toHaveBeenCalledWith(mockRegisterData.password, 10);
      expect(userRepository.createUser).toHaveBeenCalledWith({
        email: mockRegisterData.email,
        username: mockRegisterData.username,
        password: 'hashedpassword',
        firstName: mockRegisterData.firstName,
      });
      expect(generateToken).toHaveBeenCalledWith('new-user-id', 'user');
      expect(response).toEqual({
        success: true,
        message: SUCCESS.REGISTRATION_SUCCESSFUL,
        data: {
          user: {
            id: 'new-user-id',
            email: mockRegisterData.email,
            username: mockRegisterData.username,
            firstName: mockRegisterData.firstName,
            role: { name: 'user' },
            streamKey: 'new-stream-key',
          },
          tokens: {
            accessToken: 'mocked-jwt-token',
            refreshToken: 'mocked-jwt-token',
            expiresIn: 1800,
          },
          streamKey: 'new-stream-key',
        },
      });
    });

    it('should handle bcrypt hash errors', async () => {
      (userRepository.findUserByEmail as any).mockResolvedValue(null);
      (userRepository.findUserByUsername as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockRejectedValue(new Error('Hash error'));

      await expect(userService.register(mockRegisterData)).rejects.toThrow('Hash error');
    });
  });

  describe('getProfile', () => {
    it('should return error when user not found', async () => {
      (userRepository.findUserById as any).mockResolvedValue(null);

      const response = await userService.getProfile('nonexistent_id');

      expect(response).toEqual({
        success: false,
        message: ERROR.USER_NOT_FOUND,
      });
    });

    it('should return user profile when found', async () => {
      const mockUser = {
        id: '123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        username: 'johndoe',
        role: { name: 'user' },
      };

      (userRepository.findUserById as any).mockResolvedValue(mockUser);

      const response = await userService.getProfile('123');

      expect(response).toEqual({
        success: true,
        message: SUCCESS.USER_FOUND,
        data: mockUser,
      });
    });
  });
});
