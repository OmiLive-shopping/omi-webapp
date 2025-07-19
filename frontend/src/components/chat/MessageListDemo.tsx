import React, { useState, useCallback } from 'react';
import MessageList from './MessageList';
import type { ChatMessage, ChatUser } from './MessageList';

// Generate sample users
const sampleUsers: ChatUser[] = [
  { id: '1', username: 'StreamerGuy', role: 'streamer', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: '2', username: 'ModeratorAlice', role: 'moderator', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: '3', username: 'Viewer1', role: 'viewer', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', username: 'Viewer2', role: 'viewer', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: '5', username: 'Viewer3', role: 'viewer' },
  { id: '6', username: 'CurrentUser', role: 'viewer', avatar: 'https://i.pravatar.cc/150?img=6' },
];

// Sample messages for testing
const sampleMessageTexts = [
  'Hey everyone! Welcome to the stream!',
  'Thanks for the follow @StreamerGuy!',
  'This is awesome!',
  'Can you play some music?',
  '@ModeratorAlice is the chat working properly?',
  'Yes, everything looks good!',
  'Love this content!',
  'First time here, this is great!',
  'How long have you been streaming?',
  'About 2 years now!',
  'That\'s dedication!',
  'Keep up the good work!',
  'Anyone else lagging?',
  'Nope, stream is smooth for me',
  'Try refreshing the page',
  'That worked, thanks!',
  'No problem!',
  'What game are you playing next?',
  'Probably some indie games',
  'Cool, I love indie games!',
];

// Generate a large number of messages for testing virtual scrolling
const generateMessages = (count: number): ChatMessage[] => {
  const messages: ChatMessage[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const userIndex = Math.floor(Math.random() * sampleUsers.length);
    const user = sampleUsers[userIndex];
    const messageIndex = i % sampleMessageTexts.length;
    const messageText = sampleMessageTexts[messageIndex];
    
    messages.push({
      id: `msg-${i}`,
      user,
      content: messageText,
      timestamp: new Date(now.getTime() - (count - i) * 1000), // Messages 1 second apart
      isHighlighted: Math.random() < 0.1, // 10% chance of being highlighted
      isPinned: i === 0, // Pin the first message
      mentions: messageText.includes('@') ? [messageText.match(/@(\w+)/)?.[1] || ''] : undefined,
    });
  }
  
  return messages;
};

export const MessageListDemo: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => generateMessages(1000));
  const [messageCount, setMessageCount] = useState(1000);
  const currentUser = sampleUsers[5]; // CurrentUser

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isDeleted: true } : msg
    ));
    console.log('Delete message:', messageId);
  }, []);

  const handleReportMessage = useCallback((messageId: string) => {
    console.log('Report message:', messageId);
    alert(`Message ${messageId} reported!`);
  }, []);

  const handleTimeoutUser = useCallback((userId: string, duration: number) => {
    console.log('Timeout user:', userId, 'for', duration, 'ms');
    alert(`User ${userId} timed out for ${duration / 1000} seconds!`);
  }, []);

  const handleBanUser = useCallback((userId: string) => {
    console.log('Ban user:', userId);
    alert(`User ${userId} banned!`);
  }, []);

  const handleGenerateMessages = (count: number) => {
    setMessageCount(count);
    setMessages(generateMessages(count));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Controls */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Message List Demo</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Message Count:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerateMessages(100)}
              className={`px-3 py-1 rounded ${messageCount === 100 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              100
            </button>
            <button
              onClick={() => handleGenerateMessages(500)}
              className={`px-3 py-1 rounded ${messageCount === 500 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              500
            </button>
            <button
              onClick={() => handleGenerateMessages(1000)}
              className={`px-3 py-1 rounded ${messageCount === 1000 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              1,000
            </button>
            <button
              onClick={() => handleGenerateMessages(5000)}
              className={`px-3 py-1 rounded ${messageCount === 5000 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              5,000
            </button>
            <button
              onClick={() => handleGenerateMessages(10000)}
              className={`px-3 py-1 rounded ${messageCount === 10000 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              10,000
            </button>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            (Testing virtual scrolling performance)
          </span>
        </div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Current user: {currentUser.username} | Try hovering over messages to see actions
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 bg-white dark:bg-gray-900">
        <MessageList
          messages={messages}
          currentUser={currentUser}
          onDeleteMessage={handleDeleteMessage}
          onReportMessage={handleReportMessage}
          onTimeoutUser={handleTimeoutUser}
          onBanUser={handleBanUser}
        />
      </div>
    </div>
  );
};

export default MessageListDemo;