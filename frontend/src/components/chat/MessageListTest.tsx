import React from 'react';
import MessageList from './MessageList';
import type { ChatMessage, ChatUser } from './MessageList';

// Test page to verify message separation fix
export const MessageListTest: React.FC = () => {
  const currentUser: ChatUser = { 
    id: 'current', 
    username: 'TestUser', 
    role: 'viewer' 
  };

  const messages: ChatMessage[] = [
    {
      id: '1',
      user: { id: 'streamer', username: 'StreamerGuy', role: 'streamer' },
      content: 'Welcome everyone to the stream! 🎉',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      isPinned: true
    },
    {
      id: '2',
      user: { id: 'viewer1', username: 'ViewerVicky', role: 'viewer' },
      content: 'Hey @StreamerGuy! Excited to be here!',
      timestamp: new Date(Date.now() - 4 * 60 * 1000),
      mentions: ['StreamerGuy']
    },
    {
      id: '3',
      user: { id: 'viewer1', username: 'ViewerVicky', role: 'viewer' },
      content: 'This stream is awesome!',
      timestamp: new Date(Date.now() - 3 * 60 * 1000)
    },
    {
      id: '4',
      user: { id: 'mod', username: 'ModeratorMike', role: 'moderator' },
      content: 'Remember to follow the chat rules everyone!',
      timestamp: new Date(Date.now() - 2 * 60 * 1000)
    },
    {
      id: '5',
      user: { id: 'streamer', username: 'StreamerGuy', role: 'streamer' },
      content: 'Thanks for joining! Let\'s get started',
      timestamp: new Date(Date.now() - 1 * 60 * 1000)
    },
    {
      id: '6',
      user: { id: 'current', username: 'TestUser', role: 'viewer' },
      content: 'This is my message - should be highlighted',
      timestamp: new Date(Date.now() - 30 * 1000)
    }
  ];

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Message List Test - Separation Fix
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing that messages from different users are properly separated with spacing.
            The streamer message (with badge) should not clash with ViewerVicky's message.
          </p>
        </div>
        
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <MessageList
            messages={messages}
            currentUser={currentUser}
            onDeleteMessage={(id) => console.log('Delete:', id)}
            onReportMessage={(id) => console.log('Report:', id)}
            onTimeoutUser={(userId, duration) => console.log('Timeout:', userId, duration)}
            onBanUser={(userId) => console.log('Ban:', userId)}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageListTest;