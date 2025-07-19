import React from 'react';
import MessageList from './MessageList';
import MessageListV2 from './MessageListV2';
import type { ChatMessage, ChatUser } from './MessageListV2';

// Direct comparison of MessageList vs MessageListV2
export const MessageListComparison: React.FC = () => {
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
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      isPinned: true
    },
    {
      id: '2',
      user: { id: 'viewer1', username: 'ViewerVicky', role: 'viewer' },
      content: 'Hey @StreamerGuy! Excited to be here!',
      timestamp: new Date(Date.now() - 9 * 60 * 1000),
      mentions: ['StreamerGuy']
    },
    {
      id: '3',
      user: { id: 'viewer1', username: 'ViewerVicky', role: 'viewer' },
      content: 'This stream is awesome! Can\'t wait to see what\'s next',
      timestamp: new Date(Date.now() - 8 * 60 * 1000)
    },
    {
      id: '4',
      user: { id: 'mod', username: 'ModeratorMike', role: 'moderator' },
      content: 'Remember to follow the chat rules everyone!',
      timestamp: new Date(Date.now() - 7 * 60 * 1000)
    },
    {
      id: '5',
      user: { id: 'viewer2', username: 'ChatterChris', role: 'viewer' },
      content: 'Just joined! What did I miss?',
      timestamp: new Date(Date.now() - 6 * 60 * 1000)
    },
    {
      id: '6',
      user: { id: 'streamer', username: 'StreamerGuy', role: 'streamer' },
      content: 'Thanks for joining @ChatterChris! We\'re just getting started with the main event',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      mentions: ['ChatterChris']
    },
    {
      id: '7',
      user: { id: 'viewer3', username: 'GamerGary', role: 'viewer' },
      content: 'This is so cool!',
      timestamp: new Date(Date.now() - 4 * 60 * 1000)
    },
    {
      id: '8',
      user: { id: 'viewer3', username: 'GamerGary', role: 'viewer' },
      content: 'Love the energy in here',
      timestamp: new Date(Date.now() - 3 * 60 * 1000)
    },
    {
      id: '9',
      user: { id: 'current', username: 'TestUser', role: 'viewer' },
      content: 'Hey everyone! Happy to be here!',
      timestamp: new Date(Date.now() - 2 * 60 * 1000)
    },
    {
      id: '10',
      user: { id: 'mod', username: 'ModeratorMike', role: 'moderator' },
      content: 'Welcome @TestUser!',
      timestamp: new Date(Date.now() - 1 * 60 * 1000),
      mentions: ['TestUser']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            MessageList Comparison
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Side-by-side comparison to debug message spacing issues
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Original MessageList */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Original MessageList (Potential Spacing Issues)
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-[600px] flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <span className="text-sm font-medium">Chat Header</span>
              </div>
              <MessageList
                messages={messages}
                currentUser={currentUser}
                onDeleteMessage={(id) => console.log('Delete:', id)}
                onReportMessage={(id) => console.log('Report:', id)}
                className="flex-1 min-h-0"
              />
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <span className="text-sm">Input area placeholder</span>
              </div>
            </div>
          </div>

          {/* New MessageListV2 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              ✅ MessageListV2 (Fixed Spacing)
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-[600px] flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <span className="text-sm font-medium">Chat Header</span>
              </div>
              <MessageListV2
                messages={messages}
                currentUser={currentUser}
                onDeleteMessage={(id) => console.log('Delete:', id)}
                onReportMessage={(id) => console.log('Report:', id)}
                className="flex-1 min-h-0"
              />
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <span className="text-sm">Input area placeholder</span>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            Key Differences in V2:
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>Proper spacing calculation in virtualizer estimateSize</li>
            <li>Spacing is included in the virtual item height calculation</li>
            <li>16px spacing between messages from different users</li>
            <li>Header height (30px) properly accounted for</li>
            <li>Base message height of 60px for consistent sizing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MessageListComparison;