import React, { useEffect, useState, useRef } from 'react';
import { wsPerformanceMonitor, WebSocketMetrics, PerformanceAlert, PerformanceSnapshot } from '@/lib/websocket-performance-monitor';
import { AlertCircle, Activity, Wifi, WifiOff, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, BarChart3, Zap } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'critical';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  icon, 
  trend, 
  status = 'good',
  description 
}) => {
  const statusColors = {
    good: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    critical: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
  };
  
  const trendIcons = {
    up: <TrendingUp className="w-4 h-4 text-green-500" />,
    down: <TrendingDown className="w-4 h-4 text-red-500" />,
    stable: <div className="w-4 h-4 text-gray-500">—</div>
  };
  
  return (
    <div className={`p-4 rounded-lg border ${statusColors[status]} transition-colors`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h3>
        </div>
        {trend && trendIcons[trend]}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
      </div>
      {description && (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{description}</p>
      )}
    </div>
  );
};

interface LatencyChartProps {
  history: number[];
  maxValue: number;
}

const LatencyChart: React.FC<LatencyChartProps> = ({ history, maxValue }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up dimensions
    const width = canvas.width;
    const height = canvas.height;
    const padding = 10;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;
    
    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= 4; i++) {
      const y = padding + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw data
    if (history.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const stepX = graphWidth / (history.length - 1);
      
      history.forEach((value, index) => {
        const x = padding + stepX * index;
        const y = padding + graphHeight - (value / maxValue) * graphHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Fill area under curve
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineTo(width - padding, height - padding);
      ctx.lineTo(padding, height - padding);
      ctx.closePath();
      ctx.fill();
    }
  }, [history, maxValue]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={100}
      className="w-full h-full"
    />
  );
};

export const WebSocketMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<WebSocketMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [health, setHealth] = useState<'healthy' | 'degraded' | 'critical'>('healthy');
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [throughputHistory, setThroughputHistory] = useState<number[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  useEffect(() => {
    // Setup event listeners
    const handleSnapshot = (snapshot: PerformanceSnapshot) => {
      setMetrics(snapshot.metrics);
      setHealth(snapshot.health);
      
      // Update history
      setLatencyHistory(prev => {
        const newHistory = [...prev, snapshot.metrics.currentLatency];
        return newHistory.slice(-50); // Keep last 50 points
      });
      
      setThroughputHistory(prev => {
        const newHistory = [...prev, snapshot.metrics.throughput];
        return newHistory.slice(-50);
      });
    };
    
    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep last 10 alerts
    };
    
    const handleAlertResolved = (alert: PerformanceAlert) => {
      setAlerts(prev => prev.map(a => 
        a.id === alert.id ? { ...a, resolved: true } : a
      ));
    };
    
    wsPerformanceMonitor.on('snapshot:created', handleSnapshot);
    wsPerformanceMonitor.on('alert:triggered', handleAlert);
    wsPerformanceMonitor.on('alert:resolved', handleAlertResolved);
    
    // Start monitoring
    wsPerformanceMonitor.startMonitoring(1000);
    setIsMonitoring(true);
    
    // Load initial metrics
    const initialMetrics = wsPerformanceMonitor.getMetrics();
    setMetrics(initialMetrics);
    
    return () => {
      wsPerformanceMonitor.off('snapshot:created', handleSnapshot);
      wsPerformanceMonitor.off('alert:triggered', handleAlert);
      wsPerformanceMonitor.off('alert:resolved', handleAlertResolved);
    };
  }, []);
  
  const toggleMonitoring = () => {
    if (isMonitoring) {
      wsPerformanceMonitor.stopMonitoring();
    } else {
      wsPerformanceMonitor.startMonitoring(1000);
    }
    setIsMonitoring(!isMonitoring);
  };
  
  const resetMetrics = () => {
    wsPerformanceMonitor.reset();
    setMetrics(wsPerformanceMonitor.getMetrics());
    setAlerts([]);
    setLatencyHistory([]);
    setThroughputHistory([]);
  };
  
  const exportMetrics = () => {
    const data = wsPerformanceMonitor.exportMetrics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `websocket-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  if (!metrics) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400">Loading metrics...</div>
        </div>
      </div>
    );
  }
  
  const healthColors = {
    healthy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    degraded: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  };
  
  const healthIcons = {
    healthy: <CheckCircle className="w-5 h-5" />,
    degraded: <AlertTriangle className="w-5 h-5" />,
    critical: <AlertCircle className="w-5 h-5" />
  };
  
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
  
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            WebSocket Performance Monitor
          </h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${healthColors[health]}`}>
            {healthIcons[health]}
            {health.charAt(0).toUpperCase() + health.slice(1)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMonitoring}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            {isMonitoring ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </button>
          <button
            onClick={resetMetrics}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={exportMetrics}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Export
          </button>
        </div>
      </div>
      
      {/* Connection Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Connection</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Uptime"
            value={formatDuration(metrics.uptime)}
            icon={<Clock className="w-5 h-5 text-blue-500" />}
            status={metrics.uptime > 0 ? 'good' : 'critical'}
          />
          <MetricCard
            title="Reconnections"
            value={metrics.reconnectionCount}
            icon={<Activity className="w-5 h-5 text-orange-500" />}
            status={metrics.reconnectionCount === 0 ? 'good' : metrics.reconnectionCount > 5 ? 'critical' : 'warning'}
          />
          <MetricCard
            title="Avg Reconnect Time"
            value={metrics.averageReconnectionTime.toFixed(0)}
            unit="ms"
            icon={<Clock className="w-5 h-5 text-purple-500" />}
            status={metrics.averageReconnectionTime < 1000 ? 'good' : metrics.averageReconnectionTime < 5000 ? 'warning' : 'critical'}
          />
          <MetricCard
            title="Disconnections"
            value={metrics.disconnectionCount}
            icon={<WifiOff className="w-5 h-5 text-red-500" />}
            status={metrics.disconnectionCount === 0 ? 'good' : metrics.disconnectionCount > 3 ? 'critical' : 'warning'}
          />
        </div>
      </div>
      
      {/* Latency Metrics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Latency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              title="Current"
              value={metrics.currentLatency.toFixed(1)}
              unit="ms"
              icon={<Zap className="w-5 h-5 text-yellow-500" />}
              status={metrics.currentLatency < 50 ? 'good' : metrics.currentLatency < 100 ? 'warning' : 'critical'}
            />
            <MetricCard
              title="Average"
              value={metrics.averageLatency.toFixed(1)}
              unit="ms"
              icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
              status={metrics.averageLatency < 50 ? 'good' : metrics.averageLatency < 100 ? 'warning' : 'critical'}
            />
            <MetricCard
              title="Jitter"
              value={metrics.jitter.toFixed(1)}
              unit="ms"
              icon={<Activity className="w-5 h-5 text-purple-500" />}
              status={metrics.jitter < 20 ? 'good' : metrics.jitter < 50 ? 'warning' : 'critical'}
            />
            <MetricCard
              title="Min/Max"
              value={`${metrics.minLatency.toFixed(0)}/${metrics.maxLatency.toFixed(0)}`}
              unit="ms"
              icon={<TrendingUp className="w-5 h-5 text-green-500" />}
              status="good"
            />
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Latency Trend</h4>
            <LatencyChart history={latencyHistory} maxValue={200} />
          </div>
        </div>
      </div>
      
      {/* Message Metrics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Messages</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Sent"
            value={metrics.messagesSent}
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            status="good"
          />
          <MetricCard
            title="Received"
            value={metrics.messagesReceived}
            icon={<TrendingDown className="w-5 h-5 text-blue-500" />}
            status="good"
          />
          <MetricCard
            title="Dropped"
            value={metrics.messagesDropped}
            icon={<AlertCircle className="w-5 h-5 text-red-500" />}
            status={metrics.messagesDropped === 0 ? 'good' : metrics.messagesDropped > 10 ? 'critical' : 'warning'}
          />
          <MetricCard
            title="Message Rate"
            value={metrics.messageRate}
            unit="/s"
            icon={<Activity className="w-5 h-5 text-purple-500" />}
            status={metrics.messageRate < 100 ? 'good' : metrics.messageRate < 500 ? 'warning' : 'critical'}
          />
        </div>
      </div>
      
      {/* Performance Metrics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Throughput"
            value={formatBytes(metrics.throughput)}
            unit="/s"
            icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
            status={metrics.throughput > 100000 ? 'good' : metrics.throughput > 10000 ? 'warning' : 'critical'}
          />
          <MetricCard
            title="Queue Size"
            value={metrics.queueSize}
            icon={<Activity className="w-5 h-5 text-orange-500" />}
            status={metrics.queueSize < 10 ? 'good' : metrics.queueSize < 50 ? 'warning' : 'critical'}
          />
          <MetricCard
            title="Memory Usage"
            value={formatBytes(metrics.memoryUsage)}
            icon={<BarChart3 className="w-5 h-5 text-purple-500" />}
            status={metrics.memoryUsage < 50000000 ? 'good' : metrics.memoryUsage < 100000000 ? 'warning' : 'critical'}
          />
          <MetricCard
            title="Error Rate"
            value={(metrics.errorRate * 100).toFixed(2)}
            unit="%"
            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            status={metrics.errorRate < 0.01 ? 'good' : metrics.errorRate < 0.05 ? 'warning' : 'critical'}
          />
        </div>
      </div>
      
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recent Alerts</h3>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${
                  alert.resolved
                    ? 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                    : alert.type === 'critical'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {alert.resolved ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : alert.type === 'critical' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      alert.resolved
                        ? 'text-gray-600 dark:text-gray-400 line-through'
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {alert.message}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {!alert.resolved && (
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {alert.metric}: {alert.currentValue} (threshold: {alert.threshold})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};