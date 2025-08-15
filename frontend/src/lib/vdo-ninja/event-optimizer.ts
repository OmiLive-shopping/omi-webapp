/**
 * VDO.Ninja Event Optimizer
 * Batching, debouncing, and throttling for optimal performance
 */

export interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number;
  flushOnSize?: boolean;
  preserveOrder?: boolean;
}

export interface DebounceConfig {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export interface ThrottleConfig {
  interval: number;
  leading?: boolean;
  trailing?: boolean;
}

export class EventBatcher<T> {
  private batch: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastFlush: number = Date.now();
  
  constructor(
    private processor: (batch: T[]) => void | Promise<void>,
    private config: BatchConfig
  ) {}
  
  add(item: T): void {
    this.batch.push(item);
    
    // Flush if batch size reached
    if (this.config.flushOnSize && this.batch.length >= this.config.maxBatchSize) {
      this.flush();
      return;
    }
    
    // Start timer if not already running
    if (!this.timer) {
      const timeElapsed = Date.now() - this.lastFlush;
      const remainingTime = Math.max(0, this.config.maxWaitTime - timeElapsed);
      
      this.timer = setTimeout(() => this.flush(), remainingTime);
    }
  }
  
  async flush(): Promise<void> {
    if (this.batch.length === 0) return;
    
    // Clear timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    // Get batch and reset
    const batchToProcess = this.config.preserveOrder 
      ? [...this.batch]
      : this.batch.splice(0, this.config.maxBatchSize);
    
    if (!this.config.preserveOrder && this.batch.length > 0) {
      // Schedule next batch
      this.timer = setTimeout(() => this.flush(), this.config.maxWaitTime);
    } else {
      this.batch = [];
    }
    
    this.lastFlush = Date.now();
    
    // Process batch
    try {
      await this.processor(batchToProcess);
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }
  
  size(): number {
    return this.batch.length;
  }
  
  clear(): void {
    this.batch = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
  
  destroy(): void {
    this.clear();
  }
}

export class EventDebouncer<T extends any[]> {
  private timer: NodeJS.Timeout | null = null;
  private lastCallTime: number = 0;
  private lastArgs: T | null = null;
  private leadingExecuted: boolean = false;
  
  constructor(
    private fn: (...args: T) => void | Promise<void>,
    private config: DebounceConfig
  ) {}
  
  execute(...args: T): void {
    const now = Date.now();
    this.lastArgs = args;
    
    // Handle leading edge
    if (this.config.leading && !this.timer && !this.leadingExecuted) {
      this.fn(...args);
      this.leadingExecuted = true;
    }
    
    // Clear existing timer
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    // Check max wait
    if (this.config.maxWait) {
      const timeSinceLastCall = now - this.lastCallTime;
      if (timeSinceLastCall >= this.config.maxWait) {
        this.fn(...args);
        this.lastCallTime = now;
        this.leadingExecuted = false;
        return;
      }
    }
    
    // Set new timer
    this.timer = setTimeout(() => {
      if (this.config.trailing !== false && this.lastArgs) {
        this.fn(...this.lastArgs);
      }
      this.timer = null;
      this.lastArgs = null;
      this.leadingExecuted = false;
    }, this.config.delay);
    
    if (this.lastCallTime === 0) {
      this.lastCallTime = now;
    }
  }
  
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.lastArgs = null;
    this.leadingExecuted = false;
  }
  
  flush(): void {
    if (this.timer && this.lastArgs) {
      clearTimeout(this.timer);
      this.fn(...this.lastArgs);
      this.timer = null;
      this.lastArgs = null;
      this.leadingExecuted = false;
    }
  }
  
  destroy(): void {
    this.cancel();
  }
}

export class EventThrottler<T extends any[]> {
  private lastCallTime: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private lastArgs: T | null = null;
  
  constructor(
    private fn: (...args: T) => void | Promise<void>,
    private config: ThrottleConfig
  ) {}
  
  execute(...args: T): void {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    // Execute immediately if enough time has passed
    if (timeSinceLastCall >= this.config.interval) {
      if (this.config.leading !== false) {
        this.fn(...args);
        this.lastCallTime = now;
      }
    } else {
      // Store args for trailing call
      this.lastArgs = args;
      
      // Schedule trailing call if not already scheduled
      if (!this.timer && this.config.trailing !== false) {
        const remainingTime = this.config.interval - timeSinceLastCall;
        this.timer = setTimeout(() => {
          if (this.lastArgs) {
            this.fn(...this.lastArgs);
            this.lastCallTime = Date.now();
            this.lastArgs = null;
          }
          this.timer = null;
        }, remainingTime);
      }
    }
  }
  
  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.lastArgs = null;
  }
  
  destroy(): void {
    this.cancel();
  }
}

// Event queue with priority
export interface QueuedEvent<T> {
  id: string;
  data: T;
  priority: number;
  timestamp: number;
  retries?: number;
}

export class PriorityEventQueue<T> {
  private queue: QueuedEvent<T>[] = [];
  private processing: boolean = false;
  private idCounter: number = 0;
  
  constructor(
    private processor: (event: QueuedEvent<T>) => Promise<boolean>,
    private maxSize: number = 1000,
    private maxRetries: number = 3
  ) {}
  
  enqueue(data: T, priority: number = 0): string {
    const id = `event-${++this.idCounter}`;
    const event: QueuedEvent<T> = {
      id,
      data,
      priority,
      timestamp: Date.now(),
      retries: 0
    };
    
    // Add to queue
    this.queue.push(event);
    
    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);
    
    // Trim queue if too large
    if (this.queue.length > this.maxSize) {
      this.queue = this.queue.slice(0, this.maxSize);
    }
    
    // Start processing if not already running
    if (!this.processing) {
      this.process();
    }
    
    return id;
  }
  
  private async process(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const event = this.queue.shift()!;
    
    try {
      const success = await this.processor(event);
      
      if (!success && event.retries! < this.maxRetries) {
        // Re-queue with lower priority
        event.retries = (event.retries || 0) + 1;
        event.priority = Math.max(0, event.priority - 1);
        this.queue.push(event);
        this.queue.sort((a, b) => b.priority - a.priority);
      }
    } catch (error) {
      console.error('Event processing error:', error);
      
      // Re-queue on error if retries available
      if (event.retries! < this.maxRetries) {
        event.retries = (event.retries || 0) + 1;
        event.priority = Math.max(0, event.priority - 1);
        this.queue.push(event);
        this.queue.sort((a, b) => b.priority - a.priority);
      }
    }
    
    // Process next event
    if (this.queue.length > 0) {
      // Use setImmediate or setTimeout to avoid blocking
      setTimeout(() => this.process(), 0);
    } else {
      this.processing = false;
    }
  }
  
  size(): number {
    return this.queue.length;
  }
  
  clear(): void {
    this.queue = [];
    this.processing = false;
  }
  
  remove(id: string): boolean {
    const index = this.queue.findIndex(e => e.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }
  
  getStats(): {
    size: number;
    processing: boolean;
    oldestEvent: number | null;
    averagePriority: number;
  } {
    const now = Date.now();
    return {
      size: this.queue.length,
      processing: this.processing,
      oldestEvent: this.queue.length > 0 
        ? now - Math.min(...this.queue.map(e => e.timestamp))
        : null,
      averagePriority: this.queue.length > 0
        ? this.queue.reduce((sum, e) => sum + e.priority, 0) / this.queue.length
        : 0
    };
  }
}

// Request Animation Frame queue for smooth updates
export class RAFQueue {
  private queue: (() => void)[] = [];
  private rafId: number | null = null;
  private processing: boolean = false;
  
  enqueue(fn: () => void): void {
    this.queue.push(fn);
    
    if (!this.processing) {
      this.process();
    }
  }
  
  private process = (): void => {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    
    // Process a batch of updates in a single frame
    const batch = this.queue.splice(0, 10); // Process up to 10 items per frame
    
    this.rafId = requestAnimationFrame(() => {
      batch.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.error('RAF queue error:', error);
        }
      });
      
      // Continue processing if more items
      if (this.queue.length > 0) {
        this.process();
      } else {
        this.processing = false;
      }
    });
  };
  
  clear(): void {
    this.queue = [];
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.processing = false;
  }
}

// Idle callback queue for non-critical updates
export class IdleQueue {
  private queue: (() => void)[] = [];
  private idleId: number | null = null;
  private processing: boolean = false;
  
  enqueue(fn: () => void): void {
    this.queue.push(fn);
    
    if (!this.processing && 'requestIdleCallback' in window) {
      this.process();
    } else if (!this.processing) {
      // Fallback to setTimeout
      setTimeout(() => this.process(), 0);
    }
  }
  
  private process = (): void => {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    
    if ('requestIdleCallback' in window) {
      this.idleId = requestIdleCallback((deadline) => {
        while (deadline.timeRemaining() > 0 && this.queue.length > 0) {
          const fn = this.queue.shift()!;
          try {
            fn();
          } catch (error) {
            console.error('Idle queue error:', error);
          }
        }
        
        if (this.queue.length > 0) {
          this.process();
        } else {
          this.processing = false;
        }
      });
    } else {
      // Fallback implementation
      const fn = this.queue.shift()!;
      try {
        fn();
      } catch (error) {
        console.error('Idle queue error:', error);
      }
      
      if (this.queue.length > 0) {
        setTimeout(() => this.process(), 0);
      } else {
        this.processing = false;
      }
    }
  };
  
  clear(): void {
    this.queue = [];
    if (this.idleId !== null && 'cancelIdleCallback' in window) {
      (window as any).cancelIdleCallback(this.idleId);
      this.idleId = null;
    }
    this.processing = false;
  }
}

// Utility functions for creating optimized event handlers
export function createBatchedHandler<T>(
  handler: (batch: T[]) => void,
  options?: Partial<BatchConfig>
): (item: T) => void {
  const batcher = new EventBatcher(handler, {
    maxBatchSize: options?.maxBatchSize ?? 10,
    maxWaitTime: options?.maxWaitTime ?? 100,
    flushOnSize: options?.flushOnSize ?? true,
    preserveOrder: options?.preserveOrder ?? true
  });
  
  return (item: T) => batcher.add(item);
}

export function createDebouncedHandler<T extends any[]>(
  handler: (...args: T) => void,
  delay: number,
  options?: Partial<DebounceConfig>
): (...args: T) => void {
  const debouncer = new EventDebouncer(handler, {
    delay,
    leading: options?.leading,
    trailing: options?.trailing ?? true,
    maxWait: options?.maxWait
  });
  
  return (...args: T) => debouncer.execute(...args);
}

export function createThrottledHandler<T extends any[]>(
  handler: (...args: T) => void,
  interval: number,
  options?: Partial<ThrottleConfig>
): (...args: T) => void {
  const throttler = new EventThrottler(handler, {
    interval,
    leading: options?.leading ?? true,
    trailing: options?.trailing ?? true
  });
  
  return (...args: T) => throttler.execute(...args);
}