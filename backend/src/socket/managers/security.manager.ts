import { Socket } from 'socket.io';
import { z } from 'zod';

import {
  defaultSecurityConfig,
  generateAuditId,
  getClientIP,
  IPReputationManager,
  OriginValidator,
  PayloadValidator,
  SecurityAuditLog,
  SecurityConfig,
  SecurityEventType,
  SecurityMetrics,
} from '../../config/socket/security.config.js';
import { SocketWithAuth } from '../../config/socket/socket.config.js';

/**
 * Comprehensive WebSocket Security Manager
 * Handles all security aspects including CORS, rate limiting, validation, and monitoring
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private originValidator: OriginValidator;
  private ipReputationManager: IPReputationManager;
  private payloadValidator: PayloadValidator;
  private auditLogs: SecurityAuditLog[] = [];
  private metrics: SecurityMetrics;
  private activeConnections = new Map<string, SocketWithAuth>();
  private rateLimitViolations = 0;
  private payloadViolations = 0;

  private constructor(config: SecurityConfig = defaultSecurityConfig) {
    this.config = config;
    this.originValidator = new OriginValidator(config.cors.allowedOrigins);
    this.ipReputationManager = new IPReputationManager(config);
    this.payloadValidator = new PayloadValidator(config);
    this.metrics = this.initializeMetrics();

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  static getInstance(config?: SecurityConfig): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager(config);
    }
    return SecurityManager.instance;
  }

  /**
   * Validate incoming connection
   */
  async validateConnection(socket: SocketWithAuth): Promise<boolean> {
    const ip = getClientIP(socket);
    const origin = socket.handshake.headers.origin;
    const userAgent = socket.handshake.headers['user-agent'];

    // Track connection attempt
    this.ipReputationManager.trackConnection(ip, userAgent);

    // Check if IP is blocked
    if (this.ipReputationManager.isBlocked(ip)) {
      this.logSecurityEvent({
        eventType: SecurityEventType.CONNECTION_BLOCKED,
        ip,
        socketId: socket.id,
        message: 'Connection blocked - IP in blocklist',
        severity: 'high',
      });
      return false;
    }

    // Check connection rate limit
    const connectionAllowed = await this.ipReputationManager.checkConnectionLimit(ip);
    if (!connectionAllowed) {
      this.logSecurityEvent({
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        ip,
        socketId: socket.id,
        message: 'Connection rate limit exceeded',
        severity: 'medium',
      });
      this.ipReputationManager.reportSuspiciousActivity(ip);
      return false;
    }

    // Validate origin
    if (!this.originValidator.isValidOrigin(origin)) {
      this.logSecurityEvent({
        eventType: SecurityEventType.INVALID_ORIGIN,
        ip,
        socketId: socket.id,
        message: `Invalid origin: ${origin}`,
        severity: 'high',
        metadata: { origin },
      });
      this.ipReputationManager.reportSuspiciousActivity(ip);
      return false;
    }

    // Check anonymous connection limits
    if (!socket.userId && this.config.security.allowAnonymous) {
      const anonymousCount = Array.from(this.activeConnections.values()).filter(
        s => !s.userId,
      ).length;

      if (anonymousCount >= this.config.security.maxAnonymousConnections) {
        this.logSecurityEvent({
          eventType: SecurityEventType.CONNECTION_BLOCKED,
          ip,
          socketId: socket.id,
          message: 'Anonymous connection limit reached',
          severity: 'medium',
        });
        return false;
      }
    }

    // Log successful connection
    this.logSecurityEvent({
      eventType: SecurityEventType.CONNECTION_ATTEMPT,
      ip,
      socketId: socket.id,
      userId: socket.userId,
      message: 'Connection established',
      severity: 'low',
      metadata: { origin, userAgent },
    });

    // Track active connection
    this.activeConnections.set(socket.id, socket);
    this.updateMetrics();

    return true;
  }

  /**
   * Validate incoming event and payload
   */
  async validateEvent(socket: SocketWithAuth, eventName: string, data: any): Promise<boolean> {
    const ip = getClientIP(socket);
    const identifier = socket.userId || ip;

    if (process.env.SOCKET_DEBUG === 'true') {
      console.log(`[SECURITY DEBUG] validateEvent for ${eventName}:`);
      console.log(`[SECURITY DEBUG] - socket.id: ${socket.id}`);
      console.log(`[SECURITY DEBUG] - socket.userId: ${socket.userId}`);
      console.log(`[SECURITY DEBUG] - socket.username: ${socket.username}`);
      console.log(`[SECURITY DEBUG] - socket.role: ${socket.role}`);
    }

    // Check event rate limit
    const eventAllowed = await this.ipReputationManager.checkEventLimit(identifier);
    if (!eventAllowed) {
      this.rateLimitViolations++;
      if (process.env.SOCKET_DEBUG === 'true') {
        console.log(`[SECURITY] Event rate limit exceeded for ${eventName} from ${identifier}`);
      }
      this.logSecurityEvent({
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        ip,
        socketId: socket.id,
        userId: socket.userId,
        eventName,
        message: 'Event rate limit exceeded',
        severity: 'medium',
      });
      return false;
    }

    // Check if event type is allowed
    if (!this.payloadValidator.validateEventType(eventName)) {
      if (process.env.SOCKET_DEBUG === 'true') {
        console.log(`[SECURITY] Unauthorized event type: ${eventName}`);
      }
      this.logSecurityEvent({
        eventType: SecurityEventType.UNAUTHORIZED_EVENT,
        ip,
        socketId: socket.id,
        userId: socket.userId,
        eventName,
        message: `Unauthorized event type: ${eventName}`,
        severity: 'high',
      });
      this.ipReputationManager.reportSuspiciousActivity(ip);
      return false;
    }

    // Check authentication requirement
    if (this.payloadValidator.requiresAuthentication(eventName) && !socket.userId) {
      if (process.env.SOCKET_DEBUG === 'true') {
        console.log(
          `[SECURITY] Authentication required for event: ${eventName}, but socket.userId is ${socket.userId}`,
        );
      }
      this.logSecurityEvent({
        eventType: SecurityEventType.AUTHENTICATION_FAILURE,
        ip,
        socketId: socket.id,
        eventName,
        message: `Authentication required for event: ${eventName}`,
        severity: 'medium',
      });
      return false;
    }

    // Validate payload size
    if (!this.payloadValidator.validatePayloadSize(data)) {
      this.payloadViolations++;
      this.logSecurityEvent({
        eventType: SecurityEventType.PAYLOAD_TOO_LARGE,
        ip,
        socketId: socket.id,
        userId: socket.userId,
        eventName,
        message: 'Payload size exceeds limit',
        severity: 'medium',
        metadata: { payloadSize: Buffer.byteLength(JSON.stringify(data), 'utf8') },
      });
      return false;
    }

    // Validate message content if it's a chat message
    if (eventName === 'chat:send-message' && data && data.content) {
      if (!this.payloadValidator.validateMessageLength(data.content)) {
        this.logSecurityEvent({
          eventType: SecurityEventType.VALIDATION_ERROR,
          ip,
          socketId: socket.id,
          userId: socket.userId,
          eventName,
          message: 'Message length exceeds limit',
          severity: 'low',
        });
        return false;
      }

      // Sanitize message content
      data.content = this.payloadValidator.sanitizeMessage(data.content);
    }

    if (process.env.SOCKET_DEBUG === 'true') {
      console.log(`[SECURITY] Event ${eventName} passed all security checks`);
    }
    return true;
  }

  /**
   * Handle message rate limiting
   */
  async validateMessage(socket: SocketWithAuth): Promise<boolean> {
    const ip = getClientIP(socket);
    const identifier = socket.userId || ip;

    const messageAllowed = await this.ipReputationManager.checkMessageLimit(identifier);
    if (!messageAllowed) {
      this.rateLimitViolations++;
      this.logSecurityEvent({
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        ip,
        socketId: socket.id,
        userId: socket.userId,
        message: 'Message rate limit exceeded',
        severity: 'medium',
      });
      return false;
    }

    return true;
  }

  /**
   * Handle connection disconnection
   */
  handleDisconnection(socket: SocketWithAuth): void {
    const ip = getClientIP(socket);

    this.activeConnections.delete(socket.id);
    this.updateMetrics();

    this.logSecurityEvent({
      eventType: SecurityEventType.CONNECTION_ATTEMPT,
      ip,
      socketId: socket.id,
      userId: socket.userId,
      message: 'Connection closed',
      severity: 'low',
    });
  }

  /**
   * Report suspicious activity
   */
  reportSuspiciousActivity(socket: SocketWithAuth, reason: string): void {
    const ip = getClientIP(socket);

    this.ipReputationManager.reportSuspiciousActivity(ip);

    this.logSecurityEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      ip,
      socketId: socket.id,
      userId: socket.userId,
      message: reason,
      severity: 'high',
    });
  }

  /**
   * Block IP address
   */
  blockIP(ip: string, reason: string): void {
    this.ipReputationManager.blockIP(ip, reason);

    // Disconnect all sockets from this IP
    for (const [socketId, socket] of this.activeConnections.entries()) {
      if (getClientIP(socket) === ip) {
        socket.disconnect(true);
        this.activeConnections.delete(socketId);
      }
    }

    this.logSecurityEvent({
      eventType: SecurityEventType.IP_BLOCKED,
      ip,
      message: reason,
      severity: 'critical',
    });

    this.updateMetrics();
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip: string): void {
    this.ipReputationManager.unblockIP(ip);

    this.logSecurityEvent({
      eventType: SecurityEventType.IP_BLOCKED,
      ip,
      message: 'IP unblocked',
      severity: 'low',
    });
  }

  /**
   * Get security metrics
   */
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get audit logs
   */
  getAuditLogs(limit = 100): SecurityAuditLog[] {
    return this.auditLogs.slice(-limit);
  }

  /**
   * Get audit logs by criteria
   */
  getAuditLogsByCriteria(criteria: {
    eventType?: SecurityEventType;
    ip?: string;
    userId?: string;
    severity?: string;
    since?: Date;
  }): SecurityAuditLog[] {
    return this.auditLogs.filter(log => {
      if (criteria.eventType && log.eventType !== criteria.eventType) return false;
      if (criteria.ip && log.ip !== criteria.ip) return false;
      if (criteria.userId && log.userId !== criteria.userId) return false;
      if (criteria.severity && log.severity !== criteria.severity) return false;
      if (criteria.since && log.timestamp < criteria.since) return false;
      return true;
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update origin validator if CORS config changed
    if (newConfig.cors?.allowedOrigins) {
      this.originValidator = new OriginValidator(newConfig.cors.allowedOrigins);
    }

    // Update other components as needed
    this.ipReputationManager = new IPReputationManager(this.config);
    this.payloadValidator = new PayloadValidator(this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Check if monitoring alerts should be triggered
   */
  checkAlerts(): void {
    const thresholds = this.config.monitoring.alertThresholds;

    if (this.metrics.activeConnections > thresholds.highConnectionCount) {
      console.warn(
        `HIGH CONNECTION COUNT ALERT: ${this.metrics.activeConnections} active connections`,
      );
    }

    if (this.rateLimitViolations > thresholds.highMessageRate) {
      console.warn(`HIGH RATE LIMIT VIOLATIONS: ${this.rateLimitViolations} violations`);
    }

    const errorRate = this.metrics.blockedAttempts / Math.max(this.metrics.totalConnections, 1);
    if (errorRate > thresholds.errorRate) {
      console.warn(`HIGH ERROR RATE ALERT: ${(errorRate * 100).toFixed(2)}% error rate`);
    }
  }

  /**
   * Private helper methods
   */
  private logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): void {
    if (!this.config.security.enableAuditLogging) return;

    const auditLog: SecurityAuditLog = {
      id: generateAuditId(),
      timestamp: new Date(),
      ...event,
    };

    this.auditLogs.push(auditLog);

    // Keep only last 10000 logs to prevent memory issues
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }

    // Log critical events to console
    if (event.severity === 'critical' || event.severity === 'high') {
      console.warn(`SECURITY EVENT [${event.severity.toUpperCase()}]:`, event.message, {
        ip: event.ip,
        eventType: event.eventType,
        metadata: event.metadata,
      });
    }
  }

  private initializeMetrics(): SecurityMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      anonymousConnections: 0,
      authenticatedConnections: 0,
      blockedAttempts: 0,
      suspiciousActivities: 0,
      rateLimitViolations: 0,
      payloadViolations: 0,
      lastUpdated: new Date(),
    };
  }

  private updateMetrics(): void {
    const activeConnections = Array.from(this.activeConnections.values());
    const anonymousCount = activeConnections.filter(s => !s.userId).length;
    const authenticatedCount = activeConnections.filter(s => s.userId).length;

    this.metrics = {
      totalConnections: this.activeConnections.size,
      activeConnections: this.activeConnections.size,
      anonymousConnections: anonymousCount,
      authenticatedConnections: authenticatedCount,
      blockedAttempts: this.ipReputationManager.getMetrics().blockedAttempts,
      suspiciousActivities: this.ipReputationManager.getMetrics().suspiciousActivities,
      rateLimitViolations: this.rateLimitViolations,
      payloadViolations: this.payloadViolations,
      lastUpdated: new Date(),
    };

    // Check for alerts
    if (this.config.monitoring.enableMetrics) {
      this.checkAlerts();
    }
  }

  private cleanup(): void {
    // Clean up IP reputation data
    this.ipReputationManager.cleanup();

    // Reset violation counters periodically
    this.rateLimitViolations = Math.max(0, this.rateLimitViolations - 10);
    this.payloadViolations = Math.max(0, this.payloadViolations - 10);

    // Update metrics
    this.updateMetrics();
  }
}

