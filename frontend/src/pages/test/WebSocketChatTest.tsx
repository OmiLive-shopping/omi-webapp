import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSession } from '@/lib/auth-client';

const WebSocketChatTest = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [streamId, setStreamId] = useState('92a0c870-8bc6-4f3f-b834-bf634333146a');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isInRoom, setIsInRoom] = useState(false);
  const [socketId, setSocketId] = useState<string>('');
  
  // Create separate instances to test chat syncing
  const [socket2, setSocket2] = useState<Socket | null>(null);
  const [isConnected2, setIsConnected2] = useState(false);
  const [socketId2, setSocketId2] = useState<string>('');
  const [messages2, setMessages2] = useState<any[]>([]);

  const addLog = (log: string, instance = 1) => {
    const prefix = instance === 1 ? '[Socket 1]' : '[Socket 2]';
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} ${prefix}: ${log}`]);
  };

  // Connect first socket
  const connectSocket1 = async () => {
    addLog('Attempting to connect Socket 1...');
    
    try {
      const session = await getSession();
      const newSocket = io('http://localhost:9000', {
        transports: ['websocket'],
        reconnection: true,
        auth: {
          token: (session as any)?.session?.id || (session as any)?.data?.session?.id
        }
      });

      newSocket.on('connect', () => {
        addLog(`Connected! ID: ${newSocket.id}`);
        setIsConnected(true);
        setSocketId(newSocket.id || '');
      });

      newSocket.on('disconnect', () => {
        addLog('Disconnected');
        setIsConnected(false);
        setIsInRoom(false);
      });

      newSocket.on('chat:message', (msg: any) => {
        addLog(`Received message: ${msg.content}`);
        setMessages(prev => [...prev, msg]);
      });

      newSocket.on('chat:message:sent', (msg: any) => {
        addLog(`Message sent confirmation: ${msg.content}`);
        setMessages(prev => [...prev, msg]);
      });

      newSocket.on('stream:joined', (data: any) => {
        addLog(`Joined stream: ${data.streamId}`);
        setIsInRoom(true);
      });

      newSocket.on('error', (error: any) => {
        addLog(`Error: ${error.message || JSON.stringify(error)}`);
      });

      setSocket(newSocket);
    } catch (error) {
      addLog(`Failed to connect: ${error}`);
    }
  };

  // Connect second socket (anonymous)
  const connectSocket2 = () => {
    addLog('Attempting to connect Socket 2 (anonymous)...', 2);
    
    const newSocket = io('http://localhost:9000', {
      transports: ['websocket'],
      reconnection: true
    });

    newSocket.on('connect', () => {
      addLog(`Connected! ID: ${newSocket.id}`, 2);
      setIsConnected2(true);
      setSocketId2(newSocket.id || '');
    });

    newSocket.on('disconnect', () => {
      addLog('Disconnected', 2);
      setIsConnected2(false);
    });

    newSocket.on('chat:message', (msg: any) => {
      addLog(`Received message: ${msg.content}`, 2);
      setMessages2(prev => [...prev, msg]);
    });

    newSocket.on('chat:message:sent', (msg: any) => {
      addLog(`Message sent confirmation: ${msg.content}`, 2);
      setMessages2(prev => [...prev, msg]);
    });

    newSocket.on('stream:joined', (data: any) => {
      addLog(`Joined stream: ${data.streamId}`, 2);
    });

    newSocket.on('error', (error: any) => {
      addLog(`Error: ${error.message || JSON.stringify(error)}`, 2);
    });

    setSocket2(newSocket);
  };

  // Join stream room
  const joinStream = (socketInstance: 1 | 2) => {
    const sock = socketInstance === 1 ? socket : socket2;
    if (sock && (socketInstance === 1 ? isConnected : isConnected2)) {
      addLog(`Joining stream: ${streamId}`, socketInstance);
      sock.emit('stream:join', { streamId });
    } else {
      addLog('Socket not connected!', socketInstance);
    }
  };

  // Send message
  const sendMessage = (socketInstance: 1 | 2) => {
    const sock = socketInstance === 1 ? socket : socket2;
    if (sock && message.trim()) {
      const messageData = {
        streamId,
        content: `[Socket ${socketInstance}] ${message}`
      };
      addLog(`Sending: ${message}`, socketInstance);
      sock.emit('chat:send-message', messageData);
      setMessage('');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socket?.close();
      socket2?.close();
    };
  }, [socket, socket2]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">WebSocket Chat Test - Dual Client</h1>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Socket 1 Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-blue-600">Socket 1 (Authenticated)</h2>
          
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-semibold">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {isInRoom && <span className="text-sm text-green-600">(In Room)</span>}
            </div>
            {socketId && <p className="text-xs text-gray-500">ID: {socketId}</p>}
          </div>

          <div className="space-y-2 mb-4">
            <button
              onClick={connectSocket1}
              disabled={isConnected}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Connect Socket 1
            </button>
            <button
              onClick={() => joinStream(1)}
              disabled={!isConnected || isInRoom}
              className="w-full px-3 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Join Stream Room
            </button>
          </div>

          {/* Messages for Socket 1 */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Messages Received:</h3>
            <div className="h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-2 text-sm">
              {messages.length === 0 ? (
                <p className="text-gray-500">No messages yet...</p>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="mb-2 p-2 bg-white dark:bg-gray-800 rounded">
                    <div className="font-semibold text-xs text-blue-600">{msg.username}</div>
                    <div>{msg.content}</div>
                    <div className="text-xs text-gray-400">{msg.timestamp}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Socket 2 Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-purple-600">Socket 2 (Anonymous)</h2>
          
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${isConnected2 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-semibold">
                {isConnected2 ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {socketId2 && <p className="text-xs text-gray-500">ID: {socketId2}</p>}
          </div>

          <div className="space-y-2 mb-4">
            <button
              onClick={connectSocket2}
              disabled={isConnected2}
              className="w-full px-3 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
            >
              Connect Socket 2
            </button>
            <button
              onClick={() => joinStream(2)}
              disabled={!isConnected2}
              className="w-full px-3 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Join Stream Room
            </button>
          </div>

          {/* Messages for Socket 2 */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Messages Received:</h3>
            <div className="h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-2 text-sm">
              {messages2.length === 0 ? (
                <p className="text-gray-500">No messages yet...</p>
              ) : (
                messages2.map((msg, idx) => (
                  <div key={idx} className="mb-2 p-2 bg-white dark:bg-gray-800 rounded">
                    <div className="font-semibold text-xs text-purple-600">{msg.username}</div>
                    <div>{msg.content}</div>
                    <div className="text-xs text-gray-400">{msg.timestamp}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shared Message Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h3 className="font-semibold mb-3">Send Message</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={streamId}
            onChange={(e) => setStreamId(e.target.value)}
            placeholder="Stream ID"
            className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (isConnected ? sendMessage(1) : null)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            onClick={() => sendMessage(1)}
            disabled={!isConnected || !message.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Send via S1
          </button>
          <button
            onClick={() => sendMessage(2)}
            disabled={!isConnected2 || !message.trim()}
            className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
          >
            Send via S2
          </button>
        </div>
      </div>

      {/* Debug Logs */}
      <div className="bg-black rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-green-400 font-mono font-semibold">Debug Console</h3>
          <button
            onClick={() => setLogs([])}
            className="text-red-400 text-sm hover:text-red-300"
          >
            Clear
          </button>
        </div>
        <div className="h-64 overflow-y-auto text-green-400 font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketChatTest;