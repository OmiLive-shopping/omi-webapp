import React, { useState } from 'react';
import usePageTitle from '@/hooks/usePageTitle';
import { StreamerStudio } from '@/components/stream/StreamerStudio';
import { useNavigate } from 'react-router-dom';

const StudioPage: React.FC = () => {
  usePageTitle('Creator Studio');
  const navigate = useNavigate();
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Generate a unique stream key (in production this would come from the backend)
  const streamKey = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleStreamStart = () => {
    setIsStreaming(true);
    console.log('Stream started with key:', streamKey);
    // TODO: Notify backend that stream has started
    // TODO: Update stream status in database
  };

  const handleStreamEnd = () => {
    setIsStreaming(false);
    console.log('Stream ended');
    // TODO: Notify backend that stream has ended
    // TODO: Save stream recording/metrics
    
    // Optionally redirect to stream analytics page
    // navigate('/studio/analytics');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Creator Studio</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Go live and connect with your audience in real-time
          </p>
        </div>

        {/* Stream Status Bar */}
        {isStreaming && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                <span className="text-red-800 dark:text-red-200 font-semibold">You are currently live!</span>
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                Stream Key: <code className="bg-red-100 dark:bg-red-800/30 px-2 py-1 rounded">{streamKey.slice(0, 20)}...</code>
              </div>
            </div>
          </div>
        )}

        {/* Main Studio Component */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <StreamerStudio
            streamKey={streamKey}
            onStreamStart={handleStreamStart}
            onStreamEnd={handleStreamEnd}
          />
        </div>

        {/* Quick Tips */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">📹 Pro Tip</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Ensure good lighting and a stable internet connection for the best streaming quality.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">🎯 Engagement</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Interact with your viewers through chat to build a loyal community.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">💰 Monetization</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Feature products during your stream to maximize sales opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioPage;