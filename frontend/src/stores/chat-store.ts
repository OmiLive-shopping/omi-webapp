import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ChatUser {
  id: string;
  username: string;
  avatarUrl?: string;
  role: 'viewer' | 'subscriber' | 'moderator' | 'streamer';
  badges?: string[];
  color?: string;
  isMuted: boolean;
  isBanned: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'message' | 'announcement' | 'donation' | 'subscription' | 'system';
  isPinned: boolean;
  isDeleted: boolean;
  replyTo?: string;
  emotes?: Array<{ id: string; positions: number[] }>;
  badges?: string[];
  color?: string;
  donation?: {
    amount: number;
    currency: string;
    message?: string;
  };
  metadata?: Record<string, any>;
}

export interface ChatEmote {
  id: string;
  name: string;
  url: string;
  category: 'global' | 'channel' | 'subscriber';
}

export interface ChatSettings {
  slowMode: boolean;
  slowModeDelay: number; // seconds
  subscriberOnly: boolean;
  emoteOnly: boolean;
  followerOnly: boolean;
  followerOnlyDuration: number; // minutes
  uniqueChat: boolean;
  preventSpam: boolean;
  autoModeration: boolean;
  blockedWords: string[];
}

export interface ModerationAction {
  id: string;
  type: 'timeout' | 'ban' | 'unban' | 'delete' | 'purge';
  targetUserId: string;
  targetUsername: string;
  moderatorId: string;
  moderatorUsername: string;
  reason?: string;
  duration?: number; // seconds for timeout
  timestamp: Date;
}

interface ChatState {
  // Messages
  messages: ChatMessage[];
  pinnedMessage: ChatMessage | null;
  maxMessages: number;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  deleteMessage: (messageId: string) => void;
  pinMessage: (messageId: string) => void;
  unpinMessage: () => void;
  clearMessages: () => void;
  
  // Users
  users: Map<string, ChatUser>;
  addUser: (user: ChatUser) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<ChatUser>) => void;
  getUserById: (userId: string) => ChatUser | undefined;
  getActiveUsers: () => ChatUser[];
  
  // Moderation
  moderationLog: ModerationAction[];
  timeoutUser: (userId: string, duration: number, reason?: string, moderatorId?: string) => void;
  banUser: (userId: string, reason?: string, moderatorId?: string) => void;
  unbanUser: (userId: string, moderatorId?: string) => void;
  deleteUserMessages: (userId: string, moderatorId?: string) => void;
  purgeChat: (moderatorId?: string) => void;
  
  // Chat Settings
  settings: ChatSettings;
  updateSettings: (updates: Partial<ChatSettings>) => void;
  
  // Emotes
  emotes: Map<string, ChatEmote>;
  setEmotes: (emotes: ChatEmote[]) => void;
  addEmote: (emote: ChatEmote) => void;
  removeEmote: (emoteId: string) => void;
  
  // Slow Mode
  slowModeQueue: Map<string, Date>;
  canUserSendMessage: (userId: string) => boolean;
  recordUserMessage: (userId: string) => void;
  
  // Mentions and Highlights
  mentions: ChatMessage[];
  addMention: (message: ChatMessage) => void;
  clearMentions: () => void;
  
  // Statistics
  stats: {
    totalMessages: number;
    messagesPerMinute: number;
    activeUsers: number;
    topChatters: Array<{ userId: string; username: string; messageCount: number }>;
  };
  updateStats: () => void;
  
  // Utilities
  searchMessages: (query: string) => ChatMessage[];
  getMessageById: (messageId: string) => ChatMessage | undefined;
  getMessagesByUser: (userId: string) => ChatMessage[];
  exportChatLog: () => string;
}

