import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send,
  Smile,
  MoreVertical,
  Shield,
  Video,
  Trash2,
  Pause,
  Play,
  Settings,
  Users,
  ChevronDown,
  MoreHorizontal,
  Clock,
  Ban,
  AtSign,
  X,
  AlertCircle,
  Crown
} from 'lucide-react';
import clsx from 'clsx';

interface ChatUser {
  id: string;
  username: string;
  avatar?: string;
  role?: 'viewer' | 'moderator' | 'streamer';
  isOnline?: boolean;
  isBanned?: boolean;
  timeoutUntil?: Date;
}

interface ChatMessage {
  id: string;
  user: ChatUser;
  content: string;
  timestamp: Date;
  isHighlighted?: boolean;
  isPinned?: boolean;
  isDeleted?: boolean;
  mentions?: string[];
}

interface RateLimitState {
  messageCount: number;
  resetTime: number;
}

interface ChatContainerProps {
  streamId: string;
  viewerCount: number;
  onSendMessage: (message: string, mentions?: string[]) => void;
  onDeleteMessage?: (messageId: string) => void;
  onBanUser?: (userId: string) => void;
  onTimeoutUser?: (userId: string, duration: number) => void;
  messages: ChatMessage[];
  viewers?: ChatUser[];
  currentUser?: ChatUser;
  maxMessagesPerMinute?: number;
  showViewerList?: boolean;
}

export const EnhancedChatContainer: React.FC<ChatContainerProps> = ({
  streamId,
  viewerCount,
  onSendMessage,
  onDeleteMessage,
  onBanUser,
  onTimeoutUser,
  messages,
  viewers = [],
  currentUser,
  maxMessagesPerMinute = 10,
  showViewerList = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showViewers, setShowViewers] = useState(showViewerList);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  
  // Rate limiting state
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    messageCount: 0,
    resetTime: Date.now() + 60000
  });
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Common emojis for quick selection
  const commonEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '🚀', '😎', '🤔', '👏', '💪'];

  // Check if current user is moderator or streamer
  const isModerator = currentUser?.role === 'moderator' || currentUser?.role === 'streamer';

  // Auto-scroll effect
  useEffect(() => {
    if (isAutoScrollEnabled && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isAutoScrollEnabled]);

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

  // Extract mentions from message
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  // Handle sending message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Check rate limit
    if (rateLimit.messageCount >= maxMessagesPerMinute) {
      const timeLeft = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
      alert(`Please wait ${timeLeft} seconds before sending another message.`);
      return;
    }

    const mentions = extractMentions(inputValue);
    onSendMessage(inputValue, mentions);
    setInputValue('');
    setRateLimit(prev => ({
      ...prev,
      messageCount: prev.messageCount + 1
    }));
  };

  // Handle input changes and mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Check for @ symbol
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      // Just typed @
      setShowMentionSuggestions(true);
      setMentionStartIndex(lastAtIndex);
      setMentionSearch('');
      setSelectedMentionIndex(0);
    } else if (lastAtIndex !== -1 && showMentionSuggestions) {
      // Typing after @
      const search = textBeforeCursor.slice(lastAtIndex + 1);
      if (search.includes(' ')) {
        setShowMentionSuggestions(false);
      } else {
        setMentionSearch(search);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  };

  // Filter users for mention suggestions
  const filteredUsers = viewers.filter(user => 
    user.username.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  // Handle mention selection
  const selectMention = (username: string) => {
    const beforeMention = inputValue.slice(0, mentionStartIndex);
    const afterMention = inputValue.slice(mentionStartIndex + mentionSearch.length + 1);
    setInputValue(`${beforeMention}@${username} ${afterMention}`);
    setShowMentionSuggestions(false);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation for mentions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionSuggestions && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMention(filteredUsers[selectedMentionIndex].username);
      } else if (e.key === 'Escape') {
        setShowMentionSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
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

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  return (
    <div className="h-full flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
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
                    <button
                      onClick={() => {
                        setIsAutoScrollEnabled(!isAutoScrollEnabled);
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                    >
                      {isAutoScrollEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isAutoScrollEnabled ? 'Pause auto-scroll' : 'Resume auto-scroll'}
                    </button>
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
        <div 
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto px-4"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
            setIsAutoScrollEnabled(isAtBottom);
          }}
        >
          <div className="py-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={clsx(
                  "flex gap-3 p-2 rounded-lg transition-colors group relative",
                  msg.isHighlighted && "bg-yellow-50 dark:bg-yellow-900/20",
                  msg.isPinned && "border-l-4 border-primary-500",
                  msg.isDeleted && "opacity-50",
                  "hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {msg.user.avatar ? (
                    <img 
                      src={msg.user.avatar} 
                      alt={msg.user.username}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {msg.user.username[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                      {msg.user.username}
                    </span>
                    {getRoleBadge(msg.user.role)}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  {msg.isDeleted ? (
                    <p className="text-sm italic text-gray-500 dark:text-gray-400">
                      [Message deleted]
                    </p>
                  ) : (
                    <p className="text-sm break-words whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                      {msg.content.split(/(@\w+)/g).map((part, i) => {
                        if (part.startsWith('@')) {
                          return (
                            <span key={i} className="text-primary-600 dark:text-primary-400 font-medium">
                              {part}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </p>
                  )}
                </div>
                
                {/* Message Actions */}
                {(isModerator || currentUser?.id === msg.user.id) && !msg.isDeleted && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative">
                      <button
                        onClick={() => setSelectedMessageId(msg.id === selectedMessageId ? null : msg.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </button>
                      {selectedMessageId === msg.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                          <button
                            onClick={() => {
                              onDeleteMessage?.(msg.id);
                              setSelectedMessageId(null);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete message
                          </button>
                          {isModerator && msg.user.id !== currentUser?.id && (
                            <>
                              <button
                                onClick={() => {
                                  onTimeoutUser?.(msg.user.id, 5 * 60 * 1000); // 5 min timeout
                                  setSelectedMessageId(null);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400"
                              >
                                <Clock className="w-4 h-4" />
                                Timeout 5 min
                              </button>
                              <button
                                onClick={() => {
                                  onBanUser?.(msg.user.id);
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
            ))}
          </div>
          
          {/* New Messages Indicator */}
          {!isAutoScrollEnabled && (
            <div className="sticky bottom-0 flex justify-center pb-2">
              <button
                onClick={() => {
                  setIsAutoScrollEnabled(true);
                  if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
                  }
                }}
                className="px-3 py-1 bg-gray-800 text-white text-sm rounded-full hover:bg-gray-700 flex items-center gap-1"
              >
                <ChevronDown className="w-4 h-4" />
                New messages
              </button>
            </div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {/* Rate Limit Warning */}
          {rateLimit.messageCount >= maxMessagesPerMinute - 2 && (
            <div className="mb-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {rateLimit.messageCount >= maxMessagesPerMinute
                ? `Message limit reached. Wait ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)}s`
                : `${maxMessagesPerMinute - rateLimit.messageCount} messages remaining`}
            </div>
          )}
          
          <div className="flex gap-2 relative">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                maxLength={500}
                className="w-full px-4 py-2 pr-20 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              
              {/* Mention Suggestions */}
              {showMentionSuggestions && filteredUsers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {filteredUsers.map((user, index) => (
                    <button
                      key={user.id}
                      onClick={() => selectMention(user.username)}
                      className={clsx(
                        "w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2",
                        index === selectedMentionIndex && "bg-gray-100 dark:bg-gray-700"
                      )}
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600" />
                      )}
                      <span className="text-sm font-medium">{user.username}</span>
                      {getRoleBadge(user.role)}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {inputValue.length}/500
                </span>
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-4 gap-1">
                        {commonEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiSelect(emoji)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || rateLimit.messageCount >= maxMessagesPerMinute}
              className={clsx(
                "px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2",
                inputValue.trim() && rateLimit.messageCount < maxMessagesPerMinute
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
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