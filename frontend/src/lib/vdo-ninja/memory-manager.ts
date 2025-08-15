/**
 * VDO.Ninja Memory Manager
 * Manages memory usage and prevents leaks in streaming applications
 */

export interface MemoryConfig {
  maxCacheSize: number;
  maxHistorySize: number;
  cleanupInterval: number;
  enableAutoCleanup: boolean;
  memoryThreshold: number;
  enableWeakRefs: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  size: number;
  ttl?: number;
}

export class MemoryManager {
  private config: MemoryConfig;
  private caches: Map<string, LRUCache<any>> = new Map();
  private cleanupTimer: NodeJS.Timer | null = null;
  private memoryPressureCallbacks: Set<() => void> = new Set();
  private totalMemoryUsage: number = 0;
  
  constructor(config?: Partial<MemoryConfig>) {
    this.config = {
      maxCacheSize: config?.maxCacheSize ?? 100 * 1024 * 1024, // 100MB
      maxHistorySize: config?.maxHistorySize ?? 1000,
      cleanupInterval: config?.cleanupInterval ?? 60000, // 1 minute
      enableAutoCleanup: config?.enableAutoCleanup ?? true,
      memoryThreshold: config?.memoryThreshold ?? 0.8, // 80% of heap
      enableWeakRefs: config?.enableWeakRefs ?? true
    };
    
    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
    
    this.monitorMemoryPressure();
  }
  
  createCache<T>(name: string, maxSize?: number): LRUCache<T> {
    const cache = new LRUCache<T>(maxSize || this.config.maxCacheSize);
    this.caches.set(name, cache);
    return cache;
  }
  
  getCache<T>(name: string): LRUCache<T> | undefined {
    return this.caches.get(name);
  }
  
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }
  
  private performCleanup(): void {
    // Clean up all caches
    for (const cache of this.caches.values()) {
      cache.cleanup();
    }
    
    // Check memory pressure
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.usageRatio > this.config.memoryThreshold) {
      this.handleMemoryPressure();
    }
    
    // Update total memory usage
    this.totalMemoryUsage = memoryUsage.used;
  }
  
  private monitorMemoryPressure(): void {
    if (!('memory' in performance)) return;
    
    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usageRatio > this.config.memoryThreshold) {
          this.handleMemoryPressure();
        }
      }
    };
    
    // Check memory periodically
    setInterval(checkMemory, 10000);
  }
  
  private handleMemoryPressure(): void {
    console.warn('Memory pressure detected, triggering cleanup');
    
    // Aggressive cleanup
    for (const cache of this.caches.values()) {
      cache.clear();
    }
    
    // Notify listeners
    for (const callback of this.memoryPressureCallbacks) {
      try {
        callback();
      } catch (error) {
        console.error('Memory pressure callback error:', error);
      }
    }
    
    // Force garbage collection if available
    if ((globalThis as any).gc) {
      (globalThis as any).gc();
    }
  }
  
  onMemoryPressure(callback: () => void): () => void {
    this.memoryPressureCallbacks.add(callback);
    return () => this.memoryPressureCallbacks.delete(callback);
  }
  
  getMemoryUsage(): {
    used: number;
    limit: number;
    usageRatio: number;
    cacheSize: number;
  } {
    const memory = 'memory' in performance ? (performance as any).memory : null;
    
    let cacheSize = 0;
    for (const cache of this.caches.values()) {
      cacheSize += cache.getSize();
    }
    
    return {
      used: memory?.usedJSHeapSize || 0,
      limit: memory?.jsHeapSizeLimit || 0,
      usageRatio: memory ? memory.usedJSHeapSize / memory.jsHeapSizeLimit : 0,
      cacheSize
    };
  }
  
  clearCache(name: string): void {
    const cache = this.caches.get(name);
    if (cache) {
      cache.clear();
    }
  }
  
  clearAllCaches(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
  
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clearAllCaches();
    this.caches.clear();
    this.memoryPressureCallbacks.clear();
  }
}

