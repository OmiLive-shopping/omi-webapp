import React, { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const SocketDebug: React.FC = () => {
  const [message, setMessage] = useState('');
  const {
    isConnected,
    connectionError,
    messages,
    viewerCount,
    streamStatus,
    sendMessage,
    clearMessages,
  } = useSocket({ streamId: 'test-stream' });

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Socket.io Debug Panel</h2>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Connection Status:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {connectionError && (
              <div className="text-red-600 text-sm">
                Error: {connectionError}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <span className="font-medium">Viewer Count:</span>
              <span>{viewerCount}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="font-medium">Stream Status:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                streamStatus.isLive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {streamStatus.isLive ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Send Test Message</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConnected}
              />
              <Button onClick={handleSendMessage} disabled={!isConnected}>
                Send
              </Button>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Messages</h3>
              <Button variant="outline" size="sm" onClick={clearMessages}>
                Clear
              </Button>
            </div>
            <div className="border rounded-lg p-4 h-64 overflow-y-auto bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-gray-500 text-center">No messages yet</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-2 bg-white rounded shadow-sm">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{msg.username}</span>
                        <span className="text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};