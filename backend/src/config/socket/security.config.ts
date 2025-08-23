import { z } from 'zod';
import { Socket } from 'socket.io';
import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * WebSocket Security Configuration
 * Comprehensive security settings for Socket.IO server hardening
 */

// Security configuration schema
export const securityConfigSchema = z.object({
  cors: z.object({
    allowedOrigins: z.array(z.string().url()),
    allowCredentials: z.boolean().default(true),
    allowedMethods: z.array(z.string()).default(['GET', 'POST']),
    allowedHeaders: z.array(z.string()).default(['Authorization', 'Content-Type']),
  }),
  
  rateLimiting: z.object({
    // Connection rate limiting per IP
    connectionLimit: z.object({
      maxConnections: z.number().min(1).default(50),
      windowMs: z.number().min(1000).default(60000), // 1 minute
    }),
    
    // Message rate limiting per user
    messageLimit: z.object({
      maxMessages: z.number().min(1).default(100),
      windowMs: z.number().min(1000).default(60000), // 1 minute
    }),
    
    // Event rate limiting per connection
    eventLimit: z.object({
      maxEvents: z.number().min(1).default(1000),
      windowMs: z.number().min(1000).default(60000), // 1 minute
    }),
  }),
  
  validation: z.object({
    maxPayloadSize: z.number().min(1).default(1024 * 1024), // 1MB
    maxMessageLength: z.number().min(1).default(10000), // 10KB text messages
    allowedEventTypes: z.array(z.string()).optional(),
    requireAuthentication: z.array(z.string()).default([]), // Events requiring auth
  }),
  
  security: z.object({
    allowAnonymous: z.boolean().default(true),
    maxAnonymousConnections: z.number().min(0).default(1000),
    suspiciousActivityThreshold: z.number().min(1).default(10),
    blockSuspiciousIps: z.boolean().default(true),
    enableAuditLogging: z.boolean().default(true),
  }),
  
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    enableHealthChecks: z.boolean().default(true),
    alertThresholds: z.object({
      highConnectionCount: z.number().min(1).default(1000),
      highMessageRate: z.number().min(1).default(10000),
      errorRate: z.number().min(0).max(1).default(0.1), // 10%
    }),
  }),
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  cors: {
    allowedOrigins: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    allowCredentials: true,
    allowedMethods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  },
  
  rateLimiting: {
    connectionLimit: {
      maxConnections: 50,
      windowMs: 60000,
    },
    messageLimit: {
      maxMessages: 100,
      windowMs: 60000,
    },
    eventLimit: {
      maxEvents: 1000,
      windowMs: 60000,
    },
  },
  
  validation: {
    maxPayloadSize: 1024 * 1024, // 1MB
    maxMessageLength: 10000, // 10KB
    requireAuthentication: [
      'stream:start',
      'stream:end',
      'chat:moderate-user',
      'chat:delete-message',
      'chat:pin-message',
      'chat:slowmode',
    ],
  },
  
  security: {
    allowAnonymous: true,
    maxAnonymousConnections: 1000,
    suspiciousActivityThreshold: 10,
    blockSuspiciousIps: true,
    enableAuditLogging: true,
  },
  
  monitoring: {
    enableMetrics: true,
    enableHealthChecks: true,
    alertThresholds: {
      highConnectionCount: 1000,
      highMessageRate: 10000,
      errorRate: 0.1,
    },
  },
};

/**
 * IP-based connection tracking for security monitoring
 */
export interface ConnectionInfo {
  ip: string;
  connectionCount: number;
  firstConnection: Date;
  lastConnection: Date;
  suspiciousActivity: number;
  blocked: boolean;
  userAgent?: string;
  country?: string;
}

/**
 * Security metrics for monitoring
 */
export interface SecurityMetrics {
  totalConnections: number;
  activeConnections: number;
  anonymousConnections: number;
  authenticatedConnections: number;
  blockedAttempts: number;
  suspiciousActivities: number;
  rateLimitViolations: number;
  payloadViolations: number;
  lastUpdated: Date;
}

/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
  CONNECTION_ATTEMPT = 'CONNECTION_ATTEMPT',
  CONNECTION_BLOCKED = 'CONNECTION_BLOCKED',
  AUTHENTICATION_SUCCESS = 'AUTHENTICATION_SUCCESS',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  INVALID_ORIGIN = 'INVALID_ORIGIN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  IP_BLOCKED = 'IP_BLOCKED',
  UNAUTHORIZED_EVENT = 'UNAUTHORIZED_EVENT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
  id: string;
  timestamp: Date;
  eventType: SecurityEventType;
  ip: string;
  socketId?: string;
  userId?: string;
  eventName?: string;
  message: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Origin validation utility
 */
export class OriginValidator {
  private allowedOrigins: Set<string>;
  private allowWildcard: boolean;

  constructor(origins: string[]) {
    this.allowedOrigins = new Set(origins);
    this.allowWildcard = origins.includes('*');
  }

  isValidOrigin(origin?: string): boolean {
    if (!origin) return false;
    if (this.allowWildcard) return true;
    
    // Check exact match
    if (this.allowedOrigins.has(origin)) return true;
    
    // Check for localhost patterns in development
    if (process.env.NODE_ENV === 'development') {
      const localhostPattern = /^https?:\/\/localhost(:\d+)?$/;
      if (localhostPattern.test(origin)) return true;
    }
    
    return false;
  }

  addOrigin(origin: string): void {
    this.allowedOrigins.add(origin);
  }

