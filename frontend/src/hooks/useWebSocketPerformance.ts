import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { 
  wsPerformanceMonitor, 
  WebSocketMetrics, 
  PerformanceAlert, 
  PerformanceSnapshot,
  PerformanceThresholds 
} from '@/lib/websocket-performance-monitor';
import { 
  wsAlertManager, 
  AlertRule, 
  AlertHistoryEntry,
  NotificationChannel 
} from '@/lib/websocket-alert-manager';

/**
 * Performance tracking configuration
 */
export interface PerformanceTrackingConfig {
  enabled: boolean;
  monitoringInterval: number;
  historySize: number;
  thresholds?: Partial<PerformanceThresholds>;
  alertChannels?: NotificationChannel[];
  analyticsEnabled?: boolean;
  webhookUrl?: string;
}

/**
 * Hook state
 */
interface WebSocketPerformanceState {
  metrics: WebSocketMetrics | null;
  health: 'healthy' | 'degraded' | 'critical';
  activeAlerts: PerformanceAlert[];
  alertHistory: AlertHistoryEntry[];
  isMonitoring: boolean;
  connectionQuality: {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    score: number; // 0-100
    issues: string[];
  };
}

/**
 * Hook return type
 */
interface UseWebSocketPerformanceReturn {
  // State
  metrics: WebSocketMetrics | null;
  health: 'healthy' | 'degraded' | 'critical';
  activeAlerts: PerformanceAlert[];
  alertHistory: AlertHistoryEntry[];
  isMonitoring: boolean;
  connectionQuality: WebSocketPerformanceState['connectionQuality'];
  
  // Performance data
  getHistory: (duration?: number) => PerformanceSnapshot[];
  getMetricsTrend: (metric: keyof WebSocketMetrics, points?: number) => number[];
  
  // Monitoring control
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resetMetrics: () => void;
  
  // Alert management
  acknowledgeAlert: (alertId: string, notes?: string) => void;
  configureAlertRule: (rule: Partial<AlertRule>) => void;
  getAlertRules: () => AlertRule[];
  
  // Performance tracking
  trackMessage: (type: 'sent' | 'received', message: any) => void;
  trackError: (error: Error) => void;
  trackLatency: (latency: number) => void;
  
  // Export/Analytics
  exportMetrics: () => string;
  sendAnalytics: () => void;
}

/**
 * React hook for WebSocket performance monitoring
 */
export function useWebSocketPerformance(
  socket: Socket | null,
  config?: Partial<PerformanceTrackingConfig>
): UseWebSocketPerformanceReturn {
  const [state, setState] = useState<WebSocketPerformanceState>({
    metrics: null,
    health: 'healthy',
    activeAlerts: [],
    alertHistory: [],
    isMonitoring: false,
    connectionQuality: {
      status: 'good',
      score: 100,
      issues: []
    }
  });
  
  const historyRef = useRef<PerformanceSnapshot[]>([]);
  const metricsHistoryRef = useRef<Map<keyof WebSocketMetrics, number[]>>(new Map());
  const lastPingTime = useRef<number>(0);
  
  const configuration = {
    enabled: true,
    monitoringInterval: 1000,
    historySize: 100,
    analyticsEnabled: false,
    ...config
  };
  
  // Initialize monitoring
  useEffect(() => {
    if (!socket || !configuration.enabled) return;
    
    // Setup thresholds if provided
    if (configuration.thresholds) {
      Object.assign(wsPerformanceMonitor, { thresholds: configuration.thresholds });
    }
    
    // Setup alert manager
    if (configuration.webhookUrl) {
      wsAlertManager.config.webhookUrl = configuration.webhookUrl;
    }
    
    // Setup event handlers
    const handleSnapshot = (snapshot: PerformanceSnapshot) => {
      // Update history
      historyRef.current.push(snapshot);
      if (historyRef.current.length > configuration.historySize) {
        historyRef.current.shift();
      }
      
      // Update metrics history
      updateMetricsHistory(snapshot.metrics);
      
      // Check alerts
      wsAlertManager.checkMetrics(snapshot.metrics);
      
      // Calculate connection quality
      const quality = calculateConnectionQuality(snapshot.metrics);
      
      setState(prev => ({
        ...prev,
        metrics: snapshot.metrics,
        health: snapshot.health,
        connectionQuality: quality
      }));
      
      // Send analytics if enabled
      if (configuration.analyticsEnabled) {
        sendMetricsToAnalytics(snapshot);
      }
    };
    
    const handleAlert = (alert: PerformanceAlert) => {
      setState(prev => ({
        ...prev,
        activeAlerts: [...prev.activeAlerts, alert]
      }));
    };
    
    const handleAlertResolved = (data: { alert: PerformanceAlert }) => {
      setState(prev => ({
        ...prev,
        activeAlerts: prev.activeAlerts.filter(a => a.id !== data.alert.id)
      }));
    };
    
    const handleAlertHistory = (entry: AlertHistoryEntry) => {
      setState(prev => ({
        ...prev,
        alertHistory: [entry, ...prev.alertHistory].slice(0, 50)
      }));
    };
    
    // Subscribe to events
    wsPerformanceMonitor.on('snapshot:created', handleSnapshot);
    wsPerformanceMonitor.on('alert:triggered', handleAlert);
    wsPerformanceMonitor.on('alert:resolved', handleAlertResolved);
    wsAlertManager.on('alert:triggered', handleAlertHistory);
    
    // Setup socket event tracking
    setupSocketTracking(socket);
    
    // Start monitoring
    if (configuration.enabled) {
      wsPerformanceMonitor.startMonitoring(configuration.monitoringInterval);
      setState(prev => ({ ...prev, isMonitoring: true }));
    }
    
    return () => {
      wsPerformanceMonitor.off('snapshot:created', handleSnapshot);
      wsPerformanceMonitor.off('alert:triggered', handleAlert);
      wsPerformanceMonitor.off('alert:resolved', handleAlertResolved);
      wsAlertManager.off('alert:triggered', handleAlertHistory);
      
      if (state.isMonitoring) {
        wsPerformanceMonitor.stopMonitoring();
      }
    };
  }, [socket, configuration.enabled]);
  
  // Setup socket tracking
  const setupSocketTracking = (socket: Socket) => {
    // Track connection events
    socket.on('connect', () => {
      wsPerformanceMonitor.recordConnection();
    });
    
    socket.on('disconnect', (reason) => {
      wsPerformanceMonitor.recordDisconnection(
        reason === 'io server disconnect' ? new Error('Server disconnected') : undefined
      );
    });
    
    socket.on('reconnect', () => {
      wsPerformanceMonitor.recordReconnection();
    });
    
    // Track ping/pong for latency
    socket.on('pong', (timestamp: number) => {
      wsPerformanceMonitor.handlePong(timestamp);
    });
    
    // Send periodic pings
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        const timestamp = Date.now();
        lastPingTime.current = timestamp;
        socket.emit('ping', timestamp);
      }
    }, 5000);
    
    // Track all outgoing messages
    const originalEmit = socket.emit.bind(socket);
    socket.emit = function(...args: any[]) {
      wsPerformanceMonitor.recordMessageSent({ event: args[0], data: args[1] });
      return originalEmit.apply(socket, args);
    };
    
    // Track all incoming messages
    const originalOn = socket.on.bind(socket);
    socket.on = function(event: string, listener: Function) {
      const wrappedListener = (...args: any[]) => {
        wsPerformanceMonitor.recordMessageReceived({ event, data: args[0] });
        return listener(...args);
      };
      return originalOn(event, wrappedListener);
    };
    
    return () => {
      clearInterval(pingInterval);
    };
  };
  
  // Update metrics history
  const updateMetricsHistory = (metrics: WebSocketMetrics) => {
    const keysToTrack: (keyof WebSocketMetrics)[] = [
      'currentLatency',
      'messageRate',
      'throughput',
      'errorRate',
      'queueSize'
    ];
    
    for (const key of keysToTrack) {
      const history = metricsHistoryRef.current.get(key) || [];
      history.push(metrics[key] as number);
      
      // Keep last 100 points
      if (history.length > 100) {
        history.shift();
      }
      
      metricsHistoryRef.current.set(key, history);
    }
  };
  
  // Calculate connection quality
  const calculateConnectionQuality = (metrics: WebSocketMetrics): WebSocketPerformanceState['connectionQuality'] => {
    let score = 100;
    const issues: string[] = [];
    
    // Latency impact
    if (metrics.currentLatency > 200) {
      score -= 30;
      issues.push('High latency detected');
    } else if (metrics.currentLatency > 100) {
      score -= 15;
      issues.push('Moderate latency');
    }
    
    // Jitter impact
    if (metrics.jitter > 50) {
      score -= 20;
      issues.push('High jitter affecting stability');
    } else if (metrics.jitter > 20) {
      score -= 10;
      issues.push('Some jitter detected');
    }
    
    // Error rate impact
    if (metrics.errorRate > 0.05) {
      score -= 25;
      issues.push('High error rate');
    } else if (metrics.errorRate > 0.01) {
      score -= 10;
      issues.push('Elevated error rate');
    }
    
    // Reconnection impact
    if (metrics.reconnectionCount > 5) {
      score -= 20;
      issues.push('Multiple reconnections');
    } else if (metrics.reconnectionCount > 0) {
      score -= 10;
      issues.push('Connection instability');
    }
    
    // Queue size impact
    if (metrics.queueSize > 50) {
      score -= 15;
      issues.push('Large message queue');
    }
    
    // Determine status
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'fair';
    else status = 'poor';
    
    return {
      status,
      score: Math.max(0, score),
      issues
    };
  };
  
  // Send metrics to analytics
  const sendMetricsToAnalytics = (snapshot: PerformanceSnapshot) => {
    // This would integrate with your analytics service
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('websocket_performance', {
        metrics: snapshot.metrics,
        health: snapshot.health,
        timestamp: snapshot.timestamp
      });
    }
  };
  
  // Start monitoring
  const startMonitoring = useCallback(() => {
    wsPerformanceMonitor.startMonitoring(configuration.monitoringInterval);
    setState(prev => ({ ...prev, isMonitoring: true }));
  }, [configuration.monitoringInterval]);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    wsPerformanceMonitor.stopMonitoring();
    setState(prev => ({ ...prev, isMonitoring: false }));
  }, []);
  
  // Reset metrics
  const resetMetrics = useCallback(() => {
    wsPerformanceMonitor.reset();
    historyRef.current = [];
    metricsHistoryRef.current.clear();
    setState(prev => ({
      ...prev,
      metrics: wsPerformanceMonitor.getMetrics(),
      activeAlerts: [],
      health: 'healthy'
    }));
  }, []);
  
  // Get history
  const getHistory = useCallback((duration?: number): PerformanceSnapshot[] => {
    if (!duration) return historyRef.current;
    
    const cutoff = Date.now() - duration;
    return historyRef.current.filter(s => s.timestamp.getTime() > cutoff);
  }, []);
  
  // Get metrics trend
  const getMetricsTrend = useCallback((
    metric: keyof WebSocketMetrics, 
    points: number = 50
  ): number[] => {
    const history = metricsHistoryRef.current.get(metric) || [];
    return history.slice(-points);
  }, []);
  
  // Track message
  const trackMessage = useCallback((type: 'sent' | 'received', message: any) => {
    if (type === 'sent') {
      wsPerformanceMonitor.recordMessageSent(message);
    } else {
      wsPerformanceMonitor.recordMessageReceived(message);
    }
  }, []);
  
  // Track error
  const trackError = useCallback((error: Error) => {
    wsPerformanceMonitor.recordError(error);
  }, []);
  
  // Track latency
  const trackLatency = useCallback((latency: number) => {
    wsPerformanceMonitor.recordLatency(latency);
  }, []);
  
  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string, notes?: string) => {
    wsAlertManager.acknowledgeAlert(alertId, 'user', notes);
  }, []);
  
  // Configure alert rule
  const configureAlertRule = useCallback((rule: Partial<AlertRule>) => {
    if (rule.id) {
      wsAlertManager.updateRule(rule.id, rule);
    } else {
      wsAlertManager.addRule({
        id: `custom_${Date.now()}`,
        name: 'Custom Rule',
        description: 'User-defined rule',
        metric: 'currentLatency',
        condition: 'gt',
        threshold: 100,
        severity: 'warning',
        channels: ['ui'],
        enabled: true,
        ...rule
      } as AlertRule);
    }
  }, []);
  
  // Get alert rules
  const getAlertRules = useCallback((): AlertRule[] => {
    return wsAlertManager.getRules();
  }, []);
  
  // Export metrics
  const exportMetrics = useCallback((): string => {
    return wsPerformanceMonitor.exportMetrics();
  }, []);
  
  // Send analytics
  const sendAnalytics = useCallback(() => {
    if (state.metrics) {
      sendMetricsToAnalytics({
        timestamp: new Date(),
        metrics: state.metrics,
        alerts: state.activeAlerts,
        health: state.health
      });
    }
  }, [state]);
  
  return {
    // State
    metrics: state.metrics,
    health: state.health,
    activeAlerts: state.activeAlerts,
    alertHistory: state.alertHistory,
    isMonitoring: state.isMonitoring,
    connectionQuality: state.connectionQuality,
    
    // Performance data
    getHistory,
    getMetricsTrend,
    
    // Monitoring control
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    
    // Alert management
    acknowledgeAlert,
    configureAlertRule,
    getAlertRules,
    
    // Performance tracking
    trackMessage,
    trackError,
    trackLatency,
    
    // Export/Analytics
    exportMetrics,
    sendAnalytics
  };
}