import crypto from 'crypto';
import { Request, Response } from 'express';
import fs from 'fs';
import morgan, { StreamOptions } from 'morgan';
import path from 'path';
import { createStream } from 'rotating-file-stream';

import { env } from '../config/env-config.js';

// Extend Request to include custom properties
interface CustomRequest extends Request {
  requestId?: string;
  startTime?: number;
}

// Custom tokens for morgan
morgan.token('request-id', (req: CustomRequest) => req.requestId || '-');
morgan.token('user-id', (req: Request) => req.user?.id || 'anonymous');
morgan.token('response-time-ms', (req: CustomRequest, res: Response) => {
  if (!req.startTime) return '-';
  const duration = Date.now() - req.startTime;
  return duration.toString();
});
morgan.token('api-key', (req: Request) => req.apiKey?.name || '-');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create rotating file streams for different log levels
const accessLogStream = createStream('access.log', {
  interval: '1d', // Rotate daily
  path: logsDir,
  maxFiles: 7, // Keep 7 days of logs
  compress: 'gzip', // Compress rotated files
});

const errorLogStream = createStream('error.log', {
  interval: '1d',
  path: logsDir,
  maxFiles: 30, // Keep 30 days of error logs
  compress: 'gzip',
});

// Stream options for Pino integration
const stream: StreamOptions = {
  write: (message: string) => {
    // In production, you might want to send this to a log aggregation service
    if (env.NODE_ENV === 'production') {
      accessLogStream.write(message);
    } else {
      console.log(message.trim());
    }
  },
};

// Custom formats
const formats = {
  // Development format - colorized and human-readable
  dev: ':method :url :status :response-time-ms ms - :res[content-length]',

  // Production format - detailed JSON for log aggregation
  production: JSON.stringify({
    timestamp: ':date[iso]',
    method: ':method',
    url: ':url',
    status: ':status',
    responseTime: ':response-time-ms',
    contentLength: ':res[content-length]',
    referrer: ':referrer',
    userAgent: ':user-agent',
    remoteAddr: ':remote-addr',
    requestId: ':request-id',
    userId: ':user-id',
    apiKey: ':api-key',
  }),

  // Combined format - Apache combined log format
  combined:
    ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',

  // API format - for API-specific logging
  api: '[:date[iso]] :request-id :method :url :status :response-time-ms ms :user-id :api-key',
};

// Skip logging for certain paths
const skipPaths = ['/heartbeat', '/health', '/metrics', '/favicon.ico'];
const skip = (req: Request, res: Response): boolean => {
  return skipPaths.some(path => req.path.startsWith(path));
};

// Error logging middleware
export const errorLogger = morgan(formats.combined, {
  stream: {
    write: (message: string) => {
      errorLogStream.write(message);
    },
  },
  skip: (req: Request, res: Response) => res.statusCode < 400,
});

// Create different morgan instances for different purposes
export const morganLogger = {
  // Development logger
  dev: morgan('dev', { skip }),

  // Production logger
  production: morgan(formats.production, { stream, skip }),

  // API logger with custom format
  api: morgan(formats.api, { stream, skip }),

  // Combined format logger
  combined: morgan(formats.combined, { stream, skip }),

  // Error logger
  error: errorLogger,
};

// Main logger middleware that switches based on environment
export const logger = env.NODE_ENV === 'production' ? morganLogger.production : morganLogger.dev;

// Request ID middleware - should be applied before morgan
export const requestIdMiddleware = (req: CustomRequest, res: Response, next: any) => {
  req.requestId = crypto.randomUUID();
  req.startTime = Date.now();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Helper function to manually log specific events
export const logEvent = (event: string, data: any) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    data,
  };

  if (env.NODE_ENV === 'production') {
    accessLogStream.write(JSON.stringify(logEntry) + '\n');
  } else {
    console.log('[EVENT]', logEntry);
  }
};

// Export utility to get log file paths
export const getLogPaths = () => ({
  access: path.join(logsDir, 'access.log'),
  error: path.join(logsDir, 'error.log'),
  directory: logsDir,
});
