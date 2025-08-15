import React, { useMemo } from 'react';
import { StatsCard } from './StatsCard';
import { NetworkQualityIndicator } from './NetworkQualityIndicator';
import { MiniStatsBar } from './MiniStatsBar';
import { useRealTimeStats } from '@/hooks/useRealTimeStats';
import type { VdoEventManager } from '@/lib/vdo-ninja/event-manager';
import {
  BarChart3, TrendingUp, Activity, Users,
  Wifi, Radio, Camera, Mic, HardDrive, Clock,
  RefreshCw, Download, Upload
} from 'lucide-react';

export interface StatsDashboardProps {
  eventManager?: VdoEventManager;
  
  // Display options
  showNetworkStats?: boolean;
  showVideoStats?: boolean;
  showAudioStats?: boolean;
  showViewerStats?: boolean;
  showDataUsage?: boolean;
  showTrends?: boolean;
  showCharts?: boolean;
  
  // Layout
  layout?: 'grid' | 'list' | 'compact';
  columns?: 2 | 3 | 4 | 'auto';
  
  // Update settings
  refreshInterval?: number;
  isViewer?: boolean;
  
  // Callbacks
  onExport?: (data: string, format: 'json' | 'csv') => void;
  onMetricClick?: (metric: string, value: any) => void;
  
