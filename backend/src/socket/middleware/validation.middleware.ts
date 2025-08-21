/**
 * WebSocket Event Validation Middleware
 * Provides centralized validation for all incoming socket events
 */

import { z } from 'zod';
import { Socket } from 'socket.io';
import { SocketWithAuth } from '../../config/socket/socket.config.js';

// Type for validation result
type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; details?: z.ZodIssue[] };

/**
 * Creates a validated event handler wrapper
 * @param schema - Zod schema for validation
 * @param handler - The actual event handler function
 * @param options - Additional options for validation
 */
export function createValidatedHandler<T>(
  schema: z.ZodSchema<T>,
  handler: (socket: SocketWithAuth, data: T) => Promise<void> | void,
  options?: {
    emitError?: boolean; // Whether to emit error back to client
    logError?: boolean; // Whether to log validation errors
    errorEvent?: string; // Custom error event name
  },
) {
  const { emitError = true, logError = true, errorEvent = 'validation:error' } = options || {};

  return async (socket: SocketWithAuth, rawData: unknown) => {
    try {
      // Validate the incoming data
      const validated = schema.parse(rawData);
      
      // Call the actual handler with validated data
      await handler(socket, validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = 'Invalid event data';
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        }));

        if (logError) {
          console.error(`Validation error for socket ${socket.id}:`, {
            event: handler.name,
            errors,
            rawData,
          });
        }

        if (emitError) {
          socket.emit(errorEvent, {
            message: errorMessage,
            errors,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Handle non-validation errors
        console.error(`Handler error for socket ${socket.id}:`, error);
        
        if (emitError) {
          socket.emit('error', {
            message: 'An error occurred processing your request',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  };
}

/**
 * Batch validation for multiple related events
 * Useful for validating complex multi-step operations
 */
export function createBatchValidator<T extends Record<string, z.ZodSchema>>(
  schemas: T,
): (data: Record<keyof T, unknown>) => ValidationResult<{ [K in keyof T]: z.infer<T[K]> }> {
  return (data) => {
    const results: any = {};
    const errors: z.ZodIssue[] = [];

    for (const [key, schema] of Object.entries(schemas)) {
      try {
        results[key] = schema.parse(data[key]);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(...error.errors.map(err => ({
            ...err,
            path: [key, ...err.path],
          })));
        }
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: 'Batch validation failed',
        details: errors,
      };
    }

    return {
      success: true,
      data: results,
    };
  };
}

/**
 * Rate limiting decorator for validated handlers
 * Combines validation with rate limiting
 */
export function createRateLimitedHandler<T>(
  schema: z.ZodSchema<T>,
  handler: (socket: SocketWithAuth, data: T) => Promise<void> | void,
  rateLimitOptions: {
    maxRequests: number;
    windowMs: number;
    identifier?: (socket: SocketWithAuth, data: T) => string;
  },
) {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return createValidatedHandler(schema, async (socket, data) => {
    const now = Date.now();
    const identifier = rateLimitOptions.identifier
      ? rateLimitOptions.identifier(socket, data)
      : socket.userId || socket.id;

    const record = requestCounts.get(identifier);
    
    if (record && record.resetTime > now) {
      if (record.count >= rateLimitOptions.maxRequests) {
        socket.emit('rate-limit', {
          message: 'Too many requests',
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
        return;
      }
      record.count++;
    } else {
      requestCounts.set(identifier, {
        count: 1,
        resetTime: now + rateLimitOptions.windowMs,
      });
    }

    // Clean up old records periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      const cutoff = now - rateLimitOptions.windowMs;
      for (const [key, value] of requestCounts.entries()) {
        if (value.resetTime < cutoff) {
          requestCounts.delete(key);
        }
      }
    }

    await handler(socket, data);
  });
}

/**
 * Permission validation decorator
 * Checks user permissions before executing handler
 */
export function createPermissionValidatedHandler<T>(
  schema: z.ZodSchema<T>,
  handler: (socket: SocketWithAuth, data: T) => Promise<void> | void,
  requiredPermissions: {
    authenticated?: boolean;
    roles?: string[];
    customCheck?: (socket: SocketWithAuth, data: T) => boolean | Promise<boolean>;
  },
) {
  return createValidatedHandler(schema, async (socket, data) => {
    // Check authentication
    if (requiredPermissions.authenticated && !socket.userId) {
      socket.emit('error', {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    // Check roles
    if (requiredPermissions.roles && requiredPermissions.roles.length > 0) {
      if (!socket.role || !requiredPermissions.roles.includes(socket.role)) {
        socket.emit('error', {
          message: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
        });
        return;
      }
    }

    // Custom permission check
    if (requiredPermissions.customCheck) {
      const hasPermission = await requiredPermissions.customCheck(socket, data);
      if (!hasPermission) {
        socket.emit('error', {
          message: 'Permission denied',
          code: 'CUSTOM_PERMISSION_DENIED',
        });
        return;
      }
    }

    await handler(socket, data);
  });
}

/**
 * Logging decorator for debugging
 * Logs all events with their validated data
 */
export function createLoggedHandler<T>(
  schema: z.ZodSchema<T>,
  handler: (socket: SocketWithAuth, data: T) => Promise<void> | void,
  options?: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    includeData?: boolean;
    maskSensitive?: (data: T) => T;
  },
) {
  const { logLevel = 'info', includeData = true, maskSensitive } = options || {};

  return createValidatedHandler(schema, async (socket, data) => {
    const logData = {
      socketId: socket.id,
      userId: socket.userId,
      username: socket.username,
      event: handler.name,
      timestamp: new Date().toISOString(),
      ...(includeData && {
        data: maskSensitive ? maskSensitive(data) : data,
      }),
    };

    console[logLevel]('Socket event:', logData);

    const startTime = Date.now();
    try {
      await handler(socket, data);
      
      console[logLevel]('Socket event completed:', {
        ...logData,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      console.error('Socket event failed:', {
        ...logData,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  });
}

/**
 * Combines multiple decorators for comprehensive validation
 */
export function createFullyValidatedHandler<T>(
  schema: z.ZodSchema<T>,
  handler: (socket: SocketWithAuth, data: T) => Promise<void> | void,
  options: {
    rateLimit?: {
      maxRequests: number;
      windowMs: number;
    };
    permissions?: {
      authenticated?: boolean;
      roles?: string[];
    };
    logging?: boolean;
  } = {},
) {
  let validatedHandler = handler;

  // Apply logging if requested
  if (options.logging) {
    validatedHandler = async (socket: SocketWithAuth, data: T) => {
      console.log(`[${new Date().toISOString()}] ${handler.name}:`, {
        userId: socket.userId,
        data,
      });
      await handler(socket, data);
    };
  }

  // Apply permissions if specified
  if (options.permissions) {
    const permHandler = validatedHandler;
    validatedHandler = async (socket: SocketWithAuth, data: T) => {
      if (options.permissions!.authenticated && !socket.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      if (options.permissions!.roles && !options.permissions!.roles.includes(socket.role || '')) {
        socket.emit('error', { message: 'Insufficient permissions' });
        return;
      }
      await permHandler(socket, data);
    };
  }

  // Apply rate limiting if specified
  if (options.rateLimit) {
    return createRateLimitedHandler(schema, validatedHandler, options.rateLimit);
  }

  // Return with basic validation
  return createValidatedHandler(schema, validatedHandler);
}