// LRU Cache implementation
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private currentSize: number = 0;
  
  constructor(private maxSize: number) {}
  
  set(key: string, value: T, ttl?: number): void {
    const size = this.estimateSize(value);
    
    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.remove(key);
    }
    
    // Evict items if necessary
    while (this.currentSize + size > this.maxSize && this.accessOrder.length > 0) {
      const lru = this.accessOrder[0];
      this.remove(lru);
    }
    
    // Add new entry
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
      size,
      ttl
    };
    
    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.currentSize += size;
  }
  
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.remove(key);
      return undefined;
    }
    
    // Update access info
    entry.accessCount++;
    entry.lastAccess = Date.now();
    
    // Move to end of access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
    
    return entry.data;
  }
  
  has(key: string): boolean {
    if (!this.cache.has(key)) return false;
    
    const entry = this.cache.get(key)!;
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.remove(key);
      return false;
    }
    
    return true;
  }
  
  remove(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.currentSize -= entry.size;
    
    return true;
  }
  
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.currentSize = 0;
  }
  
  cleanup(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      // Remove expired entries
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      this.remove(key);
    }
  }
  
  getSize(): number {
    return this.currentSize;
  }
  
  getCount(): number {
    return this.cache.size;
  }
  
  getStats(): {
    size: number;
    count: number;
    hitRate: number;
    averageAccessCount: number;
  } {
    let totalAccess = 0;
    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
    }
    
    return {
      size: this.currentSize,
      count: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      averageAccessCount: this.cache.size > 0 ? totalAccess / this.cache.size : 0
    };
  }
  
  private estimateSize(value: any): number {
    // Rough estimation of object size
    if (typeof value === 'string') {
      return value.length * 2; // 2 bytes per character
    } else if (typeof value === 'number') {
      return 8;
    } else if (typeof value === 'boolean') {
      return 4;
    } else if (value instanceof ArrayBuffer) {
      return value.byteLength;
    } else if (value instanceof Blob) {
      return value.size;
    } else if (typeof value === 'object' && value !== null) {
      // Rough estimate for objects
      return JSON.stringify(value).length * 2;
    }
    return 100; // Default size
  }
}

// Object pool for reusable objects
export class ObjectPool<T> {
  private pool: T[] = [];
  private inUse: Set<T> = new Set();
  
  constructor(
    private factory: () => T,
    private reset: (obj: T) => void,
    private maxSize: number = 100
  ) {}
  
  acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }
    
    this.inUse.add(obj);
    return obj;
  }
  
  release(obj: T): void {
    if (!this.inUse.has(obj)) return;
    
    this.inUse.delete(obj);
    this.reset(obj);
    
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }
  
  clear(): void {
    this.pool = [];
    this.inUse.clear();
  }
  
  getStats(): {
    poolSize: number;
    inUseCount: number;
    totalCreated: number;
  } {
    return {
      poolSize: this.pool.length,
      inUseCount: this.inUse.size,
      totalCreated: this.pool.length + this.inUse.size
    };
  }
}

// Weak reference cache for large objects
export class WeakCache<K extends object, V> {
  private cache: WeakMap<K, WeakRef<V>> = new WeakMap();
  private registry: FinalizationRegistry<K> | null = null;
  
  constructor() {
    if (typeof FinalizationRegistry !== 'undefined') {
      this.registry = new FinalizationRegistry((key) => {
        // Cleanup when object is garbage collected
        this.cache.delete(key);
      });
    }
  }
  
  set(key: K, value: V): void {
    if (typeof WeakRef === 'undefined') {
      // Fallback to regular storage
      this.cache.set(key, value as any);
      return;
    }
    
    const ref = new WeakRef(value);
    this.cache.set(key, ref);
    
    if (this.registry && typeof value === 'object' && value !== null) {
      this.registry.register(value as any, key);
    }
  }
  
  get(key: K): V | undefined {
    const ref = this.cache.get(key);
    if (!ref) return undefined;
    
    if (ref instanceof WeakRef) {
      const value = ref.deref();
      if (value === undefined) {
        // Object was garbage collected
        this.cache.delete(key);
      }
      return value;
    }
    
    return ref as any;
  }
  
  has(key: K): boolean {
    const ref = this.cache.get(key);
    if (!ref) return false;
    
    if (ref instanceof WeakRef) {
      const value = ref.deref();
      if (value === undefined) {
        this.cache.delete(key);
        return false;
      }
    }
    
    return true;
  }
  
  delete(key: K): boolean {
    return this.cache.delete(key);
  }
}

// Singleton instance
let memoryManager: MemoryManager | null = null;

export function getMemoryManager(config?: Partial<MemoryConfig>): MemoryManager {
  if (!memoryManager) {
    memoryManager = new MemoryManager(config);
  }
  return memoryManager;
}