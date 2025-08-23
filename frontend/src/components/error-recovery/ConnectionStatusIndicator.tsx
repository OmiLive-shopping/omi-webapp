import React from 'react';
import { useConnectionHealth } from '@/stores/enhanced-socket-store';
import { resilientSocketManager } from '@/lib/error-recovery/resilient-socket-manager';

/**
 * Visual indicator for connection status and health
 */
export const ConnectionStatusIndicator: React.FC = () => {
  const { quality, metrics, isHealthy } = useConnectionHealth();
  const systemHealth = resilientSocketManager.getSystemHealth();

  const getStatusColor = (): string => {
    switch (systemHealth.overall) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-green-400';
      case 'fair': return 'bg-yellow-400';
      case 'poor': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (): string => {
    if (!systemHealth.connection.isConnected) {
      return 'Disconnected';
    }
    
    if (systemHealth.errorRecovery.isInFallbackMode) {
      return 'Limited Mode';
    }
    
    if (systemHealth.offlineQueue.hasMessages) {
      return `Syncing (${systemHealth.offlineQueue.pendingMessages})`;
    }
    
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  };

  const getDetailedStatus = (): string => {
    if (!systemHealth.connection.isConnected) {
      return 'Attempting to reconnect...';
    }
    
    if (systemHealth.errorRecovery.circuitBreakerState === 'open') {
      return 'Connection issues detected - using backup mode';
    }
    
    if (systemHealth.offlineQueue.hasMessages) {
      return `${systemHealth.offlineQueue.pendingMessages} messages queued`;
    }
    
    if (metrics) {
      return `${Math.round(metrics.latency)}ms latency, ${metrics.quality} quality`;
    }
    
    return 'Connection stable';
  };

  const shouldPulse = (): boolean => {
    return !systemHealth.connection.isConnected || 
           systemHealth.errorRecovery.isInFallbackMode ||
           systemHealth.offlineQueue.hasMessages;
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="relative">
        <div
          className={`w-3 h-3 rounded-full ${getStatusColor()} ${
            shouldPulse() ? 'animate-pulse' : ''
          }`}
        />
        {systemHealth.offlineQueue.hasMessages && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
        )}
      </div>
      
      <div className="hidden sm:flex flex-col">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {getStatusText()}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getDetailedStatus()}
        </span>
      </div>
    </div>
  );
};

/**
 * Detailed connection health modal/tooltip
 */
interface ConnectionHealthDetailsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionHealthDetails: React.FC<ConnectionHealthDetailsProps> = ({
  isOpen,
  onClose,
}) => {
  const systemHealth = resilientSocketManager.getSystemHealth();
  const queueStats = resilientSocketManager.getOfflineQueueStats();
  const errorStats = resilientSocketManager.getErrorRecoveryStats();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Connection Health
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Overall Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Health
            </span>
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
              systemHealth.overall === 'excellent' ? 'bg-green-100 text-green-800' :
              systemHealth.overall === 'good' ? 'bg-green-100 text-green-700' :
              systemHealth.overall === 'fair' ? 'bg-yellow-100 text-yellow-800' :
              systemHealth.overall === 'poor' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              {systemHealth.overall}
            </span>
          </div>

          {/* Connection Details */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Connection
            </h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={systemHealth.connection.isConnected ? 'text-green-600' : 'text-red-600'}>
                  {systemHealth.connection.isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Quality:</span>
                <span>{systemHealth.connection.quality}</span>
              </div>
              {systemHealth.connection.metrics && (
                <>
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span>{Math.round(systemHealth.connection.metrics.latency)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Packet Loss:</span>
                    <span>{systemHealth.connection.metrics.packetLoss.toFixed(1)}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error Recovery */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Error Recovery
            </h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Circuit Breaker:</span>
                <span className={
                  errorStats.circuitBreakerState.state === 'closed' ? 'text-green-600' :
                  errorStats.circuitBreakerState.state === 'half-open' ? 'text-yellow-600' :
                  'text-red-600'
                }>
                  {errorStats.circuitBreakerState.state}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Fallback Mode:</span>
                <span className={errorStats.isInFallbackMode ? 'text-orange-600' : 'text-green-600'}>
                  {errorStats.isInFallbackMode ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Recent Errors:</span>
                <span>{errorStats.errorHistory.length}</span>
              </div>
            </div>
          </div>

          {/* Offline Queue */}
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Queue
            </h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Pending:</span>
                <span className={queueStats.pendingMessages > 0 ? 'text-blue-600' : 'text-green-600'}>
                  {queueStats.pendingMessages}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Failed:</span>
                <span className={queueStats.failedMessages > 0 ? 'text-red-600' : 'text-green-600'}>
                  {queueStats.failedMessages}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Sent:</span>
                <span>{queueStats.sentMessages}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-3 flex space-x-2">
            <button
              onClick={() => resilientSocketManager.forceReconnect()}
              className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reconnect
            </button>
            <button
              onClick={() => resilientSocketManager.flushOfflineQueue()}
              className="flex-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Flush Queue
            </button>
            <button
              onClick={() => resilientSocketManager.resetErrorRecovery()}
              className="flex-1 px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
