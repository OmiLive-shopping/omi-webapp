import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { ViewerPlayer } from '@/components/stream/ViewerPlayer';
import EnhancedChatContainer from '@/components/chat/EnhancedChatContainer';
import ProductCard from '@/components/products/ProductCard';
import { useStreams, useStream } from '@/hooks/queries/useStreamQueries';
import { Loader2, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';
import { StreamSimulator } from '@/components/test/StreamSimulator';
import { io, Socket } from 'socket.io-client';

type ViewingMode = 'regular' | 'theatre' | 'fullwidth';

const LiveStreamsPage = () => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [viewingMode, setViewingMode] = useState<ViewingMode>('regular');
  
  // Fetch all streams from backend (not just live ones)
  const { data: streams = [], isLoading, error } = useStreams('all');
  const { data: selectedStream } = useStream(selectedStreamId);
  
  // Setup WebSocket connection
  useEffect(() => {
    const newSocket = io('http://localhost:9000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Join stream room and listen for chat messages
  useEffect(() => {
    if (selectedStreamId && socket) {
      // Join the stream room
      socket.emit('stream:join', { streamId: selectedStreamId });
      console.log('Joined stream room:', selectedStreamId);

      // Listen for chat messages
      const handleChatMessage = (message: any) => {
        console.log('Received chat message:', message);
        setMessages(prev => [...prev, {
          id: message.id,
          user: {
            id: message.userId,
            username: message.username,
            role: message.role || 'viewer'
          },
          content: message.content,
          timestamp: new Date(message.timestamp)
        }]);
      };

      // Listen for viewer updates
      const handleViewerUpdate = (data: any) => {
        console.log('Viewer count updated:', data.viewerCount);
        // Update viewer count if needed
      };

      socket.on('chat:message', handleChatMessage);
      socket.on('stream:viewers:update', handleViewerUpdate);
      
      // Also listen for test messages
      socket.on('test:chat:message', handleChatMessage);

      // Initialize with some viewers
      const mockViewers = [
        { id: 'current-user', username: 'You', role: 'viewer', isOnline: true },
        { id: 'streamer', username: 'Streamer', role: 'streamer', isOnline: true }
      ];
      setViewers(mockViewers);

      // Clear messages when switching streams
      setMessages([]);

      return () => {
        socket.emit('stream:leave', { streamId: selectedStreamId });
        socket.off('chat:message', handleChatMessage);
        socket.off('stream:viewers:update', handleViewerUpdate);
        socket.off('test:chat:message', handleChatMessage);
      };
    }
  }, [selectedStreamId, socket]);

  // Handle sending message
  const handleSendMessage = (content: string, mentions?: string[]) => {
    if (socket && selectedStreamId) {
      const messageData = {
        streamId: selectedStreamId,
        content,
        mentions
      };
      
      // Emit to backend
      socket.emit('chat:send-message', messageData);
      
      // Add message locally (the server will echo it back)
      const newMessage = {
        id: Date.now().toString(),
        user: viewers.find(v => v.id === 'current-user'),
        content,
        timestamp: new Date(),
        mentions
      };
      setMessages(prev => [...prev, newMessage]);
    }
  };
  
  // Mock products data
  const mockProducts = [
    {
      id: '1',
      name: 'Pantene Gold Series: Moisture Boost Conditioner',
      price: 12.99,
      currency: 'USD',
      image: 'https://via.placeholder.com/200x200?text=Pantene+Gold',
      description: 'Professional hair care for moisture and shine',
      stock: 15
    },
    {
      id: '2',
      name: 'Gold Series: Moisture Boost Conditioner',
      price: 14.99,
      currency: 'USD',
      image: 'https://via.placeholder.com/200x200?text=Gold+Series',
      description: 'Intensive moisture for dry and damaged hair',
      stock: 8
    },
    {
      id: '3',
      name: 'White Tea Shampoo and Conditioner',
      price: 18.99,
      currency: 'USD',
      image: 'https://via.placeholder.com/200x200?text=White+Tea',
      description: 'Gentle cleansing with white tea extract',
      stock: 12
    },
    {
      id: '4',
      name: 'The Ordinary Shampoo and Conditioner',
      price: 16.99,
      currency: 'USD',
      image: 'https://via.placeholder.com/200x200?text=The+Ordinary',
      description: 'Clean, simple ingredients for everyday use',
      stock: 20
    },
    {
      id: '5',
      name: 'Westin Hotels Signature Collection',
      price: 24.99,
      currency: 'USD',
      image: 'https://via.placeholder.com/200x200?text=Westin',
      description: 'Luxury hotel-quality hair care',
      stock: 6
    },
    {
      id: '6',
      name: 'Professional Hair Mask Treatment',
      price: 22.99,
      currency: 'USD',
      image: 'https://via.placeholder.com/200x200?text=Hair+Mask',
      description: 'Deep conditioning treatment for all hair types',
      stock: 10
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Stream Simulator only shows when viewing a live stream */}
      {process.env.NODE_ENV === 'development' && selectedStreamId && <StreamSimulator />}
      
      <div className="max-w-full mx-auto px-2 py-2">
        <div className="flex items-center justify-between mb-8">
          {/* Development buttons */}
          {process.env.NODE_ENV === 'development' && !selectedStreamId && (
            <div className="flex items-center gap-2">
              {/* Direct dev mode button */}
              <button
                onClick={() => {
                  // Just directly go to the first stream for development
                  if (streams.length > 0) {
                    setSelectedStreamId(streams[0].id);
                  }
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <span className="text-lg">🚀</span>
                Dev Mode (Skip to Stream)
              </button>

              {/* Original simulation button */}
              <button
                onClick={async () => {
                  try {
                    // Check if any stream is live
                    const isAnyStreamLive = streams.some((stream: any) => stream.isLive);
                    
                    if (isAnyStreamLive) {
                      // Reset all streams
                      const response = await fetch('http://localhost:9000/v1/streams/test/reset-all', {
                        method: 'POST'
                      });
                      if (response.ok) {
                        window.location.reload();
                      }
                    } else {
                      // Start simulation
                      const response = await fetch('http://localhost:9000/v1/streams/test/simulate/start', {
                        method: 'POST'
                      });
                      if (response.ok) {
                        window.location.reload();
                      }
                    }
                  } catch (error) {
                    console.error('Failed to toggle simulation:', error);
                  }
                }}
                className={clsx(
                  "px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2",
                  streams.some((stream: any) => stream.isLive) 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-green-600 hover:bg-green-700"
                )}
              >
                {streams.some((stream: any) => stream.isLive) ? (
                  <>
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                    Reset All Streams
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    Make Stream Live
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading streams...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400">Failed to load streams</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Please try again later</p>
          </div>
        ) : selectedStreamId ? (
          <div className={clsx(
            "transition-all duration-300 ease-in-out",
            viewingMode === 'regular' && "max-w-7xl mx-auto",
            viewingMode === 'theatre' && "max-w-full",
            viewingMode === 'fullwidth' && "max-w-full"
          )}>
            {/* Viewing Mode Controls */}
            <div className="flex items-center justify-between mb-2 px-2">
              <button
                onClick={() => setSelectedStreamId(null)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to streams
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewingMode('regular')}
                  className={clsx(
                    "px-3 py-1.5 text-sm rounded-md transition-colors",
                    viewingMode === 'regular'
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  )}
                >
                  Regular
                </button>
                <button
                  onClick={() => setViewingMode('theatre')}
                  className={clsx(
                    "px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1",
                    viewingMode === 'theatre'
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  )}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Theatre
                </button>
                <button
                  onClick={() => setViewingMode('fullwidth')}
                  className={clsx(
                    "px-3 py-1.5 text-sm rounded-md transition-colors",
                    viewingMode === 'fullwidth'
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  )}
                >
                  Full Width
                </button>
              </div>
            </div>

            {/* Main content area - Video and Chat */}
            <div className={clsx(
              "transition-all duration-300",
              viewingMode === 'regular' && "h-[calc(100vh-12rem)]",
              viewingMode === 'theatre' && "h-[calc(100vh-10rem)]",
              viewingMode === 'fullwidth' && "h-[calc(100vh-10rem)]"
            )}>
              <div className={clsx(
                "grid gap-1 h-full transition-all duration-300",
                viewingMode === 'regular' && "grid-cols-1 lg:grid-cols-4",
                viewingMode === 'theatre' && "grid-cols-1 lg:grid-cols-5",
                viewingMode === 'fullwidth' && "grid-cols-1"
              )}>
                {/* Video Player */}
                <div className={clsx(
                  "h-full transition-all duration-300",
                  viewingMode === 'regular' && "lg:col-span-3",
                  viewingMode === 'theatre' && "lg:col-span-4",
                  viewingMode === 'fullwidth' && "lg:col-span-1"
                )}>
                  <ViewerPlayer 
                    streamId={selectedStreamId}
                    viewerCount={selectedStream?.viewerCount || 0}
                    isLive={selectedStream?.isLive || false}
                    streamTitle={selectedStream?.title}
                    streamerName={selectedStream?.streamer?.username || 'Unknown'}
                  />
                </div>

                {/* Chat Section - Hidden in fullwidth mode */}
                {viewingMode !== 'fullwidth' && (
                  <div className={clsx(
                    "h-full transition-all duration-300",
                    viewingMode === 'regular' && "lg:col-span-1",
                    viewingMode === 'theatre' && "lg:col-span-1"
                  )}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full flex flex-col">
                      <EnhancedChatContainer
                        streamId={selectedStreamId}
                        viewerCount={selectedStream?.viewerCount || 0}
                        messages={messages}
                        viewers={viewers}
                        currentUser={viewers.find(v => v.id === 'current-user')}
                        onSendMessage={handleSendMessage}
                        showViewerList={false}
                        maxMessagesPerMinute={10}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Products Section - Only show in regular mode */}
            {viewingMode === 'regular' && (
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Featured Products
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {mockProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => console.log('Add to cart:', product.name)}
                      onQuickView={() => console.log('Quick view:', product.name)}
                      isInWishlist={false}
                      onToggleWishlist={() => console.log('Toggle wishlist:', product.name)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : streams.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Streams Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no streams scheduled at the moment. Check back later!
            </p>
          </div>
        ) : (
          /* Stream Selection Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {streams.map((stream: any) => (
              <div
                key={stream.id}
                onClick={() => stream.isLive && setSelectedStreamId(stream.id)}
                className={clsx(
                  'bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden',
                  'transition-all duration-200',
                  stream.isLive ? [
                    'hover:shadow-xl transform hover:-translate-y-1 cursor-pointer',
                    'ring-2 ring-transparent hover:ring-primary-500'
                  ] : [
                    'opacity-75 cursor-not-allowed',
                    'hover:opacity-90'
                  ]
                )}
              >
                <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      {stream.isLive ? (
                        <>
                          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <p className="text-sm">Click to watch</p>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-300">Stream Offline</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    {stream.isLive ? (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded animate-pulse">
                        LIVE
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-700 text-gray-200 text-xs rounded">
                        OFFLINE
                      </span>
                    )}
                  </div>
                  {stream.isLive && (
                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                        {stream.viewerCount} viewers
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                    {stream.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {stream.streamer?.username || 'Unknown Streamer'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded">
                      {stream.category || 'General'}
                    </span>
                    {!stream.isLive && stream.startedAt && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Last live: {new Date(stream.startedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStreamsPage;