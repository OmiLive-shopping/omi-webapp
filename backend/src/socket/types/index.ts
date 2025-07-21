// Socket.IO Event Types
export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  role: string;
  timestamp: Date;
  replyTo?: string;
  type: 'message' | 'system' | 'announcement';
}

export interface StreamViewerUpdate {
  viewerCount: number;
  viewer?: {
    id: string;
    username: string;
  };
}

export interface StreamUpdate {
  streamId: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface FeaturedProduct {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    description?: string;
  };
  duration: number;
  featuredBy: {
    id: string;
    username: string;
  };
}

export interface ModerationAction {
  userId: string;
  action: 'timeout' | 'ban' | 'unban';
  moderatorId: string;
  reason?: string;
  duration?: number;
  timestamp: Date;
}

export interface StreamAnalytics {
  streamId: string;
  currentViewers: number;
  authenticatedViewers: number;
  anonymousViewers: number;
  viewerList: Array<{
    userId: string;
    username: string;
    joinedAt: Date;
  }>;
}

// Socket Events
export enum SocketEvents {
  // Connection
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // Stream
  STREAM_JOIN = 'stream:join',
  STREAM_LEAVE = 'stream:leave',
  STREAM_JOINED = 'stream:joined',
  STREAM_LEFT = 'stream:left',
  STREAM_UPDATE = 'stream:update',
  STREAM_UPDATED = 'stream:updated',
  STREAM_VIEWER_JOINED = 'stream:viewer:joined',
  STREAM_VIEWER_LEFT = 'stream:viewer:left',
  STREAM_FEATURE_PRODUCT = 'stream:feature-product',
  STREAM_PRODUCT_FEATURED = 'stream:product:featured',
  STREAM_GET_ANALYTICS = 'stream:get-analytics',
  STREAM_ANALYTICS = 'stream:analytics',
  STREAM_WENT_LIVE = 'stream:went-live',
  STREAM_ENDED = 'stream:ended',

  // Chat
  CHAT_SEND_MESSAGE = 'chat:send-message',
  CHAT_MESSAGE = 'chat:message',
  CHAT_MESSAGE_SENT = 'chat:message:sent',
  CHAT_DELETE_MESSAGE = 'chat:delete-message',
  CHAT_MESSAGE_DELETED = 'chat:message:deleted',
  CHAT_MODERATE_USER = 'chat:moderate-user',
  CHAT_USER_MODERATED = 'chat:user:moderated',
  CHAT_MODERATION_SUCCESS = 'chat:moderation:success',
  CHAT_TYPING = 'chat:typing',
  CHAT_USER_TYPING = 'chat:user:typing',
  CHAT_USER_STOPPED_TYPING = 'chat:user:stopped-typing',
  CHAT_GET_HISTORY = 'chat:get-history',
  CHAT_HISTORY = 'chat:history',

  // Notifications
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_ACK = 'notification:ack',

  // Analytics
  ANALYTICS_SUBSCRIBE = 'analytics:subscribe',
  ANALYTICS_UNSUBSCRIBE = 'analytics:unsubscribe',
  ANALYTICS_UPDATE = 'analytics:update',
}
