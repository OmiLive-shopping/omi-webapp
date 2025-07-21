import { createClient, RedisClientType } from 'redis';

import { env } from './env-config';

export class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType;
  private isConnected = false;

  private constructor() {
    this.client = createClient({
      url: env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: retries => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('error', err => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('Redis Client Ready');
      this.isConnected = true;
    });

    this.client.on('end', () => {
      console.log('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
        // Don't throw - allow app to run without Redis (fallback to memory store)
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  getClient(): RedisClientType | null {
    return this.isConnected ? this.client : null;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // Utility method for rate limiter
  async incrementAndExpire(key: string, windowMs: number): Promise<number> {
    if (!this.isConnected) {
      throw new Error('Redis not connected');
    }

    const multi = this.client.multi();
    multi.incr(key);
    multi.expire(key, Math.ceil(windowMs / 1000));

    const results = await multi.exec();
    return results[0] as number;
  }
}
