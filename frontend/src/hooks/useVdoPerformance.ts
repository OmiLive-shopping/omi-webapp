import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  VdoPerformanceMonitor,
  PerformanceMetrics,
  PerformanceThresholds,
  PerformanceOptimizations,
  getPerformanceMonitor
} from '@/lib/vdo-ninja/performance-monitor';
import {
  EventBatcher,
  EventDebouncer,
  EventThrottler,
  createBatchedHandler,
  createDebouncedHandler,
  createThrottledHandler,
  RAFQueue,
  IdleQueue
} from '@/lib/vdo-ninja/event-optimizer';
import {
  MemoryManager,
  LRUCache,
  ObjectPool,
  getMemoryManager
} from '@/lib/vdo-ninja/memory-manager';
import {
  StatsWorkerManager,
  getStatsWorker
} from '@/lib/vdo-ninja/stats-worker';

// Hook for monitoring overall performance
export function useVdoPerformance(
  thresholds?: PerformanceThresholds,
  optimizations?: PerformanceOptimizations
) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [performanceScore, setPerformanceScore] = useState(100);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceIssues, setPerformanceIssues] = useState<string[]>([]);
  
  const monitorRef = useRef<VdoPerformanceMonitor>();
  
  useEffect(() => {
    monitorRef.current = getPerformanceMonitor(thresholds, optimizations);
    
    // Subscribe to metrics updates
    const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
      setMetrics(newMetrics);
      setPerformanceScore(monitorRef.current!.getPerformanceScore());
    };
    
    const handlePerformanceDegraded = (event: any) => {
      setPerformanceIssues(event.issues || []);
    };
    
    monitorRef.current.on('metrics:updated', handleMetricsUpdate);
    monitorRef.current.on('performance:degraded', handlePerformanceDegraded);
    
    return () => {
      if (monitorRef.current) {
        monitorRef.current.off('metrics:updated', handleMetricsUpdate);
        monitorRef.current.off('performance:degraded', handlePerformanceDegraded);
      }
    };
  }, []);
  
  const startMonitoring = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.startMonitoring();
      setIsMonitoring(true);
    }
  }, []);
  
  const stopMonitoring = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.stopMonitoring();
      setIsMonitoring(false);
    }
  }, []);
  
  const recordEvent = useCallback(() => {
    monitorRef.current?.recordEvent();
  }, []);
  
  const recordEventProcessed = useCallback((duration: number) => {
    monitorRef.current?.recordEventProcessed(duration);
  }, []);
  
  const getAverageMetrics = useCallback((duration?: number) => {
    return monitorRef.current?.getAverageMetrics(duration) || {};
  }, []);
  
  return {
    metrics,
    performanceScore,
    performanceIssues,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordEvent,
    recordEventProcessed,
    getAverageMetrics
  };
}

// Hook for optimized event handling
export function useOptimizedEventHandler<T extends any[]>(
  handler: (...args: T) => void,
  options: {
    type: 'debounce' | 'throttle' | 'batch';
    delay?: number;
    maxBatchSize?: number;
    leading?: boolean;
    trailing?: boolean;
  }
) {
  const optimizedHandler = useMemo(() => {
    switch (options.type) {
      case 'debounce':
        return createDebouncedHandler(handler, options.delay || 300, {
          leading: options.leading,
          trailing: options.trailing
        });
      
      case 'throttle':
        return createThrottledHandler(handler, options.delay || 100, {
          leading: options.leading,
          trailing: options.trailing
        });
      
      case 'batch':
        return createBatchedHandler(handler as any, {
          maxBatchSize: options.maxBatchSize || 10,
          maxWaitTime: options.delay || 100
        });
      
      default:
        return handler;
    }
  }, [handler, options.type, options.delay, options.maxBatchSize]);
  
  return optimizedHandler;
}

// Hook for memory management
export function useMemoryManagement(streamId?: string) {
  const [memoryUsage, setMemoryUsage] = useState({
    used: 0,
    limit: 0,
    usageRatio: 0,
    cacheSize: 0
  });
  
  const managerRef = useRef<MemoryManager>();
  const cacheRef = useRef<LRUCache<any>>();
  
  useEffect(() => {
    managerRef.current = getMemoryManager({
      enableAutoCleanup: true,
      memoryThreshold: 0.8
    });
    
    // Create cache for this component
    if (streamId) {
      cacheRef.current = managerRef.current.createCache(`stream-${streamId}`, 50 * 1024 * 1024);
    }
    
    // Monitor memory usage
    const interval = setInterval(() => {
      if (managerRef.current) {
        setMemoryUsage(managerRef.current.getMemoryUsage());
      }
    }, 5000);
    
    // Register cleanup callback
    const unsubscribe = managerRef.current.onMemoryPressure(() => {
      console.warn('Memory pressure detected, clearing caches');
      cacheRef.current?.clear();
    });
    
    return () => {
      clearInterval(interval);
      unsubscribe();
      cacheRef.current?.clear();
    };
  }, [streamId]);
  
  const cacheSet = useCallback((key: string, value: any, ttl?: number) => {
    cacheRef.current?.set(key, value, ttl);
  }, []);
  
  const cacheGet = useCallback((key: string) => {
    return cacheRef.current?.get(key);
  }, []);
  
  const cacheClear = useCallback(() => {
    cacheRef.current?.clear();
  }, []);
  
  return {
    memoryUsage,
    cache: {
      set: cacheSet,
      get: cacheGet,
      clear: cacheClear
    }
  };
}

