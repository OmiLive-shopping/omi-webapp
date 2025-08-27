import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { ViewerPlayer } from '@/components/stream/ViewerPlayer';
import EnhancedChatContainer from '@/components/chat/EnhancedChatContainer';
import { useStreams, useStream } from '@/hooks/queries/useStreamQueries';
import { Loader2 } from 'lucide-react';
import { socketManager } from '@/lib/socket';
import { useSocketStore } from '@/stores/socket-store';

// type ViewingMode = 'regular' | 'theatre' | 'fullwidth';

const LiveStreamsPage = () => {
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  // const [viewingMode, setViewingMode] = useState<ViewingMode>('regular');
  
  // Fetch all streams from backend (not just live ones)
  const { data: streams = [], isLoading, error } = useStreams('all');
  const { data: selectedStream } = useStream(selectedStreamId);
  
  // Get socket store methods, but don't connect globally
  const { connect, disconnect, isConnected } = useSocketStore();

  // Handle socket connection and stream room joining
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    
    if (selectedStreamId) {
      // Connect to socket if not already connected
      if (!isConnected) {
        console.log('Connecting to socket for stream:', selectedStreamId);
        connect();
      }
      
      // Function to join room and set up listeners
      const joinRoom = () => {
        if (socketManager.isConnected()) {
          // Join the stream room
          socketManager.emit('stream:join', { streamId: selectedStreamId });
          console.log('Joined stream room:', selectedStreamId);

          // Listen for chat messages
          const handleChatMessage = (message: any) => {
            console.log('Received chat message:', message);
            setMessages(prev => [...prev, {
              id: message.id,
              user: {
                id: message.userId,
                username: message.username || 'Anonymous',
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

          // Set up event listeners using type-safe events
          socketManager.on('chat:message', handleChatMessage);
          socketManager.on('chat:message:sent', handleChatMessage);
          socketManager.on('stream:viewers:update', handleViewerUpdate);
          socketManager.on('test:chat:message', handleChatMessage);

          // Initialize with some viewers
          const mockViewers = [
            { id: 'current-user', username: 'You', role: 'viewer', isOnline: true },
            { id: 'streamer', username: 'Streamer', role: 'streamer', isOnline: true }
          ];
          setViewers(mockViewers);

          // Clear messages when switching streams
          setMessages([]);

          // Set up cleanup function
          cleanup = () => {
            socketManager.emit('stream:leave', { streamId: selectedStreamId });
            socketManager.off('chat:message', handleChatMessage);
            socketManager.off('chat:message:sent', handleChatMessage);
            socketManager.off('stream:viewers:update', handleViewerUpdate);
            socketManager.off('test:chat:message', handleChatMessage);
          };
        }
      };

      // If already connected, join immediately
      if (isConnected && socketManager.isConnected()) {
        joinRoom();
      } else {
        // Wait for connection with a small delay
        const timer = setTimeout(joinRoom, 100);
        cleanup = () => clearTimeout(timer);
      }
    } else {
      // No stream selected - disconnect socket to save resources
      if (isConnected) {
        console.log('No stream selected, disconnecting socket');
        disconnect();
      }
    }

    // Return cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [selectedStreamId, isConnected, connect, disconnect]);

  // Handle sending message
  const handleSendMessage = (content: string, mentions?: string[]) => {
    if (selectedStreamId && isConnected) {
      const messageData = {
        streamId: selectedStreamId,
        content,
        mentions
      };
      
      // Emit to backend with correct event name
      socketManager.emit('chat:send-message', messageData);
      // Don't add message locally - wait for server echo
    } else if (!isConnected) {
      console.error('Socket not connected, cannot send message');
    }
  };
  
  // Mock products data (commented out for now)
  /* const mockProducts = [
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
  ]; */

  return (
    <div className="h-full flex flex-col">
      
      <div className="flex-1 flex flex-col">
        {!selectedStreamId && (
          <div className="flex items-center justify-between p-4 flex-shrink-0">
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
        )}

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
          /* Main content area - Video and Chat - Takes full remaining height */
          <div className="flex-1 flex gap-0 min-h-0 bg-black">
            {/* Video Container - takes remaining space */}
            <div className="flex-1 flex items-center justify-center bg-black min-h-0">
              {/* Video Player - fills container while maintaining aspect ratio */}
              <div className="w-full h-full">
                <ViewerPlayer 
                  streamId={selectedStreamId}
                  viewerCount={selectedStream?.viewerCount || 0}
                  isLive={selectedStream?.isLive || false}
                  streamTitle={selectedStream?.title}
                  streamerName={selectedStream?.streamer?.username || 'Unknown'}
                />
              </div>
            </div>

            {/* Chat Section - Fixed width, full height */}
            <div className="w-[340px] h-full bg-white dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 flex flex-col min-h-0">
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
          <div className="overflow-y-auto flex-1 p-4">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStreamsPage;