import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@/lib/auth-client';
import { useSocketStore } from '@/stores/socket-store';
import { useChatStore } from '@/stores/chat-store';
import { useVdoStreamStore } from '@/stores/vdo-stream-store';
import { socketManager } from '@/lib/socket';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { 
  Send, 
  Wifi, 
  WifiOff, 
  Users, 
  MessageSquare, 
  Radio,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  UserPlus,
  UserMinus,
  Bell
} from 'lucide-react';

export default function WebSocketTestPage() {
  const session = useSession();
  const user = session.data?.user;
  const isAuthenticated = !!session.data;
  const { 
    isConnected, 
    connectionError: socketError,
    connect,
    disconnect,
    sendMessage,
    joinStream,
    leaveStream,
    messages
  } = useSocketStore();
  
  const chatStore = useChatStore();
  
  const { 
    currentStream,
    viewerCount,
    isStreaming
  } = useVdoStreamStore();

  // Local state for testing
  // Using a valid UUID for testing (backend requires UUID format)
  const [testRoomId, setTestRoomId] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [eventLog, setEventLog] = useState<Array<{
    timestamp: Date;
    event: string;
    data?: any;
    type: 'sent' | 'received' | 'system';
  }>>([]);
  const [customEvent, setCustomEvent] = useState('');
  const [customData, setCustomData] = useState('');
  const [streamTestId, setStreamTestId] = useState('550e8400-e29b-41d4-a716-446655440001');
  const [simulatedViewers, setSimulatedViewers] = useState(0);
  
  const eventLogRef = useRef<HTMLDivElement>(null);
  const socket = socketManager.getSocket();

  // Log events
  const logEvent = (event: string, data?: any, type: 'sent' | 'received' | 'system' = 'system') => {
    setEventLog(prev => [...prev, {
      timestamp: new Date(),
      event,
      data,
      type
    }].slice(-50)); // Keep last 50 events
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Chat events
    const handleMessage = (data: any) => {
      logEvent('chat:message', data, 'received');
    };

    const handleUserJoined = (data: any) => {
      logEvent('chat:user_joined', data, 'received');
    };

    const handleUserLeft = (data: any) => {
      logEvent('chat:user_left', data, 'received');
    };

    const handleRoomInfo = (data: any) => {
      logEvent('chat:room_info', data, 'received');
    };

    // Stream events
    const handleStreamStarted = (data: any) => {
      logEvent('stream:started', data, 'received');
    };

    const handleStreamEnded = (data: any) => {
      logEvent('stream:ended', data, 'received');
    };

    const handleViewerUpdate = (data: any) => {
      logEvent('stream:viewer_update', data, 'received');
    };

    const handleStreamStats = (data: any) => {
      logEvent('stream:stats', data, 'received');
    };

    // VDO events
    const handleVdoStats = (data: any) => {
      logEvent('vdo:stats', data, 'received');
    };

    const handleVdoCommand = (data: any) => {
      logEvent('vdo:command_result', data, 'received');
    };

    // System events
    const handleError = (error: any) => {
      logEvent('error', error, 'system');
    };

    const handleConnect = () => {
      logEvent('connected', { socketId: socket.id }, 'system');
    };

    const handleDisconnect = (reason: string) => {
      logEvent('disconnected', { reason }, 'system');
    };

    const handleReconnect = () => {
      logEvent('reconnected', null, 'system');
    };

    // Test events
    const handleTestEchoReply = (data: any) => {
      logEvent('test:echo:reply', data, 'received');
    };

    const handleTestBroadcastMessage = (data: any) => {
      logEvent('test:broadcast:message', data, 'received');
    };

    const handleTestJoined = (data: any) => {
      logEvent('test:joined', data, 'received');
    };

    const handleTestLeft = (data: any) => {
      logEvent('test:left', data, 'received');
    };

    const handleTestUserJoined = (data: any) => {
      logEvent('test:user-joined', data, 'received');
    };

    const handleTestUserLeft = (data: any) => {
      logEvent('test:user-left', data, 'received');
    };

    // Register all listeners
    socket.on('chat:message', handleMessage);
    socket.on('chat:user_joined', handleUserJoined);
    socket.on('chat:user_left', handleUserLeft);
    socket.on('chat:room_info', handleRoomInfo);
    socket.on('stream:started', handleStreamStarted);
    socket.on('stream:ended', handleStreamEnded);
    socket.on('stream:viewer_update', handleViewerUpdate);
    socket.on('stream:stats', handleStreamStats);
    socket.on('vdo:stats', handleVdoStats);
    socket.on('vdo:command_result', handleVdoCommand);
    socket.on('error', handleError);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);
    
    // Test events
    socket.on('test:echo:reply', handleTestEchoReply);
    socket.on('test:broadcast:message', handleTestBroadcastMessage);
    socket.on('test:joined', handleTestJoined);
    socket.on('test:left', handleTestLeft);
    socket.on('test:user-joined', handleTestUserJoined);
    socket.on('test:user-left', handleTestUserLeft);

    // Cleanup
    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:user_joined', handleUserJoined);
      socket.off('chat:user_left', handleUserLeft);
      socket.off('chat:room_info', handleRoomInfo);
      socket.off('stream:started', handleStreamStarted);
      socket.off('stream:ended', handleStreamEnded);
      socket.off('stream:viewer_update', handleViewerUpdate);
      socket.off('stream:stats', handleStreamStats);
      socket.off('vdo:stats', handleVdoStats);
      socket.off('vdo:command_result', handleVdoCommand);
      socket.off('error', handleError);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
      // Test events
      socket.off('test:echo:reply', handleTestEchoReply);
      socket.off('test:broadcast:message', handleTestBroadcastMessage);
      socket.off('test:joined', handleTestJoined);
      socket.off('test:left', handleTestLeft);
      socket.off('test:user-joined', handleTestUserJoined);
      socket.off('test:user-left', handleTestUserLeft);
    };
  }, [socket]);

  // Auto-scroll event log
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [eventLog]);

  // Connection handlers
  const handleConnect = () => {
    if (isConnected) {
      disconnect();
      logEvent('manual_disconnect', null, 'sent');
    } else {
      connect();
      logEvent('manual_connect', null, 'sent');
    }
  };

  // Room handlers (using stream events since that's what backend expects)
  const handleJoinRoom = () => {
    if (testRoomId && socket) {
      socket.emit('stream:join', { streamId: testRoomId });
      setCurrentRoom(testRoomId);
      logEvent('stream:join', { streamId: testRoomId }, 'sent');
    }
  };

  const handleLeaveRoom = () => {
    if (currentRoom && socket) {
      socket.emit('stream:leave', { streamId: currentRoom });
      logEvent('stream:leave', { streamId: currentRoom }, 'sent');
      setCurrentRoom(null);
    }
  };

  // Message handler
  const handleSendMessage = () => {
    if (testMessage && currentRoom && socket) {
      // Backend expects 'chat:send-message' with streamId and content
      socket.emit('chat:send-message', { 
        streamId: currentRoom,
        content: testMessage 
      });
      logEvent('chat:send-message', { 
        streamId: currentRoom,
        content: testMessage 
      }, 'sent');
      setTestMessage('');
    }
  };

  // Custom event handler
  const handleSendCustomEvent = () => {
    if (customEvent && socket) {
      try {
        const data = customData ? JSON.parse(customData) : {};
        socket.emit(customEvent, data);
        logEvent(customEvent, data, 'sent');
        setCustomEvent('');
        setCustomData('');
      } catch (error) {
        logEvent('error', { message: 'Invalid JSON data' }, 'system');
      }
    }
  };

  // Stream simulation handlers
  const handleStartStream = () => {
    if (socket && streamTestId) {
      socket.emit('stream:start', { 
        streamId: streamTestId,
        title: 'Test Stream',
        vdoRoomId: `vdo-${streamTestId}`
      });
      logEvent('stream:start', { streamId: streamTestId }, 'sent');
    }
  };

  const handleEndStream = () => {
    if (socket && streamTestId) {
      socket.emit('stream:end', { streamId: streamTestId });
      logEvent('stream:end', { streamId: streamTestId }, 'sent');
    }
  };

  const handleSimulateViewers = () => {
    if (socket && streamTestId) {
      const newCount = simulatedViewers + 1;
      setSimulatedViewers(newCount);
      socket.emit('stream:viewer_join', { streamId: streamTestId });
      logEvent('stream:viewer_join', { streamId: streamTestId, count: newCount }, 'sent');
    }
  };

  const handleRemoveViewer = () => {
    if (socket && streamTestId && simulatedViewers > 0) {
      const newCount = simulatedViewers - 1;
      setSimulatedViewers(newCount);
      socket.emit('stream:viewer_leave', { streamId: streamTestId });
      logEvent('stream:viewer_leave', { streamId: streamTestId, count: newCount }, 'sent');
    }
  };

  // VDO command test
  const handleVdoCommand = (command: string) => {
    if (socket) {
      socket.emit('vdo:command', {
        streamId: streamTestId,
        command,
        data: {}
      });
      logEvent('vdo:command', { command }, 'sent');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          WebSocket Test Dashboard
        </h1>

        {/* Connection Status */}
        <Card className="mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">Disconnected</span>
                </>
              )}
            </h2>
            <Button onClick={handleConnect} variant={isConnected ? 'danger' : 'primary'}>
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
          
          {isAuthenticated && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Logged in as: <span className="font-medium">{user?.email}</span>
            </div>
          )}
          
          {socketError && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              Error: {socketError}
            </div>
          )}
          
          {socket && (
            <div className="mt-2 text-xs text-gray-500">
              Socket ID: {socket.id}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Testing */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chat Testing
            </h2>
            
            <div className="space-y-4">
              {/* Room Management */}
              <div>
                <label className="block text-sm font-medium mb-2">Room ID</label>
                <div className="flex gap-2">
                  <Input
                    value={testRoomId}
                    onChange={(e) => setTestRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    disabled={!isConnected}
                  />
                  <Button 
                    onClick={currentRoom ? handleLeaveRoom : handleJoinRoom}
                    disabled={!isConnected}
                    variant={currentRoom ? 'danger' : 'primary'}
                  >
                    {currentRoom ? 'Leave' : 'Join'}
                  </Button>
                </div>
                {currentRoom && (
                  <div className="mt-1 text-sm text-green-600 dark:text-green-400">
                    Current room: {currentRoom}
                  </div>
                )}
              </div>

              {/* Send Message */}
              <div>
                <label className="block text-sm font-medium mb-2">Send Message</label>
                <div className="flex gap-2">
                  <Input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Type a message"
                    disabled={!currentRoom}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!currentRoom || !testMessage}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Display */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Recent Messages ({messages.length})
                </label>
                <div className="border rounded-lg p-3 h-40 overflow-y-auto bg-white dark:bg-gray-800">
                  {messages.length === 0 ? (
                    <div className="text-gray-400 text-sm">No messages yet</div>
                  ) : (
                    messages.slice(-10).map((msg, idx) => (
                      <div key={idx} className="text-sm mb-1">
                        <span className="font-medium">{msg.user?.name || 'Unknown'}:</span>{' '}
                        {msg.content}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Stream Testing */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5" />
              Stream Testing
            </h2>
            
            <div className="space-y-4">
              {/* Stream ID */}
              <div>
                <label className="block text-sm font-medium mb-2">Stream ID</label>
                <Input
                  value={streamTestId}
                  onChange={(e) => setStreamTestId(e.target.value)}
                  placeholder="Enter stream ID"
                  disabled={!isConnected}
                />
              </div>

              {/* Stream Controls */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleStartStream}
                  disabled={!isConnected || isStreaming}
                  variant="primary"
                >
                  Start Stream
                </Button>
                <Button 
                  onClick={handleEndStream}
                  disabled={!isConnected || !isStreaming}
                  variant="danger"
                >
                  End Stream
                </Button>
              </div>

              {/* Viewer Simulation */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Simulate Viewers ({simulatedViewers})
                </label>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSimulateViewers}
                    disabled={!isConnected}
                    size="sm"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Viewer
                  </Button>
                  <Button 
                    onClick={handleRemoveViewer}
                    disabled={!isConnected || simulatedViewers === 0}
                    size="sm"
                    variant="danger"
                  >
                    <UserMinus className="w-4 h-4 mr-1" />
                    Remove Viewer
                  </Button>
                </div>
              </div>

              {/* VDO Commands */}
              <div>
                <label className="block text-sm font-medium mb-2">VDO Commands</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={() => handleVdoCommand('muteAudio')}
                    disabled={!isConnected}
                    size="sm"
                    variant="secondary"
                  >
                    Mute Audio
                  </Button>
                  <Button 
                    onClick={() => handleVdoCommand('hideVideo')}
                    disabled={!isConnected}
                    size="sm"
                    variant="secondary"
                  >
                    Hide Video
                  </Button>
                  <Button 
                    onClick={() => handleVdoCommand('startRecording')}
                    disabled={!isConnected}
                    size="sm"
                    variant="secondary"
                  >
                    Start Recording
                  </Button>
                  <Button 
                    onClick={() => handleVdoCommand('getStats')}
                    disabled={!isConnected}
                    size="sm"
                    variant="secondary"
                  >
                    Get Stats
                  </Button>
                </div>
              </div>

              {/* Stream Status */}
              <div className="border rounded-lg p-3 bg-white dark:bg-gray-800">
                <div className="text-sm space-y-1">
                  <div>Stream Active: {isStreaming ? 'Yes' : 'No'}</div>
                  <div>Viewer Count: {viewerCount}</div>
                  {currentStream && (
                    <>
                      <div>Stream ID: {currentStream.id}</div>
                      <div>Title: {currentStream.title}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Custom Events */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Custom Events
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Event Name</label>
                <Input
                  value={customEvent}
                  onChange={(e) => setCustomEvent(e.target.value)}
                  placeholder="e.g., custom:test"
                  disabled={!isConnected}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Event Data (JSON)</label>
                <textarea
                  value={customData}
                  onChange={(e) => setCustomData(e.target.value)}
                  placeholder='{"key": "value"}'
                  disabled={!isConnected}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleSendCustomEvent}
                disabled={!isConnected || !customEvent}
                variant="primary"
              >
                Send Custom Event
              </Button>
            </div>
          </Card>

          {/* Event Log */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Event Log
            </h2>
            
            <div 
              ref={eventLogRef}
              className="border rounded-lg p-3 h-96 overflow-y-auto bg-white dark:bg-gray-800 font-mono text-xs"
            >
              {eventLog.length === 0 ? (
                <div className="text-gray-400">No events yet</div>
              ) : (
                eventLog.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={`mb-2 p-2 rounded ${
                      log.type === 'sent' 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : log.type === 'received'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div>
                        {log.type === 'sent' ? (
                          <AlertCircle className="w-3 h-3 text-blue-500 mt-0.5" />
                        ) : log.type === 'received' ? (
                          <CheckCircle className="w-3 h-3 text-green-500 mt-0.5" />
                        ) : (
                          <Clock className="w-3 h-3 text-gray-500 mt-0.5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{log.event}</span>
                          <span className="text-gray-500">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {log.data && (
                          <pre className="mt-1 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Simple Test Section */}
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Simple Test (No Auth Required)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">1. Test Echo (Single Client)</h3>
              <Button
                onClick={() => {
                  if (socket) {
                    socket.emit('test:echo', { message: 'Hello from echo test!' });
                    logEvent('test:echo', { message: 'Hello from echo test!' }, 'sent');
                  }
                }}
                disabled={!isConnected}
                variant="primary"
              >
                Send Echo Test
              </Button>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Sends a message that echoes back to you only
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">2. Test Room (Multi-Client)</h3>
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    if (socket) {
                      socket.emit('test:join-room', { room: 'test123' });
                      logEvent('test:join-room', { room: 'test123' }, 'sent');
                    }
                  }}
                  disabled={!isConnected}
                  variant="primary"
                  size="sm"
                >
                  Join Test Room
                </Button>
                <Button
                  onClick={() => {
                    if (socket) {
                      socket.emit('test:broadcast', { 
                        room: 'test123',
                        message: `Hello from ${socket.id?.substring(0, 6)}!` 
                      });
                      logEvent('test:broadcast', { room: 'test123', message: 'Hello!' }, 'sent');
                    }
                  }}
                  disabled={!isConnected}
                  variant="secondary"
                  size="sm"
                >
                  Broadcast to Room
                </Button>
                <Button
                  onClick={() => {
                    if (socket) {
                      socket.emit('test:leave-room', { room: 'test123' });
                      logEvent('test:leave-room', { room: 'test123' }, 'sent');
                    }
                  }}
                  disabled={!isConnected}
                  variant="danger"
                  size="sm"
                >
                  Leave Test Room
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Join room 'test123' in multiple tabs, then broadcast
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <strong>How to test multi-client:</strong>
            <ol className="list-decimal ml-5 mt-1 text-sm">
              <li>Open this page in 2+ browser tabs</li>
              <li>Click "Connect" in each tab</li>
              <li>Click "Join Test Room" in each tab</li>
              <li>Click "Broadcast to Room" in any tab</li>
              <li>Message appears in ALL tabs!</li>
            </ol>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Multi-User Testing Instructions
          </h2>
          
          <div className="prose dark:prose-invert max-w-none text-sm">
            <ol className="space-y-2">
              <li>
                <strong>Open multiple browser tabs/windows:</strong> Navigate to this same URL 
                (<code>/websocket-test</code>) in multiple tabs or different browsers.
              </li>
              <li>
                <strong>Login with different accounts:</strong> You can create test accounts or use 
                existing ones. Each tab can have a different user.
              </li>
              <li>
                <strong>Test real-time features:</strong>
                <ul className="ml-4 mt-1">
                  <li>Join the same room ID (UUID) in multiple tabs to test chat</li>
                  <li>Send messages and watch them appear in all connected clients</li>
                  <li>Start a stream in one tab and join as viewer in others</li>
                  <li>Add/remove viewers and watch the count update everywhere</li>
                </ul>
              </li>
              <li>
                <strong>Monitor the Event Log:</strong> Each tab shows its own event log so you can 
                see what events are being sent and received in real-time.
              </li>
              <li>
                <strong>Test edge cases:</strong>
                <ul className="ml-4 mt-1">
                  <li>Disconnect and reconnect to test recovery</li>
                  <li>Send rapid messages to test throttling</li>
                  <li>Join/leave rooms quickly to test cleanup</li>
                </ul>
              </li>
              <li>
                <strong>Share with others:</strong> Send this URL to teammates or friends to test 
                from different networks/devices: <code>{window.location.href}</code>
              </li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <strong>Pro Tip:</strong> Use Chrome DevTools Network tab to monitor WebSocket frames, 
              or install a WebSocket debugging extension for more detailed inspection.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}