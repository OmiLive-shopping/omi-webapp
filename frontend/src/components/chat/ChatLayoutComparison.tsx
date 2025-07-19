import React from 'react';
import MessageList from './MessageList';
import type { ChatMessage, ChatUser } from './MessageList';

// Comparison page to debug chat layout issues
export const ChatLayoutComparison: React.FC = () => {
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
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Chat Layout Comparison - Testing Message Separation
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Good Layout - With proper height */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              ✅ Good Layout (400px height)
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-96 overflow-hidden">
              <MessageList
                messages={messages}
                currentUser={currentUser}
                onDeleteMessage={(id) => console.log('Delete:', id)}
                className="h-full"
              />
            </div>
          </div>

          {/* Potentially Problematic - Constrained height */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              ❌ Constrained Layout (200px height)
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-48 overflow-hidden">
              <MessageList
                messages={messages}
                currentUser={currentUser}
                onDeleteMessage={(id) => console.log('Delete:', id)}
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* Full Chat Container */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            🔍 Flex Container Layout (Similar to Chat Demo)
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-96 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Chat Header</h3>
            </div>
            <MessageList
              messages={messages}
              currentUser={currentUser}
              onDeleteMessage={(id) => console.log('Delete:', id)}
              className="flex-1 min-h-0"
            />
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 text-sm">
                Chat Input Area
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Layout Debug Info:
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Messages with avatars have 90px height + 12px margin-top</li>
            <li>• Continuation messages have 60px height</li>
            <li>• The flex container needs min-h-0 to properly constrain height</li>
            <li>• Virtual scrolling adjusts based on available space</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChatLayoutComparison;