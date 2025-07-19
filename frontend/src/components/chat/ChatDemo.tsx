import React, { useState, useEffect } from 'react';
import EnhancedChatContainer from './EnhancedChatContainer';
import type { ChatMessage, ChatUser } from './EnhancedChatContainer';

// Mock Socket.io-like event emitter
class MockSocket {
  private listeners: { [event: string]: ((data: any) => void)[] } = {};

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  off(event: string, callback: (data: any) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
}

const mockSocket = new MockSocket();

export const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [viewers, setViewers] = useState<ChatUser[]>([]);
  const [viewerCount, setViewerCount] = useState(142);

  // Current user (for demo)
  const currentUser: ChatUser = {
    id: 'current-user',
    username: 'DemoUser',
    role: 'moderator' // Change to 'viewer' to test regular user experience
  };

  // Initialize with some mock data
  useEffect(() => {
    // Mock viewers
    const mockViewers: ChatUser[] = [
      { id: '1', username: 'StreamerPro', role: 'streamer', isOnline: true },
      { id: '2', username: 'ModeratorMike', role: 'moderator', isOnline: true },
      { id: '3', username: 'ViewerVicky', role: 'viewer', isOnline: true },
      { id: '4', username: 'ChatterChris', role: 'viewer', isOnline: true },
      { id: '5', username: 'GamerGary', role: 'viewer', isOnline: true },
      { id: '6', username: 'TechTina', role: 'viewer', isOnline: false },
      { id: 'current-user', ...currentUser, isOnline: true }
    ];
    setViewers(mockViewers);

    // Mock initial messages
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        user: mockViewers[0],
        content: 'Welcome everyone to the stream! 🎉',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        isPinned: true
      },
      {
        id: '2',
        user: mockViewers[2],
        content: 'Hey @StreamerPro! Excited for today\'s content!',
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        mentions: ['StreamerPro']
      },
      {
        id: '3',
        user: mockViewers[1],
        content: 'Remember to follow the chat rules everyone!',
        timestamp: new Date(Date.now() - 7 * 60 * 1000)
      },
      {
        id: '4',
        user: mockViewers[3],
        content: 'This is awesome! 🔥',
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        id: '5',
        user: mockViewers[4],
        content: '@ModeratorMike do we have any giveaways today?',
        timestamp: new Date(Date.now() - 3 * 60 * 1000),
        mentions: ['ModeratorMike']
      }
    ];
    setMessages(mockMessages);

    // Simulate new messages periodically
    const messageInterval = setInterval(() => {
      const randomViewer = mockViewers[Math.floor(Math.random() * mockViewers.length)];
      const randomMessages = [
        'Great stream! 👍',
        'Love the content!',
        'When is the next stream?',
        'First time here, this is cool!',
        'Can you explain that again?',
        'lol that was funny 😂',
        'Thanks for streaming!',
        'GG!',
        'This is so helpful!',
        'Keep it up! 💪'
      ];
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        user: randomViewer,
        content: randomMessages[Math.floor(Math.random() * randomMessages.length)],
        timestamp: new Date()
      };

      mockSocket.emit('new-message', newMessage);
    }, 5000);

    // Simulate viewer count changes
    const viewerInterval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 11) - 5);
    }, 10000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(viewerInterval);
    };
  }, []);

  // Listen for new messages
  useEffect(() => {
    const handleNewMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev, message]);
    };

    mockSocket.on('new-message', handleNewMessage);

    return () => {
      mockSocket.off('new-message', handleNewMessage);
    };
  }, []);

  // Handle sending message
  const handleSendMessage = (content: string, mentions?: string[]) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: currentUser,
      content,
      timestamp: new Date(),
      mentions
    };
    
    setMessages(prev => [...prev, newMessage]);
    mockSocket.emit('new-message', newMessage);
  };

  // Handle deleting message
  const handleDeleteMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isDeleted: true } : msg
    ));
  };

  // Handle banning user
  const handleBanUser = (userId: string) => {
    console.log('Banning user:', userId);
    // In real app, would call API and update user state
    alert(`User ${viewers.find(v => v.id === userId)?.username} has been banned`);
  };

  // Handle timeout user
  const handleTimeoutUser = (userId: string, duration: number) => {
    console.log('Timing out user:', userId, 'for', duration, 'ms');
    // In real app, would call API and update user state
    alert(`User ${viewers.find(v => v.id === userId)?.username} has been timed out for ${duration / 60000} minutes`);
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="h-full">
          <EnhancedChatContainer
            streamId="demo-stream"
            viewerCount={viewerCount}
            messages={messages}
            viewers={viewers}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            onBanUser={handleBanUser}
            onTimeoutUser={handleTimeoutUser}
            showViewerList={true}
            maxMessagesPerMinute={10}
          />
        </div>
      </div>
      
      <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Demo Chat - Try typing @ to mention users, use emojis, and test moderator actions!</p>
        <p>Current role: <strong>{currentUser.role}</strong></p>
      </div>
    </div>
  );
};

export default ChatDemo;