  removeOrigin(origin: string): void {
    this.allowedOrigins.delete(origin);
  }

  getOrigins(): string[] {
    return Array.from(this.allowedOrigins);
  }
}

/**
 * IP blocking and reputation management
 */
export class IPReputationManager {
  private connections = new Map<string, ConnectionInfo>();
  private blockedIPs = new Set<string>();
  private rateLimiters = new Map<string, RateLimiterMemory>();
  
  constructor(private config: SecurityConfig) {
    // Initialize rate limiters
    this.rateLimiters.set('connection', new RateLimiterMemory({
      points: config.rateLimiting.connectionLimit.maxConnections,
      duration: config.rateLimiting.connectionLimit.windowMs / 1000,
    }));
    
    this.rateLimiters.set('message', new RateLimiterMemory({
      points: config.rateLimiting.messageLimit.maxMessages,
      duration: config.rateLimiting.messageLimit.windowMs / 1000,
    }));
    
    this.rateLimiters.set('event', new RateLimiterMemory({
      points: config.rateLimiting.eventLimit.maxEvents,
      duration: config.rateLimiting.eventLimit.windowMs / 1000,
    }));
  }

  async checkConnectionLimit(ip: string): Promise<boolean> {
    if (this.blockedIPs.has(ip)) return false;
    
    try {
      await this.rateLimiters.get('connection')!.consume(ip);
      return true;
    } catch (rejRes) {
      return false;
    }
  }

  async checkMessageLimit(identifier: string): Promise<boolean> {
    try {
      await this.rateLimiters.get('message')!.consume(identifier);
      return true;
    } catch (rejRes) {
      return false;
    }
  }

  async checkEventLimit(identifier: string): Promise<boolean> {
    try {
      await this.rateLimiters.get('event')!.consume(identifier);
      return true;
    } catch (rejRes) {
      return false;
    }
  }

  trackConnection(ip: string, userAgent?: string): void {
    const existing = this.connections.get(ip);
    const now = new Date();
    
    if (existing) {
      existing.connectionCount++;
      existing.lastConnection = now;
    } else {
      this.connections.set(ip, {
        ip,
        connectionCount: 1,
        firstConnection: now,
        lastConnection: now,
        suspiciousActivity: 0,
        blocked: false,
        userAgent,
      });
    }
  }

  reportSuspiciousActivity(ip: string): void {
    const connection = this.connections.get(ip);
    if (connection) {
      connection.suspiciousActivity++;
      
      if (connection.suspiciousActivity >= this.config.security.suspiciousActivityThreshold) {
        this.blockIP(ip, 'Suspicious activity threshold exceeded');
      }
    }
  }

  blockIP(ip: string, reason: string): void {
    this.blockedIPs.add(ip);
    const connection = this.connections.get(ip);
    if (connection) {
      connection.blocked = true;
    }
    console.warn(`Blocked IP ${ip}: ${reason}`);
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    const connection = this.connections.get(ip);
    if (connection) {
      connection.blocked = false;
    }
  }

  isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  getConnectionInfo(ip: string): ConnectionInfo | undefined {
    return this.connections.get(ip);
  }

  getMetrics(): SecurityMetrics {
    const total = this.connections.size;
    const blocked = Array.from(this.connections.values()).filter(c => c.blocked).length;
    const suspicious = Array.from(this.connections.values())
      .reduce((sum, c) => sum + c.suspiciousActivity, 0);
    
    return {
      totalConnections: total,
      activeConnections: total - blocked,
      anonymousConnections: 0, // Will be updated by the security manager
      authenticatedConnections: 0, // Will be updated by the security manager
      blockedAttempts: blocked,
      suspiciousActivities: suspicious,
      rateLimitViolations: 0, // Tracked separately
      payloadViolations: 0, // Tracked separately
      lastUpdated: new Date(),
    };
  }

  cleanup(): void {
    // Remove old connection records (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [ip, connection] of this.connections.entries()) {
      if (connection.lastConnection < oneDayAgo) {
        this.connections.delete(ip);
        this.blockedIPs.delete(ip);
      }
    }
  }
}

/**
 * Payload validation utilities
 */
export class PayloadValidator {
  constructor(private config: SecurityConfig) {}

  validatePayloadSize(data: any): boolean {
    const size = Buffer.byteLength(JSON.stringify(data), 'utf8');
    return size <= this.config.validation.maxPayloadSize;
  }

  validateMessageLength(message: string): boolean {
    return message.length <= this.config.validation.maxMessageLength;
  }

  validateEventType(eventType: string): boolean {
    if (!this.config.validation.allowedEventTypes) return true;
    return this.config.validation.allowedEventTypes.includes(eventType);
  }

  requiresAuthentication(eventType: string): boolean {
    return this.config.validation.requireAuthentication.includes(eventType);
  }

  sanitizeMessage(message: string): string {
    // Remove potentially dangerous content
    return message
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }
}

/**
 * Get client IP address from socket
 */
export function getClientIP(socket: Socket): string {
  // Safety check for handshake object
  if (!socket?.handshake) {
    return 'unknown';
  }
  
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = socket.handshake.headers?.['x-forwarded-for'];
  if (forwarded) {
    // Take the first IP if there are multiple
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  
  // Check for real IP (CloudFlare, etc.)
  const realIP = socket.handshake.headers?.['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP;
  }
  
  // Fallback to socket address
  return socket.handshake.address || 'unknown';
}

/**
 * Generate unique audit log ID
 */
export function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
