export interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  username: string;
  role?: string;
  streamId: string;
  timestamp: Date;
  type?: 'message' | 'announcement' | 'donation' | 'subscription' | 'system';
  replyTo?: string;
  metadata?: Record<string, any>;
  avatarUrl?: string;
}

export interface Viewer {
  id: string;
  username: string;
  role?: 'viewer' | 'moderator' | 'streamer';
  isOnline?: boolean;
  avatarUrl?: string | null;
  
  // Stream viewing properties
  joinTime?: Date;
  connectionQuality?: 'poor' | 'good' | 'excellent';
  isStreamer?: boolean;
  
  // Chat moderation properties  
  isBanned?: boolean;
  timeoutUntil?: Date;
}

export interface ChatModeration {
  id: string;
  streamId: string;
  userId: string;
  moderatorId: string;
  action: 'timeout' | 'ban' | 'unban';
  reason?: string;
  duration?: number;
  expiresAt?: Date;
  createdAt: Date;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}