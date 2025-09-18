import { Request, Response } from 'express';
import { z } from 'zod';

import { SecurityEventType } from '../../config/socket/security.config.js';
import { SecurityManager } from '../managers/security.manager.js';

/**
 * Security monitoring and management controller
 * Provides API endpoints for security dashboard and management
 */
export class SecurityController {
  private securityManager: SecurityManager;

  constructor() {
    this.securityManager = SecurityManager.getInstance();
  }

  /**
   * Get security metrics overview
   */
  getMetrics = async (req: Request, res: Response) => {
    try {
      const metrics = this.securityManager.getMetrics();
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security metrics',
      });
    }
  };

  /**
   * Get audit logs with filtering
   */
  getAuditLogs = async (req: Request, res: Response) => {
    try {
      const querySchema = z.object({
        eventType: z.nativeEnum(SecurityEventType).optional(),
        ip: z.string().optional(),
        userId: z.string().optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        since: z.string().datetime().optional(),
        limit: z.coerce.number().min(1).max(1000).default(100),
      });

      const query = querySchema.parse(req.query);

      const criteria: any = {};
      if (query.eventType) criteria.eventType = query.eventType;
      if (query.ip) criteria.ip = query.ip;
      if (query.userId) criteria.userId = query.userId;
      if (query.severity) criteria.severity = query.severity;
      if (query.since) criteria.since = new Date(query.since);

      const logs = this.securityManager.getAuditLogsByCriteria(criteria);
      const limitedLogs = logs.slice(-query.limit);

      res.json({
        success: true,
        data: {
          logs: limitedLogs,
          total: logs.length,
          filtered: limitedLogs.length,
        },
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs',
      });
    }
  };

  /**
   * Get security configuration
   */
  getConfig = async (req: Request, res: Response) => {
    try {
      const config = this.securityManager.getConfig();
      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('Error fetching security config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security configuration',
      });
    }
  };

  /**
   * Update security configuration
   */
  updateConfig = async (req: Request, res: Response) => {
    try {
      const configSchema = z.object({
        cors: z
          .object({
            allowedOrigins: z.array(z.string().url()).optional(),
            allowCredentials: z.boolean().optional(),
          })
          .optional(),

        rateLimiting: z
          .object({
            connectionLimit: z
              .object({
                maxConnections: z.number().min(1).optional(),
                windowMs: z.number().min(1000).optional(),
              })
              .optional(),
            messageLimit: z
              .object({
                maxMessages: z.number().min(1).optional(),
                windowMs: z.number().min(1000).optional(),
              })
              .optional(),
          })
          .optional(),

        validation: z
          .object({
            maxPayloadSize: z.number().min(1).optional(),
            maxMessageLength: z.number().min(1).optional(),
            requireAuthentication: z.array(z.string()).optional(),
          })
          .optional(),

        security: z
          .object({
            allowAnonymous: z.boolean().optional(),
            maxAnonymousConnections: z.number().min(0).optional(),
            suspiciousActivityThreshold: z.number().min(1).optional(),
            blockSuspiciousIps: z.boolean().optional(),
            enableAuditLogging: z.boolean().optional(),
          })
          .optional(),

        monitoring: z
          .object({
            enableMetrics: z.boolean().optional(),
            enableHealthChecks: z.boolean().optional(),
            alertThresholds: z
              .object({
                highConnectionCount: z.number().min(1).optional(),
                highMessageRate: z.number().min(1).optional(),
                errorRate: z.number().min(0).max(1).optional(),
              })
              .optional(),
          })
          .optional(),
      });

      const updates = configSchema.parse(req.body);

      this.securityManager.updateConfig(updates);

      const newConfig = this.securityManager.getConfig();

      res.json({
        success: true,
        message: 'Security configuration updated successfully',
        data: newConfig,
      });
    } catch (error) {
      console.error('Error updating security config:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to update security configuration',
        details: error instanceof z.ZodError ? error.errors : undefined,
      });
    }
  };

  /**
   * Block IP address
   */
  blockIP = async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        ip: z.string().ip(),
        reason: z.string().min(1),
      });

      const { ip, reason } = schema.parse(req.body);

      this.securityManager.blockIP(ip, reason);

      res.json({
        success: true,
        message: `IP ${ip} blocked successfully`,
      });
    } catch (error) {
      console.error('Error blocking IP:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to block IP address',
        details: error instanceof z.ZodError ? error.errors : undefined,
      });
    }
  };

  /**
   * Unblock IP address
   */
  unblockIP = async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        ip: z.string().ip(),
      });

      const { ip } = schema.parse(req.body);

      this.securityManager.unblockIP(ip);

      res.json({
        success: true,
        message: `IP ${ip} unblocked successfully`,
      });
    } catch (error) {
      console.error('Error unblocking IP:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to unblock IP address',
        details: error instanceof z.ZodError ? error.errors : undefined,
      });
    }
  };

  /**
   * Get security dashboard data
   */
  getDashboard = async (req: Request, res: Response) => {
    try {
      const metrics = this.securityManager.getMetrics();
      const recentLogs = this.securityManager.getAuditLogs(50);

      // Aggregate recent activity
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActivity = this.securityManager.getAuditLogsByCriteria({
        since: last24Hours,
      });

      // Count events by type
      const eventCounts = recentActivity.reduce(
        (acc, log) => {
          acc[log.eventType] = (acc[log.eventType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Count events by severity
      const severityCounts = recentActivity.reduce(
        (acc, log) => {
          acc[log.severity] = (acc[log.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Get top IPs by activity
      const ipActivity = recentActivity.reduce(
        (acc, log) => {
          acc[log.ip] = (acc[log.ip] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const topIPs = Object.entries(ipActivity)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }));

      res.json({
        success: true,
        data: {
          metrics,
          recentLogs: recentLogs.slice(-10), // Last 10 logs
          analytics: {
            eventCounts,
            severityCounts,
            topIPs,
            totalEvents24h: recentActivity.length,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching security dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security dashboard',
      });
    }
  };

  /**
   * Generate security report
   */
  generateReport = async (req: Request, res: Response) => {
    try {
      const querySchema = z.object({
        period: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
        format: z.enum(['json', 'csv']).default('json'),
      });

      const { period, format } = querySchema.parse(req.query);

      // Calculate time range
      const timeRanges = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      const since = new Date(Date.now() - timeRanges[period]);
      const logs = this.securityManager.getAuditLogsByCriteria({ since });

      if (format === 'csv') {
        // Generate CSV report
        const csvHeader = 'Timestamp,Event Type,IP,User ID,Socket ID,Message,Severity\n';
        const csvRows = logs
          .map(
            log =>
              `"${log.timestamp.toISOString()}","${log.eventType}","${log.ip}","${log.userId || ''}","${log.socketId || ''}","${log.message}","${log.severity}"`,
          )
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="security-report-${period}.csv"`,
        );
        res.send(csvHeader + csvRows);
      } else {
        // Generate JSON report
        const report = {
          period,
          generatedAt: new Date().toISOString(),
          summary: {
            totalEvents: logs.length,
            uniqueIPs: new Set(logs.map(l => l.ip)).size,
            uniqueUsers: new Set(logs.map(l => l.userId).filter(Boolean)).size,
            eventTypes: Object.entries(
              logs.reduce(
                (acc, log) => {
                  acc[log.eventType] = (acc[log.eventType] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              ),
            ).sort(([, a], [, b]) => b - a),
          },
          events: logs,
        };

        res.json({
          success: true,
          data: report,
        });
      }
    } catch (error) {
      console.error('Error generating security report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate security report',
      });
    }
  };

  /**
   * Health check endpoint for security monitoring
   */
  healthCheck = async (req: Request, res: Response) => {
    try {
      const metrics = this.securityManager.getMetrics();
      const config = this.securityManager.getConfig();

      // Determine health status
      const thresholds = config.monitoring.alertThresholds;
      const issues = [];

      if (metrics.activeConnections > thresholds.highConnectionCount) {
        issues.push(`High connection count: ${metrics.activeConnections}`);
      }

      if (metrics.rateLimitViolations > thresholds.highMessageRate) {
        issues.push(`High rate limit violations: ${metrics.rateLimitViolations}`);
      }

      const errorRate = metrics.blockedAttempts / Math.max(metrics.totalConnections, 1);
      if (errorRate > thresholds.errorRate) {
        issues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
      }

      const status = issues.length === 0 ? 'healthy' : 'warning';

      res.status(status === 'healthy' ? 200 : 503).json({
        status,
        timestamp: new Date().toISOString(),
        metrics: {
          activeConnections: metrics.activeConnections,
          rateLimitViolations: metrics.rateLimitViolations,
          blockedAttempts: metrics.blockedAttempts,
          errorRate: (errorRate * 100).toFixed(2) + '%',
        },
        issues,
      });
    } catch (error) {
      console.error('Security health check error:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  };
}
