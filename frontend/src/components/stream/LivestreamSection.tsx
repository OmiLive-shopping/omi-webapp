import React from 'react';
import { LivestreamCard, LivestreamCardProps } from './LivestreamCard';

interface LivestreamSectionProps {
  title?: string;
  streams: LivestreamCardProps[];
  className?: string;
}

export const LivestreamSection: React.FC<LivestreamSectionProps> = ({
  title = "Live and Upcoming Streams",
  streams,
  className = ""
}) => {
  return (
    <section className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {streams.map((stream) => (
          <LivestreamCard key={stream.id} {...stream} />
        ))}
      </div>

      {streams.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No streams available at the moment
          </p>
        </div>
      )}
    </section>
  );
};

// Example usage with sample data
export const sampleStreams: LivestreamCardProps[] = [
  {
    id: '1',
    title: 'My Eco-Friendly Hair Care Faves this Spring',
    thumbnail: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&h=450&fit=crop',
    hostName: 'Maria Salvidar',
    hostAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    isLive: true,
    viewerCount: 1234,
    category: 'Beauty'
  },
  {
    id: '2',
    title: 'Summer Skincare Routine for Glowing Skin',
    thumbnail: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=450&fit=crop',
    hostName: 'Emma Chen',
    hostAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    isLive: false,
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    category: 'Skincare'
  },
  {
    id: '3',
    title: 'Natural Makeup Tutorial: No-Makeup Look',
    thumbnail: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&h=450&fit=crop',
    hostName: 'Sophie Anderson',
    isLive: true,
    viewerCount: 856,
    category: 'Makeup'
  },
  {
    id: '4',
    title: 'DIY Hair Masks with Kitchen Ingredients',
    thumbnail: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&h=450&fit=crop',
    hostName: 'Zara Williams',
    hostAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    isLive: false,
    scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    category: 'Hair Care'
  }
];

export default LivestreamSection;