const defaultSettings: ChatSettings = {
  slowMode: false,
  slowModeDelay: 5,
  subscriberOnly: false,
  emoteOnly: false,
  followerOnly: false,
  followerOnlyDuration: 10,
  uniqueChat: false,
  preventSpam: true,
  autoModeration: true,
  blockedWords: [],
};

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    // Messages
    messages: [],
    pinnedMessage: null,
    maxMessages: 500,
    addMessage: (messageData) => {
      const message: ChatMessage = {
        ...messageData,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };
      
      set((state) => {
        const messages = [...state.messages, message].slice(-state.maxMessages);
        
        // Check if message mentions current user
        const currentUserId = 'current-user'; // This should come from auth store
        if (message.content.includes(`@${currentUserId}`)) {
          get().addMention(message);
        }
        
        return { messages };
      });
      
      // Update stats
      get().updateStats();
    },
    deleteMessage: (messageId) => set((state) => ({
      messages: state.messages.map(msg =>
        msg.id === messageId ? { ...msg, isDeleted: true } : msg
      ),
    })),
    pinMessage: (messageId) => {
      const message = get().messages.find(msg => msg.id === messageId);
      if (message) {
        set({ pinnedMessage: { ...message, isPinned: true } });
      }
    },
    unpinMessage: () => set({ pinnedMessage: null }),
    clearMessages: () => set({ messages: [], mentions: [] }),
    
    // Users
    users: new Map(),
    addUser: (user) => set((state) => {
      const users = new Map(state.users);
      users.set(user.id, user);
      return { users };
    }),
    removeUser: (userId) => set((state) => {
      const users = new Map(state.users);
      users.delete(userId);
      return { users };
    }),
    updateUser: (userId, updates) => set((state) => {
      const users = new Map(state.users);
      const user = users.get(userId);
      if (user) {
        users.set(userId, { ...user, ...updates });
      }
      return { users };
    }),
    getUserById: (userId) => get().users.get(userId),
    getActiveUsers: () => Array.from(get().users.values()).filter(u => !u.isBanned),
    
    // Moderation
    moderationLog: [],
    timeoutUser: (userId, duration, reason, moderatorId = 'system') => {
      const user = get().users.get(userId);
      if (!user) return;
      
      const action: ModerationAction = {
        id: `mod-${Date.now()}`,
        type: 'timeout',
        targetUserId: userId,
        targetUsername: user.username,
        moderatorId,
        moderatorUsername: get().users.get(moderatorId)?.username || 'System',
        reason,
        duration,
        timestamp: new Date(),
      };
      
      set((state) => ({
        moderationLog: [...state.moderationLog, action],
      }));
      
      get().updateUser(userId, { isMuted: true });
      
      // Auto unmute after duration
      setTimeout(() => {
        get().updateUser(userId, { isMuted: false });
      }, duration * 1000);
    },
    banUser: (userId, reason, moderatorId = 'system') => {
      const user = get().users.get(userId);
      if (!user) return;
      
      const action: ModerationAction = {
        id: `mod-${Date.now()}`,
        type: 'ban',
        targetUserId: userId,
        targetUsername: user.username,
        moderatorId,
        moderatorUsername: get().users.get(moderatorId)?.username || 'System',
        reason,
        timestamp: new Date(),
      };
      
      set((state) => ({
        moderationLog: [...state.moderationLog, action],
      }));
      
      get().updateUser(userId, { isBanned: true });
    },
    unbanUser: (userId, moderatorId = 'system') => {
      const user = get().users.get(userId);
      if (!user) return;
      
      const action: ModerationAction = {
        id: `mod-${Date.now()}`,
        type: 'unban',
        targetUserId: userId,
        targetUsername: user.username,
        moderatorId,
        moderatorUsername: get().users.get(moderatorId)?.username || 'System',
        timestamp: new Date(),
      };
      
      set((state) => ({
        moderationLog: [...state.moderationLog, action],
      }));
      
      get().updateUser(userId, { isBanned: false });
    },
    deleteUserMessages: (userId, moderatorId = 'system') => {
      const user = get().users.get(userId);
      if (!user) return;
      
      const action: ModerationAction = {
        id: `mod-${Date.now()}`,
        type: 'purge',
        targetUserId: userId,
        targetUsername: user.username,
        moderatorId,
        moderatorUsername: get().users.get(moderatorId)?.username || 'System',
        timestamp: new Date(),
      };
      
      set((state) => ({
        messages: state.messages.map(msg =>
          msg.userId === userId ? { ...msg, isDeleted: true } : msg
        ),
        moderationLog: [...state.moderationLog, action],
      }));
    },
    purgeChat: (moderatorId = 'system') => {
      const action: ModerationAction = {
        id: `mod-${Date.now()}`,
        type: 'purge',
        targetUserId: 'all',
        targetUsername: 'All Users',
        moderatorId,
        moderatorUsername: get().users.get(moderatorId)?.username || 'System',
        timestamp: new Date(),
      };
      
      set((state) => ({
        messages: [],
        moderationLog: [...state.moderationLog, action],
      }));
    },
    
    // Chat Settings
    settings: defaultSettings,
    updateSettings: (updates) => set((state) => ({
      settings: { ...state.settings, ...updates },
    })),
    
    // Emotes
    emotes: new Map(),
    setEmotes: (emotes) => {
      const emotesMap = new Map(emotes.map(e => [e.id, e]));
      set({ emotes: emotesMap });
    },
    addEmote: (emote) => set((state) => {
      const emotes = new Map(state.emotes);
      emotes.set(emote.id, emote);
      return { emotes };
    }),
    removeEmote: (emoteId) => set((state) => {
      const emotes = new Map(state.emotes);
      emotes.delete(emoteId);
      return { emotes };
    }),
    
    // Slow Mode
    slowModeQueue: new Map(),
    canUserSendMessage: (userId) => {
      const { settings, slowModeQueue } = get();
      if (!settings.slowMode) return true;
      
      const lastMessageTime = slowModeQueue.get(userId);
      if (!lastMessageTime) return true;
      
      const timeSinceLastMessage = Date.now() - lastMessageTime.getTime();
      return timeSinceLastMessage >= settings.slowModeDelay * 1000;
    },
    recordUserMessage: (userId) => set((state) => {
      const queue = new Map(state.slowModeQueue);
      queue.set(userId, new Date());
      return { slowModeQueue: queue };
    }),
    
    // Mentions and Highlights
    mentions: [],
    addMention: (message) => set((state) => ({
      mentions: [...state.mentions, message].slice(-50), // Keep last 50 mentions
    })),
    clearMentions: () => set({ mentions: [] }),
    
    // Statistics
    stats: {
      totalMessages: 0,
      messagesPerMinute: 0,
      activeUsers: 0,
      topChatters: [],
    },
    updateStats: () => {
      const { messages, users } = get();
      const oneMinuteAgo = Date.now() - 60000;
      const recentMessages = messages.filter(msg => 
        msg.timestamp.getTime() > oneMinuteAgo && !msg.isDeleted
      );
      
      // Count messages per user
      const messageCounts = new Map<string, number>();
      messages.forEach(msg => {
        if (!msg.isDeleted) {
          const count = messageCounts.get(msg.userId) || 0;
          messageCounts.set(msg.userId, count + 1);
        }
      });
      
      // Get top chatters
      const topChatters = Array.from(messageCounts.entries())
        .map(([userId, count]) => {
          const user = users.get(userId);
          return {
            userId,
            username: user?.username || 'Unknown',
            messageCount: count,
          };
        })
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10);
      
      set({
        stats: {
          totalMessages: messages.filter(msg => !msg.isDeleted).length,
          messagesPerMinute: recentMessages.length,
          activeUsers: users.size,
          topChatters,
        },
      });
    },
    
    // Utilities
    searchMessages: (query) => {
      const lowerQuery = query.toLowerCase();
      return get().messages.filter(msg =>
        !msg.isDeleted &&
        (msg.content.toLowerCase().includes(lowerQuery) ||
         msg.username.toLowerCase().includes(lowerQuery))
      );
    },
    getMessageById: (messageId) => get().messages.find(msg => msg.id === messageId),
    getMessagesByUser: (userId) => get().messages.filter(msg => 
      msg.userId === userId && !msg.isDeleted
    ),
    exportChatLog: () => {
      const { messages } = get();
      return messages
        .filter(msg => !msg.isDeleted)
        .map(msg => `[${msg.timestamp.toISOString()}] ${msg.username}: ${msg.content}`)
        .join('\n');
    },
  }))
);