// Hook for Web Worker statistics processing
export function useStatsWorker() {
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<StatsWorkerManager>();
  
  useEffect(() => {
    workerRef.current = getStatsWorker();
    
    return () => {
      // Worker persists across components
    };
  }, []);
  
  const processStats = useCallback(async (stats: any[], config?: any) => {
    if (!workerRef.current) return null;
    
    setIsProcessing(true);
    try {
      const result = await workerRef.current.processStats(stats, config);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  const aggregateStats = useCallback(async (stats: any[], period: string) => {
    if (!workerRef.current) return null;
    
    setIsProcessing(true);
    try {
      const result = await workerRef.current.aggregateStats(stats, period);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  const calculateQuality = useCallback(async (stats: any) => {
    if (!workerRef.current) return null;
    
    setIsProcessing(true);
    try {
      const result = await workerRef.current.calculateQuality(stats);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  const analyzeTrends = useCallback(async (stats: any[], windowSize?: number) => {
    if (!workerRef.current) return null;
    
    setIsProcessing(true);
    try {
      const result = await workerRef.current.analyzeTrends(stats, windowSize);
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  return {
    isProcessing,
    processStats,
    aggregateStats,
    calculateQuality,
    analyzeTrends
  };
}

// Hook for request animation frame updates
export function useRAFUpdate(callback: () => void, deps: any[] = []) {
  const rafRef = useRef<number>();
  const callbackRef = useRef(callback);
  
  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    const animate = () => {
      callbackRef.current();
      rafRef.current = requestAnimationFrame(animate);
    };
    
    rafRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, deps);
}

// Hook for idle time updates
export function useIdleUpdate(callback: () => void, deps: any[] = []) {
  const idleRef = useRef<number>();
  const callbackRef = useRef(callback);
  
  // Update callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const scheduleUpdate = () => {
        idleRef.current = requestIdleCallback(() => {
          callbackRef.current();
          scheduleUpdate();
        });
      };
      
      scheduleUpdate();
      
      return () => {
        if (idleRef.current) {
          (window as any).cancelIdleCallback(idleRef.current);
        }
      };
    } else {
      // Fallback to setTimeout
      const interval = setInterval(() => {
        callbackRef.current();
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, deps);
}

// Hook for object pooling
export function useObjectPool<T>(
  factory: () => T,
  reset: (obj: T) => void,
  maxSize: number = 100
) {
  const poolRef = useRef<ObjectPool<T>>();
  
  useEffect(() => {
    poolRef.current = new ObjectPool(factory, reset, maxSize);
    
    return () => {
      poolRef.current?.clear();
    };
  }, []);
  
  const acquire = useCallback((): T | undefined => {
    return poolRef.current?.acquire();
  }, []);
  
  const release = useCallback((obj: T) => {
    poolRef.current?.release(obj);
  }, []);
  
  const getStats = useCallback(() => {
    return poolRef.current?.getStats() || {
      poolSize: 0,
      inUseCount: 0,
      totalCreated: 0
    };
  }, []);
  
  return {
    acquire,
    release,
    getStats
  };
}

// Hook for batched state updates
export function useBatchedState<T>(
  initialState: T,
  batchDelay: number = 100
) {
  const [state, setState] = useState(initialState);
  const batcherRef = useRef<EventBatcher<Partial<T>>>();
  
  useEffect(() => {
    batcherRef.current = new EventBatcher(
      (batch) => {
        setState(prevState => {
          let newState = { ...prevState };
          for (const update of batch) {
            newState = { ...newState, ...update };
          }
          return newState;
        });
      },
      {
        maxBatchSize: 10,
        maxWaitTime: batchDelay,
        flushOnSize: true,
        preserveOrder: true
      }
    );
    
    return () => {
      batcherRef.current?.destroy();
    };
  }, [batchDelay]);
  
  const updateState = useCallback((update: Partial<T>) => {
    batcherRef.current?.add(update);
  }, []);
  
  const flushUpdates = useCallback(() => {
    batcherRef.current?.flush();
  }, []);
  
  return [state, updateState, flushUpdates] as const;
}

// Combined performance optimization hook
export function useVdoOptimizations(streamId?: string) {
  const performance = useVdoPerformance();
  const memory = useMemoryManagement(streamId);
  const statsWorker = useStatsWorker();
  
  const [optimizationLevel, setOptimizationLevel] = useState<'none' | 'low' | 'medium' | 'high'>('none');
  
  // Auto-adjust optimization level based on performance
  useEffect(() => {
    const score = performance.performanceScore;
    
    if (score >= 90) {
      setOptimizationLevel('none');
    } else if (score >= 75) {
      setOptimizationLevel('low');
    } else if (score >= 50) {
      setOptimizationLevel('medium');
    } else {
      setOptimizationLevel('high');
    }
  }, [performance.performanceScore]);
  
  return {
    performance,
    memory,
    statsWorker,
    optimizationLevel,
    isOptimized: optimizationLevel !== 'none'
  };
}