import React, { useState } from 'react';
import ChatInput from './ChatInput';

const ChatInputDebug: React.FC = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [resetTime, setResetTime] = useState(Date.now() + 60000);

  const handleSendMessage = (content: string, mentions?: string[]) => {
    console.log('Message sent:', content, 'Mentions:', mentions);
    setMessages(prev => [...prev, content]);
    setMessageCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ChatInput Debug
        </h1>

        {/* Test 1: ChatInput in a container similar to chat */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Test 1: In Chat-like Container (600px height)
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Chat Header</h3>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-2">
                {messages.map((msg, idx) => (
                  <div key={idx} className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
                    {msg}
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-gray-500">No messages yet...</p>
                )}
              </div>
            </div>
            
            {/* Input Area */}
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <ChatInput
                onSendMessage={handleSendMessage}
                maxLength={500}
                placeholder="Type a message..."
                disabled={false}
                messageCount={messageCount}
                maxMessagesPerMinute={10}
                resetTime={resetTime}
                users={[
                  { id: '1', username: 'TestUser1' },
                  { id: '2', username: 'TestUser2' },
                ]}
                showEmojiPicker={true}
                showImageUpload={false}
              />
            </div>
          </div>
        </div>

        {/* Test 2: ChatInput standalone */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Test 2: Standalone ChatInput
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <ChatInput
              onSendMessage={handleSendMessage}
              maxLength={500}
              placeholder="Type a message..."
              disabled={false}
              messageCount={messageCount}
              maxMessagesPerMinute={10}
              resetTime={resetTime}
              users={[
                { id: '1', username: 'TestUser1' },
                { id: '2', username: 'TestUser2' },
              ]}
              showEmojiPicker={true}
              showImageUpload={false}
            />
          </div>
        </div>

        {/* Test 3: ChatInput with no wrapper padding */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Test 3: No Wrapper Padding
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <ChatInput
              onSendMessage={handleSendMessage}
              maxLength={500}
              placeholder="Type a message..."
              disabled={false}
              messageCount={messageCount}
              maxMessagesPerMinute={10}
              resetTime={resetTime}
              users={[
                { id: '1', username: 'TestUser1' },
                { id: '2', username: 'TestUser2' },
              ]}
              showEmojiPicker={true}
              showImageUpload={false}
            />
          </div>
        </div>

        {/* Debug info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Debug Info:
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>Messages sent: {messages.length}</li>
            <li>Message count (rate limit): {messageCount}</li>
            <li>Rate limit will reset in: {Math.ceil((resetTime - Date.now()) / 1000)}s</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChatInputDebug;