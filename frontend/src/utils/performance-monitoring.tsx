// Performance Monitoring Utilities
// Tracks Core Web Vitals and custom performance metrics

import React, { useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface WebVitalsConfig {
  onMetric?: (metric: PerformanceMetric) => void;
  reportToAnalytics?: boolean;
  logToConsole?: boolean;
}

// Thresholds based on Google's Core Web Vitals
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
};

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private config: WebVitalsConfig;
  private observer: PerformanceObserver | null = null;

  constructor(config: WebVitalsConfig = {}) {
    this.config = {
      logToConsole: true,
      reportToAnalytics: false,
      ...config
    };
    this.initializeObservers();
  }

  private initializeObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    // Observe paint timing
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint observer not supported');
    }

    // Observe largest contentful paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // Observe first input delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const eventEntry = entry as PerformanceEventTiming;
          this.recordMetric('FID', eventEntry.processingStart - eventEntry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Observe layout shifts
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as any;
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value;
            this.recordMetric('CLS', clsValue);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer not supported');
    }
  }

  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = THRESHOLDS[metricName as keyof typeof THRESHOLDS];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  public recordMetric(name: string, value: number) {
    const metric: PerformanceMetric = {
      name,
      value: Math.round(value),
      rating: this.getRating(name, value),
      timestamp: Date.now()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(metric);

    if (this.config.logToConsole) {
      const emoji = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
      console.log(
        `%c${emoji} ${name}: ${metric.value}ms (${metric.rating})`,
        `color: ${metric.rating === 'good' ? 'green' : metric.rating === 'needs-improvement' ? 'orange' : 'red'}`
      );
    }

    if (this.config.onMetric) {
      this.config.onMetric(metric);
    }

    if (this.config.reportToAnalytics) {
      this.reportToAnalytics(metric);
    }
  }

  public measureNavigation() {
    if (typeof window === 'undefined' || !window.performance) return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.recordMetric('TTFB', navigation.responseStart - navigation.fetchStart);
      this.recordMetric('DOMContentLoaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
      this.recordMetric('Load', navigation.loadEventEnd - navigation.fetchStart);
    }
  }

  public measureResourceLoading() {
    if (typeof window === 'undefined' || !window.performance) return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const summary = {
      scripts: { count: 0, totalSize: 0, totalDuration: 0 },
      stylesheets: { count: 0, totalSize: 0, totalDuration: 0 },
      images: { count: 0, totalSize: 0, totalDuration: 0 },
      fonts: { count: 0, totalSize: 0, totalDuration: 0 },
    };

    resources.forEach(resource => {
      const type = this.getResourceType(resource);
      if (type && summary[type]) {
        summary[type].count++;
        summary[type].totalSize += resource.transferSize || 0;
        summary[type].totalDuration += resource.duration;
      }
    });

    if (this.config.logToConsole) {
      console.group('📊 Resource Loading Summary');
      Object.entries(summary).forEach(([type, data]) => {
        if (data.count > 0) {
          console.log(
            `${type}: ${data.count} files, ${(data.totalSize / 1024).toFixed(2)}KB, ${data.totalDuration.toFixed(2)}ms`
          );
        }
      });
      console.groupEnd();
    }

    return summary;
  }

  private getResourceType(resource: PerformanceResourceTiming): 'scripts' | 'stylesheets' | 'images' | 'fonts' | null {
    const url = resource.name;
    if (url.match(/\.(js|mjs)$/)) return 'scripts';
    if (url.match(/\.css$/)) return 'stylesheets';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'images';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'fonts';
    return null;
  }

  public getMetrics() {
    const result: Record<string, PerformanceMetric> = {};
    this.metrics.forEach((values, name) => {
      if (values.length > 0) {
        result[name] = values[values.length - 1];
      }
    });
    return result;
  }

  public clearMetrics() {
    this.metrics.clear();
  }

  private reportToAnalytics(metric: PerformanceMetric) {
    // Example: Report to Google Analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'web_vitals', {
        event_category: 'Performance',
        event_label: metric.name,
        value: metric.value,
        metric_rating: metric.rating,
      });
    }

    // TODO: Add other analytics providers (Segment, Mixpanel, etc.)
  }

  public startMark(markName: string) {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${markName}-start`);
    }
  }

  public endMark(markName: string) {
    if (typeof window !== 'undefined' && window.performance) {
      const startMark = `${markName}-start`;
      const endMark = `${markName}-end`;
      
      performance.mark(endMark);
      performance.measure(markName, startMark, endMark);
      
      const measure = performance.getEntriesByName(markName, 'measure')[0];
      if (measure) {
        this.recordMetric(markName, measure.duration);
      }
      
      // Clean up marks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(markName);
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor({
  logToConsole: process.env.NODE_ENV === 'development',
  reportToAnalytics: process.env.NODE_ENV === 'production',
});

// Custom hooks for React components
export function usePerformanceMark(markName: string) {
  useEffect(() => {
    performanceMonitor.startMark(markName);
    return () => {
      performanceMonitor.endMark(markName);
    };
  }, [markName]);
}

// Utility to measure component render time
export function measureComponentPerformance<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return React.memo((props: P) => {
    usePerformanceMark(`${componentName}-render`);
    return <Component {...props} />;
  });
}

// Initialize Core Web Vitals monitoring
if (typeof window !== 'undefined') {
  // Measure navigation timing after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      performanceMonitor.measureNavigation();
      performanceMonitor.measureResourceLoading();
    }, 0);
  });
}

// Export for use in other parts of the app
export default performanceMonitor;