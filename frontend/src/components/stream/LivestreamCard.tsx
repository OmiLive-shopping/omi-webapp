import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export interface LivestreamCardProps {
  id: string;
  title: string;
  thumbnail: string;
  hostName: string;
  hostAvatar?: string;
  isLive?: boolean;
  scheduledTime?: Date;
  viewerCount?: number;
  category?: string;
  className?: string;
}

export const LivestreamCard: React.FC<LivestreamCardProps> = ({
  id,
  title,
  thumbnail,
  hostName,
  hostAvatar,
  isLive = false,
  scheduledTime,
  viewerCount,
  category,
  className
}) => {
  const formatScheduledTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `In ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `In ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  };

  const formatViewerCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <Link
      to={`/stream/${id}`}
      className={clsx(
        'block group hover:opacity-95 transition-opacity',
        className
      )}
    >
      <div className="bg-mint-100 dark:bg-mint-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-3 pb-0">
        {/* Thumbnail Container */}
        <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-700 overflow-hidden rounded-lg">
          <img 
            src={thumbnail} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-lg"
            loading="lazy"
          />
          
          {/* Live Badge or Scheduled Time */}
          {isLive ? (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span className="text-sm font-semibold uppercase tracking-wide">LIVE</span>
            </div>
          ) : scheduledTime ? (
            <div className="absolute top-3 left-3 bg-gray-800/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium">{formatScheduledTime(scheduledTime)}</span>
            </div>
          ) : null}

          {/* Viewer Count (for live streams) */}
          {isLive && viewerCount !== undefined && (
            <div className="absolute bottom-3 left-3 bg-gray-800/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium">{formatViewerCount(viewerCount)} watching</span>
            </div>
          )}

          {/* Category Badge */}
          {category && (
            <div className="absolute bottom-3 right-3 bg-gray-800/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium">{category}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-3 pb-3 pt-3">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {title}
          </h3>

          {/* Host Info */}
          <div className="flex items-center gap-2">
            {/* Host Avatar */}
            <div className="flex-shrink-0">
              {hostAvatar ? (
                <img 
                  src={hostAvatar} 
                  alt={hostName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {hostName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Host Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {hostName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default LivestreamCard;