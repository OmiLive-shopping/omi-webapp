import React, { useState, useRef, useEffect, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import {
  Send,
  Smile,
  Image,
  AlertCircle,
  Clock
} from 'lucide-react';
import clsx from 'clsx';

interface ChatInputProps {
  onSendMessage: (message: string, mentions?: string[]) => void;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  // Rate limiting
  messageCount?: number;
  maxMessagesPerMinute?: number;
  resetTime?: number;
  // Mention suggestions
  users?: Array<{ id: string; username: string; avatar?: string }>;
  // Customization
  className?: string;
  showEmojiPicker?: boolean;
  showImageUpload?: boolean;
}

const commonEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '🚀', '😎', '🤔', '👏', '💪', '✨', '🌟', '💖', '🙌'];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  maxLength = 500,
  placeholder = "Type a message...",
  disabled = false,
  messageCount = 0,
  maxMessagesPerMinute = 10,
  resetTime = 0,
  users = [],
  className,
  showEmojiPicker = true,
  showImageUpload = false
}) => {
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // Calculate rate limit status
  const isRateLimited = messageCount >= maxMessagesPerMinute;
  const timeUntilReset = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
  const warningThreshold = maxMessagesPerMinute - 2;
  const showRateWarning = messageCount >= warningThreshold;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojis(false);
      }
      if (mentionListRef.current && !mentionListRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract mentions from message
  const extractMentions = useCallback((text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }, []);

  // Handle sending message
  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isRateLimited || isSending) return;

    setIsSending(true);
    try {
      const mentions = extractMentions(trimmedMessage);
      onSendMessage(trimmedMessage, mentions);
      setMessage('');
      setShowEmojis(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
    }
  }, [message, disabled, isRateLimited, isSending, extractMentions, onSendMessage]);

  // Handle input change with mention detection
  const handleInputChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    // Enforce max length
    if (value.length > maxLength) return;
    
    setMessage(value);

    // Mention detection
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      // Just typed @
      setShowMentions(true);
      setMentionStartIndex(lastAtIndex);
      setMentionSearch('');
      setSelectedMentionIndex(0);
    } else if (lastAtIndex !== -1 && showMentions) {
      // Typing after @
      const search = textBeforeCursor.slice(lastAtIndex + 1);
      if (search.includes(' ')) {
        setShowMentions(false);
      } else {
        setMentionSearch(search);
      }
    } else {
      setShowMentions(false);
    }
  }, [maxLength, showMentions]);

  // Filter users for mention suggestions
  const filteredUsers = users.filter(user =>
    user.username && user.username.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  // Handle mention selection
  const selectMention = useCallback((username: string) => {
    const beforeMention = message.slice(0, mentionStartIndex);
    const afterMention = message.slice(mentionStartIndex + mentionSearch.length + 1);
    setMessage(`${beforeMention}@${username} ${afterMention}`);
    setShowMentions(false);
    textareaRef.current?.focus();
  }, [message, mentionStartIndex, mentionSearch]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention navigation
    if (showMentions && filteredUsers.length > 0) {
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
        setShowMentions(false);
      }
      return;
    }

    // Send on Enter, newline on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [showMentions, filteredUsers, selectedMentionIndex, selectMention, handleSend]);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const newMessage = message.slice(0, start) + emoji + message.slice(end);
    
    if (newMessage.length <= maxLength) {
      setMessage(newMessage);
      setShowEmojis(false);
      
      // Restore focus and cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  }, [message, maxLength]);

  // Handle paste events (for future image support)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (!showImageUpload) return;

    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      e.preventDefault();
      // TODO: Implement image upload
      console.log('Image paste detected - feature coming soon!');
    }
  }, [showImageUpload]);

  return (
    <div className={clsx("relative", className)}>
      {/* Rate Limit Warning */}
      {showRateWarning && (
        <div className="absolute bottom-full left-0 right-0 mb-2">
          <div className={clsx(
            "px-3 py-1 rounded-lg text-sm flex items-center gap-2",
            isRateLimited
              ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300"
              : "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
          )}>
            {isRateLimited ? (
              <>
                <Clock className="w-4 h-4" />
                Message limit reached. Wait {timeUntilReset}s
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                {maxMessagesPerMinute - messageCount} messages remaining
              </>
            )}
          </div>
        </div>
      )}

      {/* Mention Suggestions */}
      {showMentions && filteredUsers.length > 0 && (
        <div
          ref={mentionListRef}
          className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
        >
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
                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold">
                  {user.username[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium">{user.username}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Input Container with minimal padding */}
      <div className="p-3">
        {/* Input and Send Button Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              disabled={disabled || isRateLimited}
              rows={1}
              className={clsx(
                "w-full px-3 py-2.5 resize-none",
                "bg-gray-100 dark:bg-gray-800",
                "text-gray-900 dark:text-white",
                "rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500",
                "transition-colors",
                "max-h-32 overflow-y-auto",
                "h-[44px]",
                "leading-tight",
                (disabled || isRateLimited) && "opacity-50 cursor-not-allowed"
              )}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!message.trim() || disabled || isRateLimited || isSending}
            className={clsx(
              "px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-1.5",
              "transform active:scale-95 h-[44px] flex-shrink-0",
              message.trim() && !disabled && !isRateLimited && !isSending
                ? "bg-primary-600 text-white hover:bg-primary-700 shadow-sm"
                : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
            )}
          >
            <Send className={clsx(
              "w-4 h-4 transition-transform",
              isSending && "animate-pulse"
            )} />
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;