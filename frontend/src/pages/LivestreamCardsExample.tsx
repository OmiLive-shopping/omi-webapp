import React from 'react';
import { LivestreamSection, sampleStreams } from '@/components/stream/LivestreamSection';

const LivestreamCardsExample: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LivestreamSection 
          title="Live and Upcoming Streams"
          streams={sampleStreams}
        />
      </div>
    </div>
  );
};

export default LivestreamCardsExample;