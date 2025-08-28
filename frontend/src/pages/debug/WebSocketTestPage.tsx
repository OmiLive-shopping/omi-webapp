import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';

type EventLogEntry = {
  timestamp: Date;
  event: string;
  data?: any;
  type: 'sent' | 'received' | 'system';
};

export default function WebSocketTestPage() {
  const session = useSession();
  const user = session.data?.user;
  const isAuthenticated = !!session.data;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [transportName, setTransportName] = useState<string | null>(null);

  const [streams, setStreams] = useState<Array<{ id: string; title?: string; isLive?: boolean; viewerCount?: number; user?: { name?: string } }>>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [joinedStreamId, setJoinedStreamId] = useState<string>('');
  const [streamMeta, setStreamMeta] = useState<{ title?: string; isLive?: boolean; viewerCount?: number; streamerName?: string } | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ user?: any; content: string }>>([]);
  const messagesRef = useRef<HTMLDivElement>(null);

  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const eventLogRef = useRef<HTMLDivElement>(null);

  const backendBaseUrl = useMemo(() => 'http://localhost:9000', []);

  const logEvent = (event: string, data?: any, type: EventLogEntry['type'] = 'system') => {
    setEventLog(prev => [...prev, { timestamp: new Date(), event, data, type }].slice(-200));
  };

  useEffect(() => {
    if (!eventLogRef.current) return;
    eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
  }, [eventLog]);

  useEffect(() => {
    // Fetch streams for selection (public route)
    axios
      .get(`${backendBaseUrl}/v1/streams`)
      .then(res => {
        const items = (res.data?.data || res.data?.streams || res.data || []) as Array<{
          id: string;
          title?: string;
          isLive?: boolean;
          viewerCount?: number;
          user?: { name?: string };
        }>;
        setStreams(items);
        // Hydrate meta if selection exists
        const found = items.find(s => s.id === selectedStreamId);
        if (found) {
          setStreamMeta({
            title: found.title,
            isLive: found.isLive,
            viewerCount: found.viewerCount,
            streamerName: found.user?.name,
          });
        }
      })
      .catch(err => {
        console.warn('Failed to load streams', err);
        setStreams([]);
      });
  }, [backendBaseUrl, selectedStreamId]);

  const connectSocket = (): Promise<Socket> => {
    return new Promise((resolve, reject) => {
      // If already connected, return immediately
      if (socketRef.current?.connected) {
        console.log('✅ DEBUG: Socket already connected');
        resolve(socketRef.current);
        return;
      }

      // If socket exists but not connected, wait for connection
      if (socketRef.current) {
        console.log('⏳ DEBUG: Socket exists, waiting for connection...');
        socketRef.current.once('connect', () => {
          console.log('✅ DEBUG: Existing socket connected');
          resolve(socketRef.current!);
        });
        socketRef.current.once('connect_error', (err) => {
          console.log('❌ DEBUG: Existing socket connection failed:', err);
          reject(err);
        });
        return;
      }

      // Create new socket
      console.log('🔌 DEBUG: Creating new socket connection...');
      const socket = io(backendBaseUrl, {
        withCredentials: true,
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.once('connect', () => {
        setIsConnected(true);
        setSocketId(socket.id || null);
        setConnectionError(null);
        // Detect current transport and upgrades (best effort)
        try {
          const sAny = socket as unknown as { io?: { engine?: { transport?: { name?: string }, on?: (evt: string, cb: (t: any) => void) => void } } };
          const currentTransport = sAny.io?.engine?.transport?.name;
          if (currentTransport) setTransportName(currentTransport);
          sAny.io?.engine?.on?.('upgrade', (transport: any) => {
            setTransportName(transport?.name || 'websocket');
          });
        } catch {}
        logEvent('connected', { socketId: socket.id }, 'system');
        console.log('✅ DEBUG: New socket connected successfully');
        resolve(socket);
      });

      socket.once('connect_error', (err) => {
        setConnectionError(err?.message || 'Connection error');
        logEvent('connect_error', { message: err?.message }, 'system');
        console.log('❌ DEBUG: New socket connection failed:', err);
        reject(err);
      });

      socket.on('disconnect', reason => {
        setIsConnected(false);
        setSocketId(null);
        setTransportName(null);
        logEvent('disconnected', { reason }, 'system');
      });

      // Stream join confirmation
      socket.on('stream:joined', data => {
        logEvent('stream:joined', data, 'received');
      });

      // Viewer events
      socket.on('stream:viewer:joined', data => {
        logEvent('stream:viewer:joined', data, 'received');
      });
      socket.on('stream:viewer:left', data => {
        logEvent('stream:viewer:left', data, 'received');
      });

      // Chat events
      socket.on('chat:message', (msg: any) => {
        setMessages(prev => [...prev, { user: msg?.user, content: msg?.content }].slice(-100));
        logEvent('chat:message', msg, 'received');
      });

      socket.on('chat:message:sent', (msg: any) => {
        logEvent('chat:message:sent', msg, 'received');
      });

      socket.on('chat:error', (err: any) => {
        logEvent('chat:error', err, 'system');
      });
    });
  };

  const disconnectSocket = () => {
    if (!socketRef.current) return;
    try {
      socketRef.current.disconnect();
    } finally {
      socketRef.current = null;
      setIsConnected(false);
      setSocketId(null);
      setJoinedStreamId('');
    }
  };

  // Connection lifecycle is automatic: connect after go-live or when joining a live stream.

  const handleJoinStream = async () => {
    console.log('🔍 DEBUG: handleJoinStream called with selectedStreamId:', selectedStreamId);
    console.log('🔍 DEBUG: streamMeta:', streamMeta);
    
    if (!selectedStreamId) {
      console.log('❌ DEBUG: No selectedStreamId, returning early');
      return;
    }
    if (!streamMeta?.isLive) {
      console.log('❌ DEBUG: Stream not live, blocking join');
      logEvent('join_blocked:not_live', { streamId: selectedStreamId }, 'system');
      return;
    }
    
    try {
      console.log('🔌 DEBUG: Ensuring socket connection...');
      const socket = await connectSocket();
      
      const payload = { streamId: selectedStreamId };
      console.log('📤 DEBUG: About to emit stream:join with payload:', payload);
      console.log('📤 DEBUG: Payload validation - streamId type:', typeof payload.streamId);
      console.log('📤 DEBUG: Payload validation - streamId value:', payload.streamId);
      
      socket.emit('stream:join', payload);
      setJoinedStreamId(selectedStreamId);
      logEvent('stream:join', { streamId: selectedStreamId }, 'sent');
    } catch (error) {
      console.error('❌ DEBUG: Failed to connect socket:', error);
      logEvent('connection_failed', { error: (error as Error).message }, 'system');
    }
  };

  const handleLeaveStream = () => {
    if (!joinedStreamId || !socketRef.current) return;
    socketRef.current.emit('stream:leave', { streamId: joinedStreamId });
    logEvent('stream:leave', { streamId: joinedStreamId }, 'sent');
    setJoinedStreamId('');
    disconnectSocket();
  };

  const handleSendChat = () => {
    if (!chatInput || !joinedStreamId || !socketRef.current) return;
    socketRef.current.emit('chat:send-message', {
      streamId: joinedStreamId,
      content: chatInput,
    });
    logEvent('chat:send-message', { streamId: joinedStreamId, content: chatInput }, 'sent');
    setChatInput('');
  };

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const renderContentWithMentions = (text: string) => {
    const parts = text.split(/(\@[A-Za-z0-9_]+)/g);
    return (
      <>
        {parts.map((part, idx) =>
          part.startsWith('@') ? (
            <span key={idx} className="text-blue-600 dark:text-blue-400 font-medium">
              {part}
            </span>
          ) : (
            <span key={idx}>{part}</span>
          ),
        )}
      </>
    );
  };

  const handleGoLive = async () => {
    if (!selectedStreamId) return;
    try {
      const res = await axios.post(
        `${backendBaseUrl}/v1/streams/${selectedStreamId}/go-live`,
        undefined,
        { withCredentials: true }
      );
      const minimal = {
        streamId: selectedStreamId,
        viewerCount: (res.data?.data?.viewerCount as number) ?? undefined,
        ok: true,
      };
      logEvent('rest:go-live:success', minimal, 'system');
      
      // Ensure socket connection and join
      try {
        console.log('🔌 DEBUG: Ensuring socket connection after go-live...');
        const socket = await connectSocket();
        
        const payload = { streamId: selectedStreamId };
        console.log('📤 DEBUG: (handleGoLive) About to emit stream:join with payload:', payload);
        console.log('📤 DEBUG: (handleGoLive) Payload validation - streamId type:', typeof payload.streamId);
        console.log('📤 DEBUG: (handleGoLive) Payload validation - streamId value:', payload.streamId);
        
        socket.emit('stream:join', payload);
        setJoinedStreamId(selectedStreamId);
        logEvent('stream:join', { streamId: selectedStreamId }, 'sent');
      } catch (socketError) {
        console.error('❌ DEBUG: Failed to connect socket after go-live:', socketError);
        logEvent('post_golive_connection_failed', { error: (socketError as Error).message }, 'system');
      }
      // Update meta
      const updated = streams.find(s => s.id === selectedStreamId);
      setStreamMeta({
        title: updated?.title,
        isLive: true,
        viewerCount: (res.data?.data?.viewerCount as number) ?? updated?.viewerCount,
        streamerName: updated?.user?.name,
      });
    } catch (error: any) {
      const status = error?.response?.status;
      logEvent('rest:go-live:error', { message: error?.message, status }, 'system');
    }
  };

  const handleEndStream = async () => {
    const targetId = joinedStreamId || selectedStreamId;
    if (!targetId) return;
    try {
      const res = await axios.post(
        `${backendBaseUrl}/v1/streams/${targetId}/end`,
        undefined,
        { withCredentials: true }
      );
      const minimal = { streamId: targetId, ok: true };
      logEvent('rest:end:success', minimal, 'system');
      if (socketRef.current && joinedStreamId) {
        socketRef.current.emit('stream:leave', { streamId: joinedStreamId });
        logEvent('stream:leave', { streamId: joinedStreamId }, 'sent');
      }
      setJoinedStreamId('');
      setStreamMeta(prev => ({ ...prev, isLive: false, viewerCount: 0 }));
      disconnectSocket();
    } catch (error: any) {
      const status = error?.response?.status;
      logEvent('rest:end:error', { message: error?.message, status }, 'system');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">WebSocket Test</h1>

        {/* Connection Status */}
        <Card className="mb-6 p-6">
          <div className="flex items-center justify-between mb-3">
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
          </div>
          {isAuthenticated && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Logged in as: <span className="font-medium">{user?.email}</span>
            </div>
          )}
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-700 dark:text-gray-300">
            <div>
              <span className="font-medium">Room:</span>{' '}
              {joinedStreamId ? (
                <span className="text-green-600 dark:text-green-400">{joinedStreamId}</span>
              ) : (
                <span className="text-gray-500">Not joined</span>
              )}
            </div>
            <div>
              <span className="font-medium">Stream:</span>{' '}
              {streamMeta?.title || selectedStreamId || '—'}
            </div>
            <div>
              <span className="font-medium">Live:</span>{' '}
              {streamMeta?.isLive ? 'Yes' : 'No'}
            </div>
            <div>
              <span className="font-medium">Transport:</span>{' '}
              {transportName || '—'}
            </div>
            <div>
              <span className="font-medium">Socket ID:</span>{' '}
              {socketId || '—'}
            </div>
            {connectionError && (
              <div className="md:col-span-2 lg:col-span-1 text-red-600 dark:text-red-400">
                <span className="font-medium">Error:</span> {connectionError}
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stream Selection & Join */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Stream Selection</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Select a stream</label>
                <select
                  value={selectedStreamId}
                  onChange={e => {
                    setSelectedStreamId(e.target.value);
                    const found = streams.find(s => s.id === e.target.value);
                    setStreamMeta({
                      title: found?.title,
                      isLive: found?.isLive,
                      viewerCount: found?.viewerCount,
                      streamerName: found?.user?.name,
                    });
                  }}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="">-- Choose stream --</option>
                  {streams.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title || s.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleJoinStream} disabled={!selectedStreamId || !streamMeta?.isLive}>
                  Join Stream
                </Button>
                <Button
                  onClick={handleLeaveStream}
                  disabled={!joinedStreamId}
                  variant="danger"
                >
                  Leave Stream
                </Button>
                <Button
                  onClick={handleGoLive}
                  disabled={!selectedStreamId || !!streamMeta?.isLive}
                  variant="secondary"
                >
                  Start (REST go-live)
                </Button>
                <Button
                  onClick={handleEndStream}
                  disabled={!selectedStreamId || !streamMeta?.isLive}
                  variant="danger"
                >
                  End (REST)
                </Button>
              </div>
              {joinedStreamId && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  Joined stream: {joinedStreamId}
                </div>
              )}
              {streamMeta && (
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Title: {streamMeta.title || '—'}</div>
                  <div>Live: {streamMeta.isLive ? 'Yes' : 'No'}</div>
                  <div>Viewer Count: {streamMeta.viewerCount ?? '—'}</div>
                  <div>Streamer: {streamMeta.streamerName || '—'}</div>
                </div>
              )}
            </div>
          </Card>

          {/* Chat Testing */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Chat
            </h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message"
                  disabled={!joinedStreamId}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                />
                <Button onClick={handleSendChat} disabled={!joinedStreamId || !chatInput}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div ref={messagesRef} className="border rounded-lg p-3 h-40 overflow-y-auto bg-white dark:bg-gray-800">
                {messages.length === 0 ? (
                  <div className="text-gray-400 text-sm">No messages yet</div>
                ) : (
                  messages.slice(-50).map((msg, idx) => (
                    <div key={idx} className="text-sm mb-1 flex items-start gap-2">
                      <span className="font-medium">{msg.user?.name || 'Unknown'}:</span>
                      <span>{renderContentWithMentions(msg.content)}</span>
                      <span className="ml-auto text-[10px] text-gray-500">{new Date().toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Event Log */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" /> Event Log
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
                          <span className="text-gray-500">{log.timestamp.toLocaleTimeString()}</span>
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
      </div>
    </div>
  );
}