import React, { useState, useEffect } from 'react';
import { 
  MoreVertical,
  Shield,
  Settings,
  Users,
  X,
  Crown
} from 'lucide-react';
import MessageListV2 from './MessageListV2';
import ChatInput from './ChatInput';
import { ChatMessage, Viewer } from '@/types/chat';

// Using Viewer from @/types/chat as our unified user type

// Using ChatMessage from @/types/chat - our canonical source

interface RateLimitState {
  messageCount: number;
  resetTime: number;
}

interface ChatContainerProps {
  streamId: string;
  viewerCount: number;
  onSendMessage: (message: string, mentions?: string[]) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReportMessage?: (messageId: string) => void;
  onBanUser?: (userId: string) => void;
  onTimeoutUser?: (userId: string, duration: number) => void;
  messages: ChatMessage[];
  viewers?: Viewer[];
  currentUser?: Viewer;
  maxMessagesPerMinute?: number;
  showViewerList?: boolean;
}

export const EnhancedChatContainer: React.FC<ChatContainerProps> = ({
  viewerCount,
  onSendMessage,
  onDeleteMessage,
  onReportMessage,
  onBanUser,
  onTimeoutUser,
  messages,
  viewers = [],
  currentUser,
  maxMessagesPerMinute = 10,
  showViewerList = false
}) => {
  const [showViewers, setShowViewers] = useState(showViewerList);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Rate limiting state
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    messageCount: 0,
    resetTime: Date.now() + 60000
  });

  // Rate limit reset
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (now >= rateLimit.resetTime) {
        setRateLimit({
          messageCount: 0,
          resetTime: now + 60000
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimit.resetTime]);

  // Handle sending message
  const handleSendMessage = (content: string, mentions?: string[]) => {
    onSendMessage(content, mentions);
    setRateLimit(prev => ({
      ...prev,
      messageCount: prev.messageCount + 1
    }));
  };


  // Get role badge
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'streamer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-600 text-white text-xs font-semibold rounded">
            <Crown className="w-3 h-3" />
            Streamer
          </span>
        );
      case 'moderator':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded">
            <Shield className="w-3 h-3" />
            Mod
          </span>
        );
      default:
        return null;
    }
  };


  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Chat</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowViewers(!showViewers)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                {viewerCount.toLocaleString()}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                    <button className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm">
                      <Settings className="w-4 h-4" />
                      Chat settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Messages Area */}
        <MessageListV2
          messages={messages}
          currentUser={currentUser}
          onDeleteMessage={onDeleteMessage}
          onReportMessage={onReportMessage}
          onTimeoutUser={onTimeoutUser}
          onBanUser={onBanUser}
          className="flex-1 min-h-0"
        />
        
        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <ChatInput
            onSendMessage={handleSendMessage}
            maxLength={500}
            placeholder="Type a message..."
            disabled={false}
            messageCount={rateLimit.messageCount}
            maxMessagesPerMinute={maxMessagesPerMinute}
            resetTime={rateLimit.resetTime}
            users={viewers}
            showEmojiPicker={true}
            showImageUpload={false}
          />
        </div>
      </div>

      {/* Viewer List Sidebar */}
      {showViewers && (
        <div className="w-64 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white">Viewers</h4>
              <button
                onClick={() => setShowViewers(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 73px)' }}>
            <div className="p-2 space-y-1">
              {viewers.map((viewer) => (
                <div
                  key={viewer.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="relative">
                    {viewer.avatar ? (
                      <img src={viewer.avatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {viewer.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    {viewer.isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-50 dark:border-gray-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {viewer.username}
                      </span>
                      {viewer.role && viewer.role !== 'viewer' && (
                        <div className="flex-shrink-0">
                          {getRoleBadge(viewer.role)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedChatContainer;