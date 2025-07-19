import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  MoreHorizontal,
  Trash2,
  Flag,
  Clock,
  Ban,
  Shield,
  Crown,
  ChevronDown
} from 'lucide-react';
import clsx from 'clsx';

export interface ChatUser {
  id: string;
  username: string;
  avatar?: string;
  role?: 'viewer' | 'moderator' | 'streamer';
}

export interface ChatMessage {
  id: string;
  user: ChatUser;
  content: string;
  timestamp: Date;
  isHighlighted?: boolean;
  isPinned?: boolean;
  isDeleted?: boolean;
  mentions?: string[];
}

interface MessageListProps {
  messages: ChatMessage[];
  currentUser?: ChatUser;
  onDeleteMessage?: (messageId: string) => void;
  onReportMessage?: (messageId: string) => void;
  onTimeoutUser?: (userId: string, duration: number) => void;
  onBanUser?: (userId: string) => void;
  className?: string;
}

export const MessageListV2: React.FC<MessageListProps> = ({
  messages,
  currentUser,
  onDeleteMessage,
  onReportMessage,
  onTimeoutUser,
  onBanUser,
  className
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Check if current user is moderator or streamer
  const isModerator = currentUser?.role === 'moderator' || currentUser?.role === 'streamer';

  // Calculate total items (messages) for virtualizer
  const totalMessages = messages.length;

  // Check if this is the first message in a group
  const isFirstInGroup = useCallback((index: number) => {
    if (index === 0) return true;
    return messages[index].user.id !== messages[index - 1].user.id;
  }, [messages]);

  // Virtual scrolling setup with proper sizing
  const virtualizer = useVirtualizer({
    count: totalMessages,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback((index) => {
      // Base message height
      const baseHeight = 60;
      // Add extra height for messages with header (username, timestamp, etc)
      const headerHeight = isFirstInGroup(index) ? 30 : 0;
      // Add spacing between different users (except for first message)
      const spacing = isFirstInGroup(index) && index > 0 ? 16 : 0;
      
      return baseHeight + headerHeight + spacing;
    }, [isFirstInGroup]),
    overscan: 5,
  });

  // Auto-scroll effect
  useEffect(() => {
    if (isAutoScrollEnabled && scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [messages, isAutoScrollEnabled]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setIsAutoScrollEnabled(isAtBottom);
    setShowScrollButton(!isAtBottom && scrollHeight > clientHeight);
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setIsAutoScrollEnabled(true);
    }
  }, []);

  // Format timestamp
  const formatTimestamp = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }, []);

  // Get role badge
  const getRoleBadge = useCallback((role?: string) => {
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
  }, []);

  // Get message from index
  const getMessageFromIndex = useCallback((index: number) => {
    return messages[index];
  }, [messages]);

  // Render message content with mention highlighting
  const renderMessageContent = useCallback((content: string) => {
    return content.split(/(@\w+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-primary-600 dark:text-primary-400 font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!e.target || !(e.target as HTMLElement).closest('.message-actions')) {
        setSelectedMessageId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={clsx("relative h-full flex flex-col", className)}>
      {/* Virtual scrolling container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const message = getMessageFromIndex(virtualItem.index);
            const showAvatar = isFirstInGroup(virtualItem.index);
            const needsSpacing = showAvatar && virtualItem.index > 0;

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="h-full flex flex-col">
                  {/* Spacing between different users */}
                  {needsSpacing && <div className="flex-shrink-0 h-4" />}
                  
                  {/* Message container */}
                  <div
                    className={clsx(
                      "flex gap-3 p-2 rounded-lg transition-colors group relative flex-1",
                      message.isHighlighted && "bg-yellow-50 dark:bg-yellow-900/20",
                      message.isPinned && "border-l-4 border-primary-500",
                      message.isDeleted && "opacity-50",
                      message.user.id === currentUser?.id && "bg-primary-50 dark:bg-primary-900/10",
                      "hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8">
                      {showAvatar && (
                        <>
                          {message.user.avatar ? (
                            <img 
                              src={message.user.avatar} 
                              alt={message.user.username}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                {message.user.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">
                            {message.user.username}
                          </span>
                          {getRoleBadge(message.user.role)}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                      )}
                      {message.isDeleted ? (
                        <p className="text-sm italic text-gray-500 dark:text-gray-400">
                          [Message deleted]
                        </p>
                      ) : (
                        <p className="text-sm break-words whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                          {renderMessageContent(message.content)}
                        </p>
                      )}
                    </div>
                    
                    {/* Message Actions */}
                    {!message.isDeleted && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity message-actions">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMessageId(message.id === selectedMessageId ? null : message.id);
                            }}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                          </button>
                          {selectedMessageId === message.id && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                              {/* Report option for all users */}
                              {message.user.id !== currentUser?.id && (
                                <button
                                  onClick={() => {
                                    onReportMessage?.(message.id);
                                    setSelectedMessageId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                                >
                                  <Flag className="w-4 h-4" />
                                  Report message
                                </button>
                              )}
                              
                              {/* Delete option for own messages or moderators */}
                              {(isModerator || currentUser?.id === message.user.id) && (
                                <button
                                  onClick={() => {
                                    onDeleteMessage?.(message.id);
                                    setSelectedMessageId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete message
                                </button>
                              )}
                              
                              {/* Moderation options */}
                              {isModerator && message.user.id !== currentUser?.id && (
                                <>
                                  <button
                                    onClick={() => {
                                      onTimeoutUser?.(message.user.id, 5 * 60 * 1000); // 5 min timeout
                                      setSelectedMessageId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400"
                                  >
                                    <Clock className="w-4 h-4" />
                                    Timeout 5 min
                                  </button>
                                  <button
                                    onClick={() => {
                                      onBanUser?.(message.user.id);
                                      setSelectedMessageId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                                  >
                                    <Ban className="w-4 h-4" />
                                    Ban user
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <button
            onClick={scrollToBottom}
            className="px-3 py-1 bg-gray-800 text-white text-sm rounded-full hover:bg-gray-700 flex items-center gap-1 shadow-lg"
          >
            <ChevronDown className="w-4 h-4" />
            New messages
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageListV2;