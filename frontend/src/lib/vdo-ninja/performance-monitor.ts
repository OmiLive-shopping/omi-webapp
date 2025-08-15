/**
 * VDO.Ninja Performance Monitor
 * Tracks and optimizes performance metrics for real-time streaming
 */

import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  // Frame metrics
  fps: number;
  frameDrops: number;
  frameTime: number;
  
  // Memory metrics
  memoryUsage: number;
  memoryLimit: number;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
  
  // Event metrics
  eventsPerSecond: number;
  eventQueueSize: number;
  eventProcessingTime: number;
  
  // Network metrics
  bandwidth: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  
  // CPU metrics
  cpuUsage: number;
  mainThreadBlocked: boolean;
  workerThreads: number;
  
  // Rendering metrics
  paintTime: number;
  layoutTime: number;
  scriptTime: number;
  renderTime: number;
  
  // Stats processing
  statsProcessingTime: number;
  statsUpdateRate: number;
  
  timestamp: Date;
}

export interface PerformanceThresholds {
  minFps?: number;
  maxFrameDrops?: number;
  maxMemoryUsage?: number;
  maxEventQueueSize?: number;
  maxLatency?: number;
  maxPacketLoss?: number;
  maxCpuUsage?: number;
  maxProcessingTime?: number;
}

export interface PerformanceOptimizations {
  enableEventBatching?: boolean;
  enableFrameSkipping?: boolean;
  enableMemoryCleanup?: boolean;
  enableWorkerOffloading?: boolean;
  enableStatsSampling?: boolean;
  enableLazyLoading?: boolean;
  enableRequestIdleCallback?: boolean;
  enableWebAssembly?: boolean;
}