/**
 * Security middleware factory
 */
export function createSecurityMiddleware(securityManager: SecurityManager) {
  return async (socket: SocketWithAuth, next: (err?: Error) => void) => {
    try {
      const isValid = await securityManager.validateConnection(socket);

      if (!isValid) {
        const error = new Error('Connection rejected by security policy');
        (error as any).type = 'SecurityRejection';
        return next(error);
      }

      // Set up disconnection handler
      socket.on('disconnect', () => {
        securityManager.handleDisconnection(socket);
      });

      next();
    } catch (error) {
      console.error('Security middleware error:', error);
      next(new Error('Security validation failed'));
    }
  };
}

/**
 * Event validation middleware factory
 */
export function createEventValidationWrapper(securityManager: SecurityManager) {
  return function wrapHandler<T>(
    eventName: string,
    handler: (socket: SocketWithAuth, data: T) => Promise<void> | void,
  ) {
    return async function (this: SocketWithAuth, data: T) {
      try {
        // In Socket.IO, 'this' is bound to the socket instance
        const socket = this;

        // Lightweight tracer: detect missing payload for stream:leave
        if (
          (eventName === 'stream:leave' || eventName === 'stream:join') &&
          (!data || typeof data !== 'object' || !('streamId' in (data as any)))
        ) {
          // Concise trace to identify the source socket/client
          // Not gated by SOCKET_DEBUG to ensure visibility when investigating
          console.warn(`[TRACE] ${eventName} missing payload`, {
            socketId: socket.id,
            user: socket.username,
            role: socket.role,
            typeofData: typeof data,
          });
        }

        if (process.env.SOCKET_DEBUG === 'true') {
          console.log(`[WRAPPER DEBUG] Received event ${eventName} with socket:`);
          console.log(`[WRAPPER DEBUG] - socket.id: ${socket.id}`);
          console.log(`[WRAPPER DEBUG] - socket.userId: ${socket.userId}`);
          console.log(`[WRAPPER DEBUG] - socket.username: ${socket.username}`);
          console.log(`[WRAPPER DEBUG] - socket.role: ${socket.role}`);
        }

        const isValid = await securityManager.validateEvent(socket, eventName, data);

        if (!isValid) {
          // Check if socket.emit exists before trying to use it
          if (socket && typeof socket.emit === 'function') {
            socket.emit('error', {
              message: 'Event rejected by security policy',
              event: eventName,
            });
          }
          return;
        }

        if (process.env.SOCKET_DEBUG === 'true') {
          console.log(`[WRAPPER DEBUG] About to call handler for ${eventName} with same socket:`);
          console.log(`[WRAPPER DEBUG] - handler socket.id: ${socket.id}`);
          console.log(`[WRAPPER DEBUG] - handler socket.userId: ${socket.userId}`);
        }

        await handler(socket, data);
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        console.error(`Event validation error for ${eventName}:`, errorMessage, error);

        // In Socket.IO, 'this' is bound to the socket instance
        const socket = this;

        // Check if socket.emit exists before trying to use it
        if (socket && typeof socket.emit === 'function') {
          socket.emit('error', {
            message: 'Event processing failed',
            event: eventName,
          });
        }

        // Only report if socket is valid
        if (socket) {
          securityManager.reportSuspiciousActivity(socket, `Event processing error: ${eventName}`);
        }
      }
    };
  };
}
