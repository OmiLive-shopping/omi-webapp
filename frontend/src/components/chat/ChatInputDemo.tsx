import React, { useState } from 'react';
import ChatInput from './ChatInput';

const sampleUsers = [
  { id: '1', username: 'StreamerPro', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: '2', username: 'ModeratorMike', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: '3', username: 'ViewerVicky', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', username: 'ChatterChris', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: '5', username: 'GamerGary' },
];

export const ChatInputDemo: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ text: string; mentions?: string[]; timestamp: Date }>>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [resetTime, setResetTime] = useState(Date.now() + 60000);
  const maxMessagesPerMinute = 10;

  // Reset rate limit every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (now >= resetTime) {
        setMessageCount(0);
        setResetTime(now + 60000);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [resetTime]);

  const handleSendMessage = (message: string, mentions?: string[]) => {
    console.log('Message sent:', message, 'Mentions:', mentions);
    setMessages(prev => [...prev, { text: message, mentions, timestamp: new Date() }]);
    setMessageCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Chat Input Demo</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the ChatInput component with all its features:
          </p>
          <ul className="mt-2 list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
            <li>Auto-resize textarea (type multiple lines)</li>
            <li>Emoji picker (click the smile icon)</li>
            <li>Mention suggestions (type @ followed by a username)</li>
            <li>Character limit (500 chars with visual indicator)</li>
            <li>Rate limiting ({maxMessagesPerMinute} messages per minute)</li>
            <li>Enter to send, Shift+Enter for new line</li>
            <li>Visual feedback for send states</li>
          </ul>
        </div>

        {/* Different variants */}
        <div className="space-y-6">
          {/* Default variant */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Default Chat Input</h2>
            <ChatInput
              onSendMessage={handleSendMessage}
              messageCount={messageCount}
              maxMessagesPerMinute={maxMessagesPerMinute}
              resetTime={resetTime}
              users={sampleUsers}
            />
          </div>

          {/* Without emoji picker */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Without Emoji Picker</h2>
            <ChatInput
              onSendMessage={handleSendMessage}
              messageCount={messageCount}
              maxMessagesPerMinute={maxMessagesPerMinute}
              resetTime={resetTime}
              users={sampleUsers}
              showEmojiPicker={false}
            />
          </div>

          {/* With image upload placeholder */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">With Image Upload (Future Feature)</h2>
            <ChatInput
              onSendMessage={handleSendMessage}
              messageCount={messageCount}
              maxMessagesPerMinute={maxMessagesPerMinute}
              resetTime={resetTime}
              users={sampleUsers}
              showImageUpload={true}
            />
          </div>

          {/* Disabled state */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Disabled State</h2>
            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={true}
              placeholder="Chat is disabled"
              users={sampleUsers}
            />
          </div>

          {/* Custom placeholder and character limit */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Custom Settings</h2>
            <ChatInput
              onSendMessage={handleSendMessage}
              messageCount={messageCount}
              maxMessagesPerMinute={maxMessagesPerMinute}
              resetTime={resetTime}
              users={sampleUsers}
              placeholder="Share your thoughts..."
              maxLength={280}
            />
          </div>
        </div>

        {/* Message log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Message Log ({messages.length} messages sent)
          </h2>
          {messages.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No messages sent yet. Try sending a message!</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((msg, index) => (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-800 dark:text-gray-200 break-words flex-1">
                      {msg.text}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {msg.mentions && msg.mentions.length > 0 && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Mentions: {msg.mentions.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rate limit info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Rate Limit Info</h3>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            Messages sent this minute: {messageCount}/{maxMessagesPerMinute}
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-300">
            Reset in: {Math.ceil((resetTime - Date.now()) / 1000)} seconds
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInputDemo;