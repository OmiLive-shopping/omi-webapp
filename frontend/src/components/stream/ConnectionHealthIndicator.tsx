import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, Activity, Clock, Users } from 'lucide-react';
import { ConnectionQuality, ConnectionMetrics } from '@/lib/connection-health-monitor';
import { enhancedSocketManager } from '@/lib/enhanced-socket-manager';

interface ConnectionHealthIndicatorProps {
  /** Position of the indicator */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Show detailed metrics on hover/click */
  showDetails?: boolean;
  /** Compact mode - smaller indicator */
  compact?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Connection Health Indicator Component
 * Shows real-time connection quality and metrics
 */
export const ConnectionHealthIndicator: React.FC<ConnectionHealthIndicatorProps> = ({
  position = 'top-right',
  showDetails = true,
  compact = false,
  className = '',
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [quality, setQuality] = useState<ConnectionQuality>('good');
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    const socket = enhancedSocketManager.getSocket();
    setIsConnected(socket?.connected ?? false);
    setQuality(enhancedSocketManager.getConnectionQuality());
    setMetrics(enhancedSocketManager.getConnectionMetrics());

    // Set up event listeners
    const handleConnectionEstablished = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setReconnectAttempt(0);
    };

    const handleConnectionLost = () => {
      setIsConnected(false);
    };

    const handleReconnectStarted = (data: { attempt: number }) => {
      setIsReconnecting(true);
      setReconnectAttempt(data.attempt);
    };

    const handleReconnectSuccess = () => {
      setIsReconnecting(false);
      setReconnectAttempt(0);
    };

    const handleQualityChanged = (newQuality: ConnectionQuality) => {
      setQuality(newQuality);
    };

    const handleMetricsUpdated = (newMetrics: ConnectionMetrics) => {
      setMetrics(newMetrics);
    };

    // Register listeners
    enhancedSocketManager.onInternal('connection:established', handleConnectionEstablished);
    enhancedSocketManager.onInternal('connection:lost', handleConnectionLost);
    enhancedSocketManager.onInternal('reconnect:started', handleReconnectStarted);
    enhancedSocketManager.onInternal('reconnect:success', handleReconnectSuccess);
    enhancedSocketManager.onInternal('health:quality-changed', handleQualityChanged);
    enhancedSocketManager.onInternal('health:metrics-updated', handleMetricsUpdated);

    // Cleanup
    return () => {
      enhancedSocketManager.offInternal('connection:established', handleConnectionEstablished);
      enhancedSocketManager.offInternal('connection:lost', handleConnectionLost);
      enhancedSocketManager.offInternal('reconnect:started', handleReconnectStarted);
      enhancedSocketManager.offInternal('reconnect:success', handleReconnectSuccess);
      enhancedSocketManager.offInternal('health:quality-changed', handleQualityChanged);
      enhancedSocketManager.offInternal('health:metrics-updated', handleMetricsUpdated);
    };
  }, []);

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50';
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  const getQualityColor = (q: ConnectionQuality) => {
    switch (q) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-lime-500';
      case 'fair':
        return 'text-yellow-500';
      case 'poor':
        return 'text-orange-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getQualityIcon = () => {
    if (isReconnecting) {
      return <Activity className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} animate-pulse text-blue-500`} />;
    }

    if (!isConnected) {
      return <WifiOff className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-red-500`} />;
    }

    switch (quality) {
      case 'excellent':
      case 'good':
        return <Wifi className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${getQualityColor(quality)}`} />;
      case 'fair':
      case 'poor':
        return <Wifi className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${getQualityColor(quality)}`} />;
      case 'critical':
        return <AlertTriangle className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${getQualityColor(quality)}`} />;
      default:
        return <Wifi className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-gray-500`} />;
    }
  };

  const getStatusText = () => {
    if (isReconnecting) {
      return `Reconnecting (${reconnectAttempt})...`;
    }

    if (!isConnected) {
      return 'Disconnected';
    }

    return quality.charAt(0).toUpperCase() + quality.slice(1);
  };

  const formatLatency = (latency: number) => {
    if (latency < 1000) {
      return `${Math.round(latency)}ms`;
    } else {
      return `${(latency / 1000).toFixed(1)}s`;
    }
  };

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
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

  const handleForceReconnect = () => {
    enhancedSocketManager.forceReconnect();
    setShowTooltip(false);
  };

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      <div
        className={`
          relative bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
          ${compact ? 'p-2' : 'p-3'}
          hover:shadow-xl transition-shadow duration-200
          ${showDetails ? 'cursor-pointer' : ''}
        `}
        onMouseEnter={() => showDetails && setShowTooltip(true)}
        onMouseLeave={() => showDetails && setShowTooltip(false)}
        onClick={() => showDetails && setShowTooltip(!showTooltip)}
      >
        <div className="flex items-center space-x-2">
          {getQualityIcon()}
          {!compact && (
            <span className={`text-sm font-medium ${getQualityColor(quality)}`}>
              {getStatusText()}
            </span>
          )}
        </div>

        {/* Detailed Tooltip */}
        {showDetails && showTooltip && metrics && (
          <div
            className={`
              absolute z-10 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
              ${position.includes('right') ? 'right-0' : 'left-0'}
              ${position.includes('top') ? 'top-full mt-2' : 'bottom-full mb-2'}
              p-4
            `}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Connection Status
                </h3>
                <span className={`text-sm font-medium ${getQualityColor(quality)}`}>
                  {getStatusText()}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-gray-600 dark:text-gray-300">Latency</div>
                    <div className="font-medium">{formatLatency(metrics.latency)}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-gray-600 dark:text-gray-300">Avg Latency</div>
                    <div className="font-medium">{formatLatency(metrics.averageLatency)}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-gray-600 dark:text-gray-300">Packet Loss</div>
                    <div className="font-medium">{(metrics.packetLoss * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="text-gray-600 dark:text-gray-300">Uptime</div>
                    <div className="font-medium">{formatDuration(metrics.connectionDuration)}</div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Reconnects: {metrics.totalDisconnects}</span>
                  <span>Failures: {metrics.consecutiveFailures}</span>
                </div>
              </div>

              {/* Actions */}
              {!isConnected && (
                <div className="pt-2">
                  <button
                    onClick={handleForceReconnect}
                    className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Force Reconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionHealthIndicator;
