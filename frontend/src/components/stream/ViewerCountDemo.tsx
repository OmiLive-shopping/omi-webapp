import React, { useState, useEffect, useRef } from 'react';
import ViewerCount from './ViewerCount';

// Mock Socket.io events for demo
class MockSocket {
  private listeners: { [event: string]: ((data: any) => void)[] } = {};

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (!this.listeners[event]) return;
    
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  disconnect() {
    this.listeners = {};
  }
}

export const ViewerCountDemo: React.FC = () => {
  const [viewerCount, setViewerCount] = useState(1250);
  const [isAutoUpdate, setIsAutoUpdate] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(3000);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const socketRef = useRef<MockSocket | null>(null);

  // Simulate Socket.io connection
  useEffect(() => {
    // Create mock socket
    const mockSocket = new MockSocket();
    socketRef.current = mockSocket;
    
    // Simulate connection
    setTimeout(() => {
      setSocketConnected(true);
      mockSocket.emit('connect', {});
    }, 500);

    // Listen for viewer count updates
    mockSocket.on('viewer-count', (data: { count: number }) => {
      setViewerCount(data.count);
    });

    // Cleanup
    return () => {
      mockSocket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, []);

  // Auto-update simulation
  useEffect(() => {
    if (!isAutoUpdate || !socketRef.current) return;

    const interval = setInterval(() => {
      // Simulate realistic viewer count changes
      const change = Math.floor(Math.random() * 100) - 50; // -50 to +50
      const trend = Math.random();
      
      let newCount = viewerCount;
      if (trend < 0.3) {
        // 30% chance of decrease
        newCount = Math.max(100, viewerCount - Math.abs(change));
      } else if (trend < 0.7) {
        // 40% chance of increase
        newCount = viewerCount + Math.abs(change);
      }
      // 30% chance of staying the same

      // Emit mock socket event
      socketRef.current?.emit('viewer-count', { count: newCount });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [isAutoUpdate, updateInterval, viewerCount]);

  // Manual controls
  const handleManualUpdate = (change: number) => {
    const newCount = Math.max(0, viewerCount + change);
    socketRef.current?.emit('viewer-count', { count: newCount });
  };

  const handleSetSpecific = (count: number) => {
    socketRef.current?.emit('viewer-count', { count });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Viewer Count Component Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time viewer count with animations, trends, and Socket.io integration
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              socketConnected 
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                socketConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              {socketConnected ? 'Socket Connected' : 'Socket Disconnected'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Simulation Controls
          </h2>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAutoUpdate}
                onChange={(e) => setIsAutoUpdate(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-update viewers
              </span>
            </label>
            
            {isAutoUpdate && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Update interval:
                </label>
                <select
                  value={updateInterval}
                  onChange={(e) => setUpdateInterval(Number(e.target.value))}
                  className="text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value={1000}>1s</option>
                  <option value={3000}>3s</option>
                  <option value={5000}>5s</option>
                  <option value={10000}>10s</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleManualUpdate(-100)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              -100
            </button>
            <button
              onClick={() => handleManualUpdate(-10)}
              className="px-3 py-1 bg-red-400 text-white rounded hover:bg-red-500"
            >
              -10
            </button>
            <button
              onClick={() => handleManualUpdate(-1)}
              className="px-3 py-1 bg-red-300 text-white rounded hover:bg-red-400"
            >
              -1
            </button>
            <button
              onClick={() => handleManualUpdate(1)}
              className="px-3 py-1 bg-green-300 text-white rounded hover:bg-green-400"
            >
              +1
            </button>
            <button
              onClick={() => handleManualUpdate(10)}
              className="px-3 py-1 bg-green-400 text-white rounded hover:bg-green-500"
            >
              +10
            </button>
            <button
              onClick={() => handleManualUpdate(100)}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              +100
            </button>
            <button
              onClick={() => handleManualUpdate(1000)}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              +1K
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSetSpecific(0)}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Set to 0
            </button>
            <button
              onClick={() => handleSetSpecific(1337)}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Set to 1,337
            </button>
            <button
              onClick={() => handleSetSpecific(10000)}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Set to 10K
            </button>
            <button
              onClick={() => handleSetSpecific(1000000)}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Set to 1M
            </button>
          </div>
        </div>

        {/* Variants showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Compact variant */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Compact Variant
            </h3>
            <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded">
              <ViewerCount
                count={viewerCount}
                variant="compact"
                onCountChange={(newCount, oldCount) => {
                  console.log(`Compact: ${oldCount} → ${newCount}`);
                }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Minimal space usage, perfect for headers
            </p>
          </div>

          {/* Expanded variant */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Expanded Variant
            </h3>
            <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded">
              <ViewerCount
                count={viewerCount}
                variant="expanded"
                onCountChange={(newCount, oldCount) => {
                  console.log(`Expanded: ${oldCount} → ${newCount}`);
                }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              More prominent with descriptive text
            </p>
          </div>

          {/* Detailed variant */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Detailed Variant
            </h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4">
              <ViewerCount
                count={viewerCount}
                variant="detailed"
                onCountChange={(newCount, oldCount) => {
                  console.log(`Detailed: ${oldCount} → ${newCount}`);
                }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Full statistics with expandable details
            </p>
          </div>
        </div>

        {/* Feature toggles */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Feature Comparison
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                With Animations & Trends
              </h4>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded">
                <ViewerCount
                  count={viewerCount}
                  variant="expanded"
                  showAnimation={true}
                  showTrend={true}
                />
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Without Animations & Trends
              </h4>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded">
                <ViewerCount
                  count={viewerCount}
                  variant="expanded"
                  showAnimation={false}
                  showTrend={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Current value display */}
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Current viewer count: <span className="font-bold">{viewerCount.toLocaleString()}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ViewerCountDemo;