  // Styling
  className?: string;
  cardClassName?: string;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({
  eventManager,
  showNetworkStats = true,
  showVideoStats = true,
  showAudioStats = true,
  showViewerStats = true,
  showDataUsage = true,
  showTrends = true,
  showCharts = false,
  layout = 'grid',
  columns = 'auto',
  refreshInterval,
  isViewer = false,
  onExport,
  onMetricClick,
  className = '',
  cardClassName = ''
}) => {
  const {
    stats,
    trends,
    aggregatedStats,
    qualityMetrics,
    networkHealth,
    exportStats,
    reset,
    isInitialized,
    lastUpdateTime
  } = useRealTimeStats({
    eventManager,
    refreshInterval,
    isViewer,
    enableTrends: showTrends
  });
  
  // Calculate column classes
  const getGridColumns = () => {
    if (layout !== 'grid') return '';
    
    if (columns === 'auto') {
      return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
    
    const columnMap = {
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    };
    
    return columnMap[columns];
  };
  
  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Format bytes
  const formatBytes = (bytes: number): { value: string; unit: string } => {
    if (bytes >= 1073741824) {
      return { value: (bytes / 1073741824).toFixed(2), unit: 'GB' };
    } else if (bytes >= 1048576) {
      return { value: (bytes / 1048576).toFixed(2), unit: 'MB' };
    } else if (bytes >= 1024) {
      return { value: (bytes / 1024).toFixed(2), unit: 'KB' };
    }
    return { value: bytes.toString(), unit: 'B' };
  };
  
  // Get trend for metric
  const getTrend = (metric: string) => {
    return trends.find(t => t.metric === metric as any);
  };
  
  // Handle export
  const handleExport = (format: 'json' | 'csv') => {
    const data = exportStats(format);
    onExport?.(data, format);
  };
  
  // Handle metric click
  const handleMetricClick = (metric: string) => {
    const value = (stats as any)[metric];
    onMetricClick?.(metric, value);
  };
  
  // Render based on layout
  if (layout === 'compact') {
    return (
      <div className={`stats-dashboard-compact ${className}`}>
        <MiniStatsBar
          stats={{
            bitrate: stats.bitrate,
            fps: stats.fps,
            latency: stats.latency,
            packetLoss: stats.packetLoss,
            viewers: stats.currentViewers
          }}
          showLabels={false}
        />
        <NetworkQualityIndicator
          quality={stats.connectionQuality}
          score={stats.connectionScore}
          size="sm"
          showLabel={false}
        />
      </div>
    );
  }
  
  const layoutClass = layout === 'grid' 
    ? `grid ${getGridColumns()} gap-4`
    : 'space-y-4';
  
  return (
    <div className={`stats-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Stream Statistics</h2>
          {isInitialized && (
            <span className="text-xs text-gray-500">
              Updated {new Date(lastUpdateTime).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {onExport && (
            <>
              <button
                onClick={() => handleExport('json')}
                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Export as JSON"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Export as CSV"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={reset}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Reset Statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Network Quality Bar */}
      <div className="mb-4">
        <NetworkQualityIndicator
          quality={stats.connectionQuality}
          score={stats.connectionScore}
          latency={stats.latency}
          packetLoss={stats.packetLoss}
          jitter={stats.jitter}
          showDetails={true}
        />
      </div>
      
      {/* Stats Grid/List */}
      <div className={layoutClass}>
        {/* Network Stats */}
        {showNetworkStats && (
          <>
            <StatsCard
              title="Bitrate"
              value={stats.bitrate / 1000}
              unit="kbps"
              icon={<Radio className="w-4 h-4" />}
              trend={getTrend('bitrate')}
              previousValue={aggregatedStats.lastMinute.bitrate ? aggregatedStats.lastMinute.bitrate / 1000 : undefined}
              variant={stats.bitrate < 1000000 ? 'warning' : 'default'}
              className={cardClassName}
            />
            
            <StatsCard
              title="Latency"
              value={stats.latency}
              unit="ms"
              icon={<Activity className="w-4 h-4" />}
              trend={getTrend('latency')}
              threshold={{ warning: 100, critical: 200 }}
              className={cardClassName}
            />
            
            <StatsCard
              title="Packet Loss"
              value={stats.packetLoss}
              unit="%"
              icon={<Wifi className="w-4 h-4" />}
              trend={getTrend('packetLoss')}
              threshold={{ warning: 1, critical: 5 }}
              className={cardClassName}
            />
            
            <StatsCard
              title="Jitter"
              value={stats.jitter}
              unit="ms"
              icon={<Activity className="w-4 h-4" />}
              trend={getTrend('jitter')}
              threshold={{ warning: 30, critical: 50 }}
              className={cardClassName}
            />
          </>
        )}
        
        {/* Video Stats */}
        {showVideoStats && (
          <>
            <StatsCard
              title="Frame Rate"
              value={stats.fps}
              unit="fps"
              icon={<Camera className="w-4 h-4" />}
              trend={getTrend('fps')}
              previousValue={aggregatedStats.lastMinute.fps}
              variant={stats.fps < 24 ? 'warning' : 'default'}
              className={cardClassName}
            />
            
            {stats.currentResolution && (
              <StatsCard
                title="Resolution"
                value={`${stats.currentResolution.width}x${stats.currentResolution.height}`}
                icon={<Camera className="w-4 h-4" />}
                description={`${stats.resolutionChanges} changes`}
                className={cardClassName}
              />
            )}
          </>
        )}
        
        {/* Audio Stats */}
        {showAudioStats && (
          <>
            <StatsCard
              title="Audio Level"
              value={Math.round(stats.audioLevel * 100)}
              unit="%"
              icon={<Mic className="w-4 h-4" />}
              description={`Peak: ${Math.round(stats.audioLevelPeak * 100)}%`}
              className={cardClassName}
            />
            
            {stats.audioDropouts > 0 && (
              <StatsCard
                title="Audio Dropouts"
                value={stats.audioDropouts}
                icon={<Mic className="w-4 h-4" />}
                variant="warning"
                className={cardClassName}
              />
            )}
          </>
        )}
        
        {/* Viewer Stats */}
        {showViewerStats && (
          <>
            <StatsCard
              title="Current Viewers"
              value={stats.currentViewers}
              icon={<Users className="w-4 h-4" />}
              description={`Peak: ${stats.peakViewers}`}
              variant="primary"
              className={cardClassName}
            />
            
            <StatsCard
              title="Total Viewers"
              value={stats.totalUniqueViewers}
              icon={<Users className="w-4 h-4" />}
              description={`Avg duration: ${formatDuration(stats.averageViewDuration)}`}
              className={cardClassName}
            />
          </>
        )}
        
        {/* Stream Duration */}
        <StatsCard
          title="Stream Duration"
          value={formatDuration(stats.streamDuration)}
          icon={<Clock className="w-4 h-4" />}
          description={stats.reconnectCount > 0 ? `${stats.reconnectCount} reconnects` : undefined}
          className={cardClassName}
        />
        
        {/* Data Usage */}
        {showDataUsage && (
          <>
            {stats.totalBytesReceived > 0 && (
              <StatsCard
                title="Downloaded"
                value={formatBytes(stats.totalBytesReceived).value}
                unit={formatBytes(stats.totalBytesReceived).unit}
                icon={<Download className="w-4 h-4" />}
                description={`${(stats.averageDownloadSpeed / 1000).toFixed(0)} KB/s`}
                className={cardClassName}
              />
            )}
            
            {stats.totalBytesSent > 0 && (
              <StatsCard
                title="Uploaded"
                value={formatBytes(stats.totalBytesSent).value}
                unit={formatBytes(stats.totalBytesSent).unit}
                icon={<Upload className="w-4 h-4" />}
                description={`${(stats.averageUploadSpeed / 1000).toFixed(0)} KB/s`}
                className={cardClassName}
              />
            )}
          </>
        )}
      </div>
      
      {/* Quality Issues */}
      {qualityMetrics.issues.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Quality Issues Detected
          </h3>
          <ul className="space-y-1">
            {qualityMetrics.issues.map((issue, index) => (
              <li key={index} className="text-xs text-yellow-700 dark:text-yellow-300">
                • {issue}
              </li>
            ))}
          </ul>
          {qualityMetrics.recommendations.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mt-3 mb-1">
                Recommendations
              </h4>
              <ul className="space-y-1">
                {qualityMetrics.recommendations.map((rec, index) => (
                  <li key={index} className="text-xs text-yellow-700 dark:text-yellow-300">
                    • {rec}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;