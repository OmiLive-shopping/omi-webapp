/**
 * Centralized WebSocket Event Schemas
 * All socket event validation schemas in one place for consistency
 */

import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Helper function to sanitize HTML/text content
const sanitizeString = (str: string): string => {
  // Remove any HTML tags and scripts
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

// Custom Zod refinements for common validations
const sanitizedString = (maxLength = 500) =>
  z
    .string()
    .max(maxLength)
    .transform(val => sanitizeString(val))
    .refine(val => val.length > 0, 'String cannot be empty after sanitization');

const uuid = () => z.string().uuid();
const streamId = () => uuid();
const userId = () => uuid();
const messageId = () => uuid();

// ============================================================================
// STREAM EVENTS
// ============================================================================

export const streamJoinSchema = z.object({
  streamId: streamId(),
});

export const streamLeaveSchema = z.object({
  streamId: streamId(),
});

export const streamUpdateSchema = z.object({
  streamId: streamId(),
  title: sanitizedString(100).optional(),
  description: sanitizedString(1000).optional(),
  thumbnailUrl: z.string().url().optional(),
});

export const streamFeatureProductSchema = z.object({
  streamId: streamId(),
  productId: uuid(),
  duration: z.number().min(5).max(300).optional(), // 5 seconds to 5 minutes
});

export const streamStatsUpdateSchema = z.object({
  streamId: streamId(),
  stats: z.object({
    bitrate: z.number().min(0).optional(),
    fps: z.number().min(0).max(120).optional(),
    resolution: z
      .object({
        width: z.number().min(0).max(7680), // Max 8K
        height: z.number().min(0).max(4320),
      })
      .optional(),
    audioLevel: z.number().min(-100).max(0).optional(), // dB
    packetLoss: z.number().min(0).max(100).optional(), // percentage
    latency: z.number().min(0).max(10000).optional(), // ms
    bandwidth: z
      .object({
        upload: z.number().min(0),
        download: z.number().min(0),
      })
      .optional(),
  }),
  timestamp: z.string().datetime(),
});

export const streamGetAnalyticsSchema = z.object({
  streamId: streamId(),
  period: z.enum(['5minutes', '15minutes', 'hour', 'day', 'week']).optional(),
});

// ============================================================================
// CHAT EVENTS
// ============================================================================

export const chatSendMessageSchema = z.object({
  streamId: streamId(),
  content: sanitizedString(500),
  replyTo: messageId().optional(),
  metadata: z
    .object({
      type: z.enum(['text', 'emote', 'announcement']).optional(),
      emotes: z.array(z.string()).optional(),
    })
    .optional(),
});

export const chatDeleteMessageSchema = z.object({
  streamId: streamId(),
  messageId: messageId(),
  reason: sanitizedString(200).optional(),
});

export const chatModerateUserSchema = z.object({
  streamId: streamId(),
  userId: userId(),
  action: z.enum(['timeout', 'ban', 'unban', 'warn']),
  reason: sanitizedString(200).optional(),
  duration: z.number().min(1).max(86400).optional(), // Max 24 hours for timeout
});

export const chatTypingSchema = z.object({
  streamId: streamId(),
  isTyping: z.boolean(),
});

export const chatGetHistorySchema = z.object({
  streamId: streamId(),
  limit: z.number().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
});

export const chatReactSchema = z.object({
  streamId: streamId(),
  messageId: messageId(),
  emoji: z.string().emoji().max(2), // Single emoji only
  action: z.enum(['add', 'remove']).default('add'),
});

export const chatPinMessageSchema = z.object({
  streamId: streamId(),
  messageId: messageId(),
  pin: z.boolean(),
});

export const chatSlowModeSchema = z.object({
  streamId: streamId(),
  enabled: z.boolean(),
  delay: z.number().min(0).max(300).optional(), // Max 5 minutes
});

// ============================================================================
// VDO.NINJA EVENTS
// ============================================================================

export const vdoStreamEventSchema = z.object({
  streamId: streamId(),
  action: z.enum([
    'started',
    'stopped',
    'paused',
    'resumed',
    'ended',
    'error',
    'reconnecting',
    'reconnected',
  ]),
  error: sanitizedString(500).optional(),
  timestamp: z.string().datetime(),
});

export const vdoStatsEventSchema = z.object({
  streamId: streamId(),
  stats: z.object({
    viewerCount: z.number().min(0).optional(),
    bitrate: z.number().min(0).optional(),
    fps: z
      .object({
        current: z.number().min(0).max(120),
        target: z.number().min(0).max(120),
      })
      .optional(),
    resolution: z
      .object({
        width: z.number().min(0).max(7680),
        height: z.number().min(0).max(4320),
      })
      .optional(),
    audioLevel: z.number().min(-100).max(0).optional(),
    audioDropouts: z.number().min(0).optional(),
    latency: z.number().min(0).max(10000).optional(),
    packetLoss: z.number().min(0).max(100).optional(),
    jitter: z.number().min(0).optional(),
    connectionQuality: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']).optional(),
    connectionScore: z.number().min(0).max(100).optional(),
    isAudioMuted: z.boolean().optional(),
    isVideoHidden: z.boolean().optional(),
    isScreenSharing: z.boolean().optional(),
    isRecording: z.boolean().optional(),
    uploadSpeed: z.number().min(0).optional(),
    downloadSpeed: z.number().min(0).optional(),
    bytesSent: z.number().min(0).optional(),
    bytesReceived: z.number().min(0).optional(),
  }),
  timestamp: z.string().datetime(),
});

export const vdoViewerEventSchema = z.object({
  streamId: streamId(),
  action: z.enum(['joined', 'left', 'reconnected', 'kicked']),
  viewer: z.object({
    id: z.string(),
    username: sanitizedString(50).optional(),
    role: z.enum(['viewer', 'moderator', 'vip']).optional(),
  }),
  timestamp: z.string().datetime(),
});

export const vdoMediaEventSchema = z.object({
  streamId: streamId(),
  action: z.enum([
    'audioMuted',
    'audioUnmuted',
    'videoHidden',
    'videoShown',
    'screenShareStarted',
    'screenShareEnded',
  ]),
  timestamp: z.string().datetime(),
});

export const vdoQualityEventSchema = z.object({
  streamId: streamId(),
  action: z.enum(['changed', 'degraded', 'improved']),
  quality: z.object({
    preset: z.enum(['low', 'medium', 'high', 'ultra']).optional(),
    bitrate: z.number().min(0).optional(),
    resolution: z
      .object({
        width: z.number().min(0).max(7680),
        height: z.number().min(0).max(4320),
      })
      .optional(),
    fps: z.number().min(0).max(120).optional(),
  }),
  reason: sanitizedString(200).optional(),
  timestamp: z.string().datetime(),
});

export const vdoRecordingEventSchema = z.object({
  streamId: streamId(),
  action: z.enum(['started', 'stopped', 'paused', 'resumed', 'failed']),
  recording: z
    .object({
      id: z.string().optional(),
      duration: z.number().min(0).optional(),
      size: z.number().min(0).optional(),
      format: z.enum(['webm', 'mp4', 'mkv']).optional(),
    })
    .optional(),
  error: sanitizedString(500).optional(),
  timestamp: z.string().datetime(),
});

export const vdoGetAnalyticsSchema = z.object({
  streamId: streamId(),
  period: z.enum(['minute', '5minutes', '15minutes', 'hour', 'day']).default('5minutes'),
  includeViewers: z.boolean().default(false),
});

// ============================================================================
// NOTIFICATION EVENTS
// ============================================================================

export const notificationAckSchema = z.object({
  notificationId: uuid(),
  read: z.boolean().default(true),
});

// ============================================================================
// ANALYTICS NAMESPACE EVENTS
// ============================================================================

export const analyticsSubscribeSchema = z.object({
  streamId: streamId(),
  metrics: z
    .array(z.enum(['viewers', 'performance', 'quality', 'engagement', 'revenue']))
    .optional(),
});

export const analyticsUnsubscribeSchema = z.object({
  streamId: streamId(),
});

// ============================================================================
// TYPE EXPORTS - Infer TypeScript types from Zod schemas
// ============================================================================

// Stream Events
export type StreamJoinEvent = z.infer<typeof streamJoinSchema>;
export type StreamLeaveEvent = z.infer<typeof streamLeaveSchema>;
export type StreamUpdateEvent = z.infer<typeof streamUpdateSchema>;
export type StreamFeatureProductEvent = z.infer<typeof streamFeatureProductSchema>;
export type StreamStatsUpdateEvent = z.infer<typeof streamStatsUpdateSchema>;
export type StreamGetAnalyticsEvent = z.infer<typeof streamGetAnalyticsSchema>;

// Chat Events
export type ChatSendMessageEvent = z.infer<typeof chatSendMessageSchema>;
export type ChatDeleteMessageEvent = z.infer<typeof chatDeleteMessageSchema>;
export type ChatModerateUserEvent = z.infer<typeof chatModerateUserSchema>;
export type ChatTypingEvent = z.infer<typeof chatTypingSchema>;
export type ChatGetHistoryEvent = z.infer<typeof chatGetHistorySchema>;
export type ChatReactEvent = z.infer<typeof chatReactSchema>;
export type ChatPinMessageEvent = z.infer<typeof chatPinMessageSchema>;
export type ChatSlowModeEvent = z.infer<typeof chatSlowModeSchema>;

// VDO Events
export type VdoStreamEventValidated = z.infer<typeof vdoStreamEventSchema>;
export type VdoStatsEventValidated = z.infer<typeof vdoStatsEventSchema>;
export type VdoViewerEventValidated = z.infer<typeof vdoViewerEventSchema>;
export type VdoMediaEventValidated = z.infer<typeof vdoMediaEventSchema>;
export type VdoQualityEventValidated = z.infer<typeof vdoQualityEventSchema>;
export type VdoRecordingEventValidated = z.infer<typeof vdoRecordingEventSchema>;
export type VdoGetAnalyticsEventValidated = z.infer<typeof vdoGetAnalyticsSchema>;

// Notification Events
export type NotificationAckEvent = z.infer<typeof notificationAckSchema>;

// Analytics Events
export type AnalyticsSubscribeEvent = z.infer<typeof analyticsSubscribeSchema>;
export type AnalyticsUnsubscribeEvent = z.infer<typeof analyticsUnsubscribeSchema>;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates and sanitizes socket event data
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Validated and sanitized data or validation error
 */
export function validateSocketEvent<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string; details?: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        details: error,
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
    };
  }
}

/**
 * Creates a validation middleware for socket events
 * @param schema - The Zod schema to validate against
 * @returns Middleware function that validates the event data
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    const result = validateSocketEvent(schema, data);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  };
}
