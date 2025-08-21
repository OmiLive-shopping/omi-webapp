import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  validateSocketEvent,
  createValidationMiddleware,
  streamJoinSchema,
  chatSendMessageSchema,
  vdoStatsEventSchema,
} from '../schemas/index.js';
import { createValidatedHandler } from '../middleware/validation.middleware.js';
import type { SocketWithAuth } from '../../config/socket/socket.config.js';

describe('Socket Event Validation', () => {
  describe('validateSocketEvent', () => {
    it('should validate correct data', () => {
      const result = validateSocketEvent(streamJoinSchema, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.streamId).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('should reject invalid UUID', () => {
      const result = validateSocketEvent(streamJoinSchema, {
        streamId: 'invalid-uuid',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Validation failed');
        expect(result.details?.errors[0].message).toContain('Invalid uuid');
      }
    });

    it('should reject missing required fields', () => {
      const result = validateSocketEvent(streamJoinSchema, {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.errors[0].path).toEqual(['streamId']);
      }
    });

    it('should sanitize HTML in string fields', () => {
      const result = validateSocketEvent(chatSendMessageSchema, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
        content: '<script>alert("XSS")</script>Hello World',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('Hello World');
        expect(result.data.content).not.toContain('<script>');
      }
    });

    it('should enforce string length limits', () => {
      const longString = 'a'.repeat(501);
      const result = validateSocketEvent(chatSendMessageSchema, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
        content: longString,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.errors[0].message).toContain('String must contain at most 500 character(s)');
      }
    });

    it('should validate complex nested objects', () => {
      const result = validateSocketEvent(vdoStatsEventSchema, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
        stats: {
          viewerCount: 10,
          fps: {
            current: 30,
            target: 60,
          },
          resolution: {
            width: 1920,
            height: 1080,
          },
          connectionQuality: 'good',
        },
        timestamp: new Date().toISOString(),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stats.viewerCount).toBe(10);
        expect(result.data.stats.fps?.current).toBe(30);
      }
    });

    it('should reject invalid enum values', () => {
      const result = validateSocketEvent(vdoStatsEventSchema, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
        stats: {
          connectionQuality: 'invalid-quality',
        },
        timestamp: new Date().toISOString(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.errors[0].path).toContain('connectionQuality');
      }
    });

    it('should validate number ranges', () => {
      const result = validateSocketEvent(vdoStatsEventSchema, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
        stats: {
          fps: {
            current: 150, // Over max of 120
            target: 60,
          },
          packetLoss: 150, // Over max of 100%
        },
        timestamp: new Date().toISOString(),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.details?.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('createValidatedHandler', () => {
    let mockSocket: SocketWithAuth;
    let mockHandler: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-123',
        userId: 'user-123',
        username: 'testuser',
        role: 'viewer',
        emit: vi.fn(),
        join: vi.fn(),
        leave: vi.fn(),
        to: vi.fn(() => ({ emit: vi.fn() })),
      } as any;

      mockHandler = vi.fn();
    });

    it('should call handler with validated data', async () => {
      const validatedHandler = createValidatedHandler(
        streamJoinSchema,
        mockHandler,
      );

      await validatedHandler(mockSocket, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(mockHandler).toHaveBeenCalledWith(mockSocket, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('should emit validation error for invalid data', async () => {
      const validatedHandler = createValidatedHandler(
        streamJoinSchema,
        mockHandler,
      );

      await validatedHandler(mockSocket, {
        streamId: 'invalid-uuid',
      });

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'validation:error',
        expect.objectContaining({
          message: 'Invalid event data',
          errors: expect.arrayContaining([
            expect.objectContaining({
              path: 'streamId',
            }),
          ]),
        }),
      );
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const validatedHandler = createValidatedHandler(
        streamJoinSchema,
        errorHandler,
      );

      await validatedHandler(mockSocket, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(errorHandler).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({
          message: 'An error occurred processing your request',
        }),
      );
    });

    it('should respect custom error options', async () => {
      const validatedHandler = createValidatedHandler(
        streamJoinSchema,
        mockHandler,
        {
          emitError: false,
          logError: false,
        },
      );

      await validatedHandler(mockSocket, {
        streamId: 'invalid-uuid',
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize potential SQL injection attempts', () => {
      const result = validateSocketEvent(chatSendMessageSchema, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
        content: "'; DROP TABLE users; --",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // The content should be preserved but safe for use
        expect(result.data.content).toBe("'; DROP TABLE users; --");
      }
    });
  });

  describe('XSS Prevention', () => {
    const xssTestCases = [
      {
        input: '<img src=x onerror=alert(1)>',
        expected: '',
      },
      {
        input: 'javascript:alert(1)',
        expected: 'javascript:alert(1)',
      },
      {
        input: '<svg onload=alert(1)>',
        expected: '',
      },
      {
        input: '<<SCRIPT>alert("XSS");//<</SCRIPT>',
        expected: '&lt;', // DOMPurify removes everything after detecting script patterns
      },
    ];

    xssTestCases.forEach(({ input, expected }) => {
      it(`should sanitize: ${input}`, () => {
        const result = validateSocketEvent(chatSendMessageSchema, {
          streamId: '123e4567-e89b-12d3-a456-426614174000',
          content: input,
        });

        if (expected === '') {
          // If expected is empty, the validation should fail due to empty string after sanitization
          expect(result.success).toBe(false);
        } else {
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.content).toBe(expected);
          }
        }
      });
    });
  });

  describe('Type Coercion', () => {
    it('should handle datetime strings correctly', () => {
      const result = validateSocketEvent(vdoStatsEventSchema, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
        stats: {},
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timestamp).toBe('2024-01-01T00:00:00Z');
      }
    });

    it('should reject invalid datetime strings', () => {
      const result = validateSocketEvent(vdoStatsEventSchema, {
        streamId: '123e4567-e89b-12d3-a456-426614174000',
        stats: {},
        timestamp: 'not-a-date',
      });

      expect(result.success).toBe(false);
    });
  });
});