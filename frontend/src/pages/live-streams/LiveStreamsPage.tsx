import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useStreams } from '@/hooks/queries/useStreamQueries';
import { Loader2 } from 'lucide-react';

// type ViewingMode = 'regular' | 'theatre' | 'fullwidth';

const LiveStreamsPage = () => {
  const navigate = useNavigate();
  
  // Fetch all streams from backend (not just live ones)
  const { data: streams = [], isLoading, error } = useStreams('all');
  
  

  return (
    <div className="h-full flex flex-col">
      
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 flex-shrink-0">
          {/* Development buttons */}
          {process.env.NODE_ENV === 'development' && (
            <div className="flex items-center gap-2">
              {/* Direct dev mode button */}
              <button
                onClick={() => {
                  // Navigate directly to the first stream for development
                  if (streams.length > 0) {
                    navigate(`/stream/${streams[0].id}`);
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
                onClick={() => stream.isLive && navigate(`/stream/${stream.id}`)}
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