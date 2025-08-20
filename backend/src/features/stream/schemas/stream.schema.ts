import { z } from 'zod';

// Create stream schema
export const createStreamSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Stream title is required' })
    .max(200, { message: 'Stream title must not exceed 200 characters' }),
  description: z
    .string()
    .max(5000, { message: 'Description must not exceed 5000 characters' })
    .optional()
    .nullable(),
  scheduled: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .refine(
      date => {
        return new Date(date) > new Date();
      },
      { message: 'Scheduled time must be in the future' },
    ),
  vdoRoomId: z
    .string()
    .min(1, { message: 'VDO room ID is required' })
    .max(50, { message: 'VDO room ID must not exceed 50 characters' })
    .regex(/^[a-zA-Z0-9-_]+$/, { message: 'VDO room ID must contain only alphanumeric characters, hyphens, and underscores' }),
});

// Update stream schema
export const updateStreamSchema = z.object({
  title: z
    .string()
    .min(1, { message: 'Stream title cannot be empty' })
    .max(200, { message: 'Stream title must not exceed 200 characters' })
    .optional(),
  description: z
    .string()
    .max(5000, { message: 'Description must not exceed 5000 characters' })
    .optional()
    .nullable(),
  scheduled: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .refine(
      date => {
        if (!date) return true;
        return new Date(date) > new Date();
      },
      { message: 'Scheduled time must be in the future' },
    ),
  vdoRoomId: z
    .string()
    .min(1, { message: 'VDO room ID cannot be empty' })
    .max(50, { message: 'VDO room ID must not exceed 50 characters' })
    .regex(/^[a-zA-Z0-9-_]+$/, { message: 'VDO room ID must contain only alphanumeric characters, hyphens, and underscores' })
    .optional(),
});

// Stream filters schema
export const streamFiltersSchema = z.object({
  isLive: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  userId: z.string().uuid({ message: 'Invalid user ID format' }).optional(),
  upcoming: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  past: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  search: z.string().optional(),
});

// Go live schema
export const goLiveSchema = z.object({
  streamKey: z.string().min(1, { message: 'Stream key is required' }),
});

// End stream schema
export const endStreamSchema = z.object({
  streamKey: z.string().min(1, { message: 'Stream key is required' }),
});

// Update viewer count schema
export const updateViewerCountSchema = z
  .object({
    increment: z.boolean().optional(),
    decrement: z.boolean().optional(),
    count: z.number().int().min(0).optional(),
  })
  .refine(
    data => {
      const hasOperation = data.increment || data.decrement || data.count !== undefined;
      const multipleOperations =
        (data.increment ? 1 : 0) + (data.decrement ? 1 : 0) + (data.count !== undefined ? 1 : 0);
      return hasOperation && multipleOperations === 1;
    },
    { message: 'Specify exactly one operation: increment, decrement, or count' },
  );

// Add stream product schema
export const addStreamProductSchema = z.object({
  productId: z.string().uuid({ message: 'Invalid product ID format' }),
  order: z.number().int().min(0).optional().default(0),
});

// Comment schema
export const commentSchema = z.object({
  content: z
    .string()
    .min(1, { message: 'Comment cannot be empty' })
    .max(1000, { message: 'Comment must not exceed 1000 characters' }),
});

// Start stream schema
export const startStreamSchema = z.object({
  streamId: z.string().uuid({ message: 'Invalid stream ID' }),
  streamKey: z.string().optional(),
});

// Comment history schema
export const commentHistorySchema = z.object({
  before: z.string().datetime().optional(), // ISO 8601 datetime
  after: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().uuid().optional(), // For cursor-based pagination
  includeDeleted: z.coerce.boolean().optional().default(false),
  orderBy: z.enum(['asc', 'desc']).optional().default('asc'), // asc for chat history
});