export class VdoPerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private optimizations: PerformanceOptimizations;
  private metricsHistory: PerformanceMetrics[] = [];
  private performanceObserver: PerformanceObserver | null = null;
  private rafId: number | null = null;
  private monitoring: boolean = false;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private eventCount: number = 0;
  private lastEventCountTime: number = Date.now();
  
  constructor(
    thresholds?: PerformanceThresholds,
    optimizations?: PerformanceOptimizations
  ) {
    super();
    
    this.thresholds = {
      minFps: thresholds?.minFps ?? 24,
      maxFrameDrops: thresholds?.maxFrameDrops ?? 5,
      maxMemoryUsage: thresholds?.maxMemoryUsage ?? 500 * 1024 * 1024, // 500MB
      maxEventQueueSize: thresholds?.maxEventQueueSize ?? 1000,
      maxLatency: thresholds?.maxLatency ?? 150,
      maxPacketLoss: thresholds?.maxPacketLoss ?? 5,
      maxCpuUsage: thresholds?.maxCpuUsage ?? 80,
      maxProcessingTime: thresholds?.maxProcessingTime ?? 100
    };
    
    this.optimizations = {
      enableEventBatching: optimizations?.enableEventBatching ?? true,
      enableFrameSkipping: optimizations?.enableFrameSkipping ?? true,
      enableMemoryCleanup: optimizations?.enableMemoryCleanup ?? true,
      enableWorkerOffloading: optimizations?.enableWorkerOffloading ?? true,
      enableStatsSampling: optimizations?.enableStatsSampling ?? true,
      enableLazyLoading: optimizations?.enableLazyLoading ?? true,
      enableRequestIdleCallback: optimizations?.enableRequestIdleCallback ?? true,
      enableWebAssembly: optimizations?.enableWebAssembly ?? false
    };
    
    this.metrics = this.createEmptyMetrics();
    this.initializePerformanceObserver();
  }
  
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      fps: 0,
      frameDrops: 0,
      frameTime: 0,
      memoryUsage: 0,
      memoryLimit: 0,
      memoryPressure: 'low',
      eventsPerSecond: 0,
      eventQueueSize: 0,
      eventProcessingTime: 0,
      bandwidth: 0,
      latency: 0,
      packetLoss: 0,
      jitter: 0,
      cpuUsage: 0,
      mainThreadBlocked: false,
      workerThreads: 0,
      paintTime: 0,
      layoutTime: 0,
      scriptTime: 0,
      renderTime: 0,
      statsProcessingTime: 0,
      statsUpdateRate: 0,
      timestamp: new Date()
    };
  }
  
  private initializePerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;
    
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });
      
      // Observe different entry types
      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource', 'paint', 'layout-shift'] 
      });
    } catch (error) {
      console.warn('PerformanceObserver not supported:', error);
    }
  }
  
  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.metrics.paintTime = entry.startTime;
        }
        break;
      
      case 'measure':
        if (entry.name.startsWith('vdo-')) {
          this.processCustomMeasure(entry);
        }
        break;
      
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.metrics.renderTime = navEntry.loadEventEnd - navEntry.fetchStart;
        break;
    }
  }
  
  private processCustomMeasure(entry: PerformanceEntry): void {
    switch (entry.name) {
      case 'vdo-event-processing':
        this.metrics.eventProcessingTime = entry.duration;
        break;
      case 'vdo-stats-processing':
        this.metrics.statsProcessingTime = entry.duration;
        break;
      case 'vdo-frame-render':
        this.metrics.frameTime = entry.duration;
        break;
    }
  }
  
  startMonitoring(): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.lastFrameTime = performance.now();
    this.monitorFrame();
    
    // Start memory monitoring
    if (this.optimizations.enableMemoryCleanup) {
      this.startMemoryMonitoring();
    }
    
    // Start event rate monitoring
    this.startEventRateMonitoring();
    
    this.emit('monitoring:started');
  }
  
  stopMonitoring(): void {
    this.monitoring = false;
    
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    this.emit('monitoring:stopped');
  }
  
  private monitorFrame = (): void => {
    if (!this.monitoring) return;
    
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    // Calculate FPS
    this.frameCount++;
    if (deltaTime >= 1000) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;
      this.lastFrameTime = now;
      
      // Check for performance issues
      this.checkPerformanceThresholds();
      
      // Update metrics
      this.updateMetrics();
    }
    
    // Track frame time
    this.metrics.frameTime = deltaTime;
    
    // Check for frame drops
    if (deltaTime > 33.33) { // More than 30fps threshold
      this.metrics.frameDrops++;
    }
    
    this.rafId = requestAnimationFrame(this.monitorFrame);
  };
  
  private startMemoryMonitoring(): void {
    if (!('memory' in performance)) return;
    
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize;
        this.metrics.memoryLimit = memory.jsHeapSizeLimit;
        
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usagePercent < 50) {
          this.metrics.memoryPressure = 'low';
        } else if (usagePercent < 70) {
          this.metrics.memoryPressure = 'medium';
        } else if (usagePercent < 90) {
          this.metrics.memoryPressure = 'high';
        } else {
          this.metrics.memoryPressure = 'critical';
          this.triggerMemoryCleanup();
        }
      }
    }, 5000);
  }
  
  private startEventRateMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      const timeDelta = (now - this.lastEventCountTime) / 1000;
      
      this.metrics.eventsPerSecond = Math.round(this.eventCount / timeDelta);
      this.eventCount = 0;
      this.lastEventCountTime = now;
    }, 1000);
  }
  
  private checkPerformanceThresholds(): void {
    const issues: string[] = [];
    
    if (this.metrics.fps < this.thresholds.minFps!) {
      issues.push(`Low FPS: ${this.metrics.fps}`);
    }
    
    if (this.metrics.frameDrops > this.thresholds.maxFrameDrops!) {
      issues.push(`Frame drops: ${this.metrics.frameDrops}`);
    }
    
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage!) {
      issues.push(`High memory usage: ${Math.round(this.metrics.memoryUsage / 1024 / 1024)}MB`);
    }
    
    if (this.metrics.latency > this.thresholds.maxLatency!) {
      issues.push(`High latency: ${this.metrics.latency}ms`);
    }
    
    if (this.metrics.packetLoss > this.thresholds.maxPacketLoss!) {
      issues.push(`High packet loss: ${this.metrics.packetLoss}%`);
    }
    
    if (issues.length > 0) {
      this.emit('performance:degraded', { issues, metrics: this.metrics });
      this.applyOptimizations();
    }
  }
  
  private applyOptimizations(): void {
    // Apply frame skipping
    if (this.optimizations.enableFrameSkipping && this.metrics.fps < this.thresholds.minFps!) {
      this.emit('optimization:frameSkipping', { targetFps: 30 });
    }
    
    // Apply event batching
    if (this.optimizations.enableEventBatching && this.metrics.eventsPerSecond > 100) {
      this.emit('optimization:eventBatching', { batchSize: 10, delay: 100 });
    }
    
    // Trigger memory cleanup
    if (this.optimizations.enableMemoryCleanup && this.metrics.memoryPressure === 'high') {
      this.triggerMemoryCleanup();
    }
    
    // Offload to worker
    if (this.optimizations.enableWorkerOffloading && this.metrics.cpuUsage > 70) {
      this.emit('optimization:workerOffload', { threshold: 70 });
    }
  }
  
  private triggerMemoryCleanup(): void {
    // Clear caches
    this.emit('memory:cleanup:requested');
    
    // Trim history
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-50);
    }
    
    // Force garbage collection if available
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }
  }
  
  private updateMetrics(): void {
    // Add to history
    this.metricsHistory.push({ ...this.metrics });
    
    // Trim history
    if (this.metricsHistory.length > 300) {
      this.metricsHistory.shift();
    }
    
    // Emit metrics update
    this.emit('metrics:updated', this.metrics);
  }
  
  // Public methods
  
  recordEvent(): void {
    this.eventCount++;
    this.metrics.eventQueueSize++;
  }
  
  recordEventProcessed(duration: number): void {
    this.metrics.eventQueueSize = Math.max(0, this.metrics.eventQueueSize - 1);
    this.metrics.eventProcessingTime = duration;
  }
  
  updateNetworkMetrics(metrics: {
    bandwidth?: number;
    latency?: number;
    packetLoss?: number;
    jitter?: number;
  }): void {
    Object.assign(this.metrics, metrics);
  }
  
  updateStatsMetrics(processingTime: number, updateRate: number): void {
    this.metrics.statsProcessingTime = processingTime;
    this.metrics.statsUpdateRate = updateRate;
  }
  
  measurePerformance(name: string, fn: () => void): void {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    performance.mark(startMark);
    fn();
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
  }
  
  async measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    performance.mark(startMark);
    try {
      const result = await fn();
      return result;
    } finally {
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);
    }
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }
  
  getAverageMetrics(duration: number = 60000): Partial<PerformanceMetrics> {
    const now = Date.now();
    const relevantMetrics = this.metricsHistory.filter(
      m => now - m.timestamp.getTime() <= duration
    );
    
    if (relevantMetrics.length === 0) return {};
    
    const sum = relevantMetrics.reduce((acc, m) => ({
      fps: acc.fps + m.fps,
      frameDrops: acc.frameDrops + m.frameDrops,
      memoryUsage: acc.memoryUsage + m.memoryUsage,
      eventsPerSecond: acc.eventsPerSecond + m.eventsPerSecond,
      latency: acc.latency + m.latency,
      packetLoss: acc.packetLoss + m.packetLoss,
      cpuUsage: acc.cpuUsage + m.cpuUsage
    }), {
      fps: 0,
      frameDrops: 0,
      memoryUsage: 0,
      eventsPerSecond: 0,
      latency: 0,
      packetLoss: 0,
      cpuUsage: 0
    });
    
    const count = relevantMetrics.length;
    
    return {
      fps: Math.round(sum.fps / count),
      frameDrops: Math.round(sum.frameDrops / count),
      memoryUsage: Math.round(sum.memoryUsage / count),
      eventsPerSecond: Math.round(sum.eventsPerSecond / count),
      latency: Math.round(sum.latency / count),
      packetLoss: sum.packetLoss / count,
      cpuUsage: sum.cpuUsage / count
    };
  }
  
  getPerformanceScore(): number {
    const weights = {
      fps: 0.3,
      memory: 0.2,
      latency: 0.2,
      packetLoss: 0.15,
      cpu: 0.15
    };
    
    const scores = {
      fps: Math.min(100, (this.metrics.fps / 60) * 100),
      memory: Math.max(0, 100 - (this.metrics.memoryUsage / this.thresholds.maxMemoryUsage!) * 100),
      latency: Math.max(0, 100 - (this.metrics.latency / this.thresholds.maxLatency!) * 100),
      packetLoss: Math.max(0, 100 - (this.metrics.packetLoss / this.thresholds.maxPacketLoss!) * 100),
      cpu: Math.max(0, 100 - this.metrics.cpuUsage)
    };
    
    return Object.entries(weights).reduce(
      (total, [key, weight]) => total + scores[key as keyof typeof scores] * weight,
      0
    );
  }
  
  reset(): void {
    this.metrics = this.createEmptyMetrics();
    this.metricsHistory = [];
    this.frameCount = 0;
    this.eventCount = 0;
    this.metrics.frameDrops = 0;
  }
  
  destroy(): void {
    this.stopMonitoring();
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    this.removeAllListeners();
  }
}

// Singleton instance
let performanceMonitor: VdoPerformanceMonitor | null = null;

export function getPerformanceMonitor(
  thresholds?: PerformanceThresholds,
  optimizations?: PerformanceOptimizations
): VdoPerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new VdoPerformanceMonitor(thresholds, optimizations);
  }
  return performanceMonitor;
}