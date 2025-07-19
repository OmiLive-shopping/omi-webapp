import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import clsx from 'clsx';

export interface ViewerCountProps {
  count: number;
  showTrend?: boolean;
  showAnimation?: boolean;
  variant?: 'compact' | 'expanded' | 'detailed';
  className?: string;
  onCountChange?: (newCount: number, oldCount: number) => void;
}

interface ViewerStats {
  peak: number;
  average: number;
  duration: number;
}

export const ViewerCount: React.FC<ViewerCountProps> = ({
  count,
  showTrend = true,
  showAnimation = true,
  variant = 'compact',
  className,
  onCountChange
}) => {
  const [displayCount, setDisplayCount] = useState(count);
  const [previousCount, setPreviousCount] = useState(count);
  const [trend, setTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [isPulsing, setIsPulsing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Stats for detailed view
  const [stats, setStats] = useState<ViewerStats>({
    peak: count,
    average: count,
    duration: 0
  });

  const animationRef = useRef<number>();
  const countHistory = useRef<number[]>([count]);
  const startTime = useRef(Date.now());

  // Calculate trend based on count history
  const calculateTrend = useCallback((newCount: number, oldCount: number) => {
    if (newCount > oldCount) return 'up';
    if (newCount < oldCount) return 'down';
    return 'stable';
  }, []);

  // Animate number changes
  const animateCount = useCallback((start: number, end: number) => {
    if (!showAnimation) {
      setDisplayCount(end);
      return;
    }

    const duration = 500; // ms
    const startTime = Date.now();
    const difference = end - start;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.round(start + difference * easeOutQuart);
      
      setDisplayCount(currentCount);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    animate();
  }, [showAnimation]);

  // Update stats
  const updateStats = useCallback((newCount: number) => {
    setStats(prev => {
      const history = countHistory.current;
      history.push(newCount);
      
      // Keep only last 100 entries
      if (history.length > 100) {
        history.shift();
      }

      const peak = Math.max(prev.peak, newCount);
      const average = Math.round(
        history.reduce((sum, val) => sum + val, 0) / history.length
      );
      const duration = Math.floor((Date.now() - startTime.current) / 1000);

      return { peak, average, duration };
    });
  }, []);

  // Handle count changes
  useEffect(() => {
    if (count !== previousCount) {
      const newTrend = calculateTrend(count, previousCount);
      setTrend(newTrend);
      
      // Trigger pulse animation
      if (showAnimation && newTrend !== 'stable') {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 600);
      }

      // Animate count change
      animateCount(previousCount, count);
      
      // Update stats
      updateStats(count);
      
      // Notify parent
      onCountChange?.(count, previousCount);
      
      setPreviousCount(count);
    }
  }, [count, previousCount, calculateTrend, animateCount, updateStats, onCountChange, showAnimation]);

  // Format large numbers
  const formatCount = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get trend icon
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  // Render based on variant
  const renderContent = () => {
    switch (variant) {
      case 'detailed':
        return (
          <div className="space-y-3">
            {/* Main count display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "p-2 rounded-lg",
                  "bg-primary-100 dark:bg-primary-900/20"
                )}>
                  <Eye className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "text-2xl font-bold text-gray-900 dark:text-white transition-all",
                      isPulsing && "animate-pulse"
                    )}>
                      {formatCount(displayCount)}
                    </span>
                    {showTrend && getTrendIcon()}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Live viewers
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                {showDetails ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>

            {/* Detailed stats */}
            {showDetails && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Peak</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCount(stats.peak)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Average</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCount(stats.average)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatDuration(stats.duration)}
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      case 'expanded':
        return (
          <div className="flex items-center gap-3">
            <div className={clsx(
              "relative",
              isPulsing && "animate-pulse"
            )}>
              <Users className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              {isPulsing && (
                <div className="absolute inset-0 animate-ping">
                  <Users className="w-6 h-6 text-primary-500 opacity-75" />
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatCount(displayCount)}
                </span>
                {showTrend && getTrendIcon()}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                watching now
              </span>
            </div>
          </div>
        );

      case 'compact':
      default:
        return (
          <div className={clsx(
            "flex items-center gap-2",
            isPulsing && "animate-pulse"
          )}>
            <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatCount(displayCount)}
            </span>
            {showTrend && getTrendIcon()}
          </div>
        );
    }
  };

  return (
    <div className={clsx(
      "viewer-count",
      variant === 'detailed' && "p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700",
      variant === 'expanded' && "px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg",
      variant === 'compact' && "px-2 py-1",
      className
    )}>
      {renderContent()}
    </div>
  );
};

export default ViewerCount;