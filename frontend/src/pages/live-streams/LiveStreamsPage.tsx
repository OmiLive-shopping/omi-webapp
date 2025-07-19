import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { ViewerPlayer } from '@/components/stream/ViewerPlayer';
import EnhancedChatContainer from '@/components/chat/EnhancedChatContainer';
import ViewerCount from '@/components/stream/ViewerCount';

interface Stream {
  id: string;
  title: string;
  streamerName: string;
  thumbnailUrl?: string;
  viewerCount: number;
  category: string;
  isLive: boolean;
}

const LiveStreamsPage = () => {
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  
  // Initialize mock chat data when a stream is selected
  useEffect(() => {
    if (selectedStream) {
      // Mock viewers
      const mockViewers = [
        { id: '1', username: 'StreamerPro', role: 'streamer', isOnline: true },
        { id: '2', username: 'ModeratorMike', role: 'moderator', isOnline: true },
        { id: '3', username: 'ViewerVicky', role: 'viewer', isOnline: true },
        { id: '4', username: 'ChatterChris', role: 'viewer', isOnline: true },
        { id: '5', username: 'GamerGary', role: 'viewer', isOnline: true },
        { id: 'current-user', username: 'You', role: 'viewer', isOnline: true }
      ];
      setViewers(mockViewers);

      // Mock initial messages
      const mockMessages = [
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
          content: 'Hey! Excited for today\'s content!',
          timestamp: new Date(Date.now() - 8 * 60 * 1000)
        },
        {
          id: '3',
          user: mockViewers[3],
          content: 'This is awesome! 🔥',
          timestamp: new Date(Date.now() - 5 * 60 * 1000)
        }
      ];
      setMessages(mockMessages);
    }
  }, [selectedStream]);

  // Handle sending message
  const handleSendMessage = (content: string, mentions?: string[]) => {
    const newMessage = {
      id: Date.now().toString(),
      user: viewers.find(v => v.id === 'current-user'),
      content,
      timestamp: new Date(),
      mentions
    };
    setMessages(prev => [...prev, newMessage]);
  };
  
  // Mock data for demonstration - replace with real API call
  const streams: Stream[] = [
    {
      id: 'stream1',
      title: 'Live Coding Session - Building React Apps',
      streamerName: 'CodeMaster',
      viewerCount: 125,
      category: 'Programming',
      isLive: true,
    },
    {
      id: 'stream2',
      title: 'Game Development with Unity',
      streamerName: 'GameDev Pro',
      viewerCount: 89,
      category: 'Game Development',
      isLive: true,
    },
    {
      id: 'stream3',
      title: 'UI/UX Design Workshop',
      streamerName: 'DesignGuru',
      viewerCount: 67,
      category: 'Design',
      isLive: true,
    },
    {
      id: 'stream4',
      title: 'Machine Learning Basics',
      streamerName: 'AI Expert',
      viewerCount: 234,
      category: 'Data Science',
      isLive: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Live Streams
        </h1>

        {selectedStream ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedStream(null)}
              className="mb-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              ← Back to all streams
            </button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Video Player Section */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    {streams.find(s => s.id === selectedStream)?.title}
                  </h2>
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <ViewerPlayer 
                      streamKey={selectedStream}
                      viewerCount={streams.find(s => s.id === selectedStream)?.viewerCount || 0}
                      isLive={streams.find(s => s.id === selectedStream)?.isLive || false}
                      streamTitle={streams.find(s => s.id === selectedStream)?.title}
                      streamerName={streams.find(s => s.id === selectedStream)?.streamerName}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-gray-700 dark:text-gray-300">
                        Streamer: {streams.find(s => s.id === selectedStream)?.streamerName}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <ViewerCount
                        count={streams.find(s => s.id === selectedStream)?.viewerCount || 0}
                        variant="expanded"
                        showTrend={true}
                        showAnimation={true}
                      />
                      <span className="px-3 py-1 bg-red-500 text-white text-sm rounded-full">
                        LIVE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Section */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-[600px] flex flex-col">
                  <EnhancedChatContainer
                    streamId={selectedStream}
                    viewerCount={streams.find(s => s.id === selectedStream)?.viewerCount || 0}
                    messages={messages}
                    viewers={viewers}
                    currentUser={viewers.find(v => v.id === 'current-user')}
                    onSendMessage={handleSendMessage}
                    showViewerList={false}
                    maxMessagesPerMinute={10}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {streams.map((stream) => (
              <div
                key={stream.id}
                onClick={() => setSelectedStream(stream.id)}
                className={clsx(
                  'bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden',
                  'hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200',
                  'cursor-pointer'
                )}
              >
                <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <p className="text-sm">Click to watch</p>
                    </div>
                  </div>
                  {stream.isLive && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">
                        LIVE
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2">
                    <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                      {stream.viewerCount} viewers
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                    {stream.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {stream.streamerName}
                  </p>
                  <span className="inline-block px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded">
                    {stream.category}
                  </span>
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