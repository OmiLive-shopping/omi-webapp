import React, { useState, useRef, useEffect } from 'react';
import { 
  Send,
  Smile,
  MoreVertical,
  Shield,
  Video,
  Pause,
  Play,
  Settings,
  Users,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import clsx from 'clsx';

interface ChatMessage {
  id: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
    role?: 'viewer' | 'moderator' | 'streamer';
  };
  content: string;
  timestamp: Date;
  isHighlighted?: boolean;
  isPinned?: boolean;
}

interface ChatContainerProps {
  streamId: string;
  viewerCount: number;
  onSendMessage: (message: string) => void;
  messages: ChatMessage[];
  currentUserId?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  streamId: _streamId,
  viewerCount,
  onSendMessage,
  messages,
  currentUserId
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isAutoScrollEnabled && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, isAutoScrollEnabled]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'streamer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-600 text-white text-xs font-semibold rounded">
            <Video className="w-3 h-3" />
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

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  // Common emojis for quick selection
  const commonEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '🚀'];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Chat</h3>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm rounded">
              <Users className="w-4 h-4" />
              {viewerCount.toLocaleString()}
            </span>
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
                "flex gap-3 p-2 rounded-lg transition-colors group",
                msg.isHighlighted && "bg-yellow-50 dark:bg-yellow-900/20",
                msg.isPinned && "border-l-4 border-primary-500",
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
                <p className="text-sm break-words whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {msg.content}
                </p>
              </div>
              
              {/* Message Actions */}
              {currentUserId === msg.user.id && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </button>
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
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={200}
              className="w-full px-4 py-2 pr-20 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {inputValue.length}/200
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
            disabled={!inputValue.trim()}
            className={clsx(
              "px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2",
              inputValue.trim()
                ? "bg-primary-600 text-white hover:bg-primary-700"
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};