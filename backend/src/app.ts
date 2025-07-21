import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import { corsMiddleware } from './config/cors.config';
import { env } from './config/env-config';
import { RedisClient } from './config/redis.config';
import apiKeyRoutes from './features/api-key/routes/api-key.routes';
import productRoutes from './features/product/routes/product.routes';
import streamRoutes from './features/stream/routes/stream.routes';
import userRoutes from './features/user/routes/user.routes';
import { apiErrorHandler, unmatchedRoutes } from './middleware/api-error.middleware';
import { validateApiKey } from './middleware/api-key.middleware';
import { logger, requestIdMiddleware } from './middleware/morgan-logger.middleware';
import { loggerMiddleware, pinoLogger } from './middleware/pino-logger';
import { apiRateLimiter } from './middleware/rate-limit.middleware';
import { hostWhitelist } from './middleware/security.middleware';

const app: Application = express();

// Initialize Redis connection
(async () => {
  try {
    const redis = RedisClient.getInstance();
    await redis.connect();
    console.log('Redis connection established');
  } catch (error) {
    console.warn('Redis connection failed, using memory store for rate limiting');
  }
})();

// Request ID middleware - should be first
app.use(requestIdMiddleware);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
  }),
);

// CORS - before other middleware
app.use(corsMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(logger);
app.use(loggerMiddleware);
app.use(pinoLogger);

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Global rate limiting
app.use(apiRateLimiter);

// Health check endpoints (no auth required)
app.get('/heartbeat', (req: Request, res: Response): void => {
  req.log.info('Heartbeat ok');
  res.send('ok');
  return;
});

app.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: RedisClient.getInstance().isReady() ? 'connected' : 'disconnected',
  });
  return;
});

// Root endpoint with host whitelist
const allowedURLs = env.WHITE_LIST_URLS || [];
app.get('/', hostWhitelist(allowedURLs), (_req: Request, res: Response): void => {
  res.json({
    name: 'OMI Live API',
    version: '1.0.0',
    docs: '/api-docs',
  });
  return;
});

// API Routes
app.use('/v1/users', userRoutes);
app.use('/v1/products', productRoutes);
app.use('/v1/streams', streamRoutes);
app.use('/v1/api-keys', apiKeyRoutes);

// External API endpoints (require API key)
app.use('/api/v1', validateApiKey(true), [
  express.Router().use('/users', userRoutes),
  express.Router().use('/products', productRoutes),
  express.Router().use('/streams', streamRoutes),
]);

// Error Handling Middleware
app.use(apiErrorHandler);

// Middleware for handling unmatched routes
app.use(unmatchedRoutes);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  const redis = RedisClient.getInstance();
  await redis.disconnect();
  process.exit(0);
});

export { app };
