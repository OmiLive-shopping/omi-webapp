import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

import { corsMiddleware } from './config/cors.config.js';
import { env } from './config/env-config.js';
import analyticsRoutes from './features/analytics/routes/analytics.routes.js';
import apiKeyRoutes from './features/api-key/routes/api-key.routes.js';
import brandProductRoutes from './features/product/routes/brand-product.routes.js';
import productRoutes from './features/product/routes/product.routes.js';
import profileRoutes from './features/profile/routes/profile.routes.js';
import streamRoutes from './features/stream/routes/stream.routes.js';
// import streamTestRoutes from './features/stream/routes/stream-test.routes.js'; // Disabled temporarily
import userRoutes from './features/user/routes/user.routes.js';
import { apiErrorHandler, unmatchedRoutes } from './middleware/api-error.middleware.js';
import { validateApiKey } from './middleware/api-key.middleware.js';
import { logger, requestIdMiddleware } from './middleware/morgan-logger.middleware.js';
import { loggerMiddleware, pinoLogger } from './middleware/pino-logger.js';
import { apiRateLimiter } from './middleware/rate-limit.middleware.js';
import { hostWhitelist } from './middleware/security.middleware.js';
import authRoutes from './routes/auth.routes.js';

const app: Application = express();

// Redis disabled for now - using memory store for rate limiting

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

        // Allow connections to your backend and VDO.ninja for streaming
        connectSrc: [
          "'self'",
          'https://omi-backend-355024965259.us-central1.run.app',
          'https://*.vdo.ninja',
          'wss://*.vdo.ninja', // WebSocket for VDO.ninja
        ],

        fontSrc: ["'self'"],
        objectSrc: ["'none'"],

        // Allow media from VDO.ninja for streaming
        mediaSrc: ["'self'", 'https://*.vdo.ninja', 'blob:'],

        // Allow iframes from VDO.ninja for streaming embed
        frameSrc: ["'self'", 'https://*.vdo.ninja'],

        // Prevent your site from being embedded in other sites (clickjacking protection)
        frameAncestors: ["'none'"],

        // Only allow forms to submit to your own backend
        formAction: ["'self'"],

        // Upgrade HTTP to HTTPS in production
        ...(env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
  }),
);

// CORS - before other middleware
app.use(corsMiddleware);

// Better Auth routes MUST be mounted BEFORE body parsing middleware
// Mounted at /api/v1/auth (frontend uses /api prefix, production Firebase proxy keeps it)
console.log('Mounting Better Auth routes at /api/v1/auth');
app.use('/api/v1/auth', authRoutes);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(logger);
app.use(loggerMiddleware);
if (env.NODE_ENV === 'production') {
  app.use(pinoLogger);
}

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Global rate limiting - DISABLED FOR NOW
// app.use(apiRateLimiter);

// Health check endpoints (no auth required)
app.get('/heartbeat', (req: Request, res: Response): void => {
  req.log.info('Heartbeat ok');
  res.send('ok');
  return;
});

// Track deployment time
const DEPLOYMENT_TIME = new Date().toISOString();

app.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    deployedAt: DEPLOYMENT_TIME,
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

// API Routes (using /api/v1/* prefix - matches frontend calls and production proxy)
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/profiles', profileRoutes); // Public profile endpoints
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/brands/products', brandProductRoutes); // Brand-specific product management
// app.use('/api/v1/streams/test', streamTestRoutes); // Disabled temporarily - Test/simulation endpoints
app.use('/api/v1/streams', streamRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// External API endpoints (require API key)
// NOTE: /api/v1/auth/* is handled by Better Auth routes above (lines 58-59)
// NOTE: Commented out because this was causing 404s on auth endpoints
// The /api/v1 prefix was matching /api/v1/auth/* before Better Auth routes could handle them
// app.use('/api/v1', validateApiKey(true), [
//   express.Router().use('/users', userRoutes),
//   express.Router().use('/products', productRoutes),
//   express.Router().use('/brands/products', brandProductRoutes),
//   express.Router().use('/streams', streamRoutes),
//   express.Router().use('/analytics', analyticsRoutes),
// ]);

// Error Handling Middleware
app.use(apiErrorHandler);

// Middleware for handling unmatched routes
app.use(unmatchedRoutes);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

export { app };
