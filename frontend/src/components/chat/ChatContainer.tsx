import React, { useState, useRef, useEffect } from 'react';
import { 
  Chat, 
  ScrollArea, 
  Avatar,
  Input,
  Button,
  EmojiPicker,
  Badge,
  Icon,
  Text,
  Heading,
  Dropdown,
  Tooltip
} from '@bolt/ui';

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
  streamId,
  viewerCount,
  onSendMessage,
  messages,
  currentUserId
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

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
          <Badge variant="primary" size="xs">
            <Icon name="video" size="xs" className="mr-0.5" />
            Streamer
          </Badge>
        );
      case 'moderator':
        return (
          <Badge variant="success" size="xs">
            <Icon name="shield" size="xs" className="mr-0.5" />
            Mod
          </Badge>
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

  return (
    <Chat.Container className="h-full flex flex-col bg-white dark:bg-gray-900">
      <Chat.Header className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <Heading size="sm">Live Chat</Heading>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              <Icon name="users" size="xs" className="mr-1" />
              {viewerCount.toLocaleString()}
            </Badge>
            <Dropdown>
              <Dropdown.Trigger>
                <Button variant="ghost" size="sm">
                  <Icon name="more-vertical" size="sm" />
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}>
                  <Icon name={isAutoScrollEnabled ? "pause" : "play"} size="sm" className="mr-2" />
                  {isAutoScrollEnabled ? 'Pause auto-scroll' : 'Resume auto-scroll'}
                </Dropdown.Item>
                <Dropdown.Item>
                  <Icon name="settings" size="sm" className="mr-2" />
                  Chat settings
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </Chat.Header>
      
      <ScrollArea 
        className="flex-1 px-4" 
        ref={scrollAreaRef}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
          setIsAutoScrollEnabled(isAtBottom);
        }}
      >
        <Chat.MessageList className="py-4 space-y-3">
          {messages.map((msg) => (
            <Chat.Message
              key={msg.id}
              className={`
                flex gap-3 p-2 rounded-lg transition-colors
                ${msg.isHighlighted ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}
                ${msg.isPinned ? 'border-l-4 border-primary-500' : ''}
                hover:bg-gray-50 dark:hover:bg-gray-800
              `}
            >
              <Avatar 
                src={msg.user.avatar} 
                name={msg.user.username}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <Text weight="semibold" className="text-sm">
                    {msg.user.username}
                  </Text>
                  {getRoleBadge(msg.user.role)}
                  <Text variant="muted" size="xs">
                    {formatTimestamp(msg.timestamp)}
                  </Text>
                </div>
                <Text className="text-sm break-words whitespace-pre-wrap">
                  {msg.content}
                </Text>
              </div>
              {currentUserId === msg.user.id && (
                <Dropdown>
                  <Dropdown.Trigger>
                    <Button variant="ghost" size="xs" className="opacity-0 group-hover:opacity-100">
                      <Icon name="more-horizontal" size="xs" />
                    </Button>
                  </Dropdown.Trigger>
                  <Dropdown.Menu>
                    <Dropdown.Item>
                      <Icon name="trash" size="sm" className="mr-2" />
                      Delete
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </Chat.Message>
          ))}
        </Chat.MessageList>
        
        {!isAutoScrollEnabled && (
          <div className="sticky bottom-0 flex justify-center pb-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsAutoScrollEnabled(true);
                if (scrollAreaRef.current) {
                  scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
                }
              }}
            >
              <Icon name="arrow-down" size="sm" className="mr-1" />
              New messages
            </Button>
          </div>
        )}
      </ScrollArea>
      
      <Chat.Input className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={200}
              className="pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Text variant="muted" size="xs">
                {inputValue.length}/200
              </Text>
              <Tooltip content="Add emoji">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Icon name="smile" size="sm" />
                </Button>
              </Tooltip>
            </div>
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2">
                <EmojiPicker
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
          >
            <Icon name="send" size="sm" />
          </Button>
        </div>
      </Chat.Input>
    </Chat.Container>
  );
};