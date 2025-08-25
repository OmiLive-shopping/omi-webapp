import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const WebSocketTest = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [streamId, setStreamId] = useState('test-stream-123');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (log: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${log}`]);
  };

  // Connect to WebSocket
  const connectSocket = () => {
    addLog('Attempting to connect to WebSocket...');
    const newSocket = io('http://localhost:9000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      addLog(`Connected! Socket ID: ${newSocket.id}`);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      addLog('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('error', (error: any) => {
      addLog(`Error: ${error.message || error}`);
    });

    newSocket.on('chat:message', (msg: any) => {
      addLog(`Received message: ${JSON.stringify(msg)}`);
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('chat:message:sent', (msg: any) => {
      addLog(`Message sent confirmation: ${JSON.stringify(msg)}`);
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('stream:joined', (data: any) => {
      addLog(`Joined stream: ${JSON.stringify(data)}`);
    });

    setSocket(newSocket);
  };

  // Join a stream room
  const joinStream = () => {
    if (socket && isConnected) {
      addLog(`Joining stream: ${streamId}`);
      socket.emit('stream:join', { streamId });
    } else {
      addLog('Socket not connected!');
    }
  };

  // Send a chat message
  const sendMessage = () => {
    if (socket && isConnected && message.trim()) {
      const messageData = {
        streamId,
        content: message
      };
      addLog(`Sending message: ${JSON.stringify(messageData)}`);
      socket.emit('chat:send-message', messageData);
      setMessage('');
    } else {
      addLog('Cannot send message - check connection and message');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">WebSocket Chat Debug Tool</h1>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="font-semibold">
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {socket && <p className="text-sm text-gray-600">Socket ID: {socket.id}</p>}
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={connectSocket}
            disabled={isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Connect to WebSocket
          </button>
          <button
            onClick={() => {
              if (socket) {
                socket.close();
                setSocket(null);
                addLog('Disconnected manually');
              }
            }}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={streamId}
            onChange={(e) => setStreamId(e.target.value)}
            placeholder="Stream ID"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={joinStream}
            disabled={!isConnected}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
          >
            Join Stream
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !message.trim()}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Send Message
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Messages</h2>
        <div className="h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-3">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet...</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="mb-2 p-2 bg-white dark:bg-gray-800 rounded">
                <div className="font-semibold">{msg.username || 'Unknown'}</div>
                <div>{msg.content || msg.message}</div>
                <div className="text-xs text-gray-500">{msg.timestamp}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Debug Logs */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Debug Logs</h2>
        <div className="h-64 overflow-y-auto bg-black text-green-400 rounded p-3 font-mono text-sm">
          {logs.length === 0 ? (
            <p>No logs yet...</p>
          ) : (
            logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketTest;