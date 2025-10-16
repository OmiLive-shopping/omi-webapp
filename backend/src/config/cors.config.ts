import cors, { CorsOptions } from 'cors';

import { env } from './env-config.js';

// Helper to parse allowed origins from environment
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];

  // Production domains (hardcoded for reliability)
  if (env.NODE_ENV === 'production') {
    origins.push(
      'https://app.omiliveshopping.com', // Production frontend
      'https://omiliveshopping.com', // Alternate domain
      'https://omi-live-backend.web.app', // Firebase hosting
    );
  }

  // Add whitelisted URLs from env (for additional domains)
  if (env.WHITE_LIST_URLS) {
    origins.push(...env.WHITE_LIST_URLS);
  }

  // Add client URL if specified (fallback)
  if (env.CLIENT_URL) {
    origins.push(env.CLIENT_URL);
  }

  // In development, allow localhost origins
  if (env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:8888',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8888',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    );
  }

  const uniqueOrigins = [...new Set(origins)];

  console.log('🌐 CORS Configuration:', {
    NODE_ENV: env.NODE_ENV,
    allowedOrigins: uniqueOrigins,
  });

  return uniqueOrigins;
};

// CORS options configuration
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (env.NODE_ENV === 'development') {
      // In development, log but allow the request
      console.warn(`CORS: Origin ${origin} not in whitelist, but allowed in development`);
      callback(null, true);
    } else {
      // In production, reject non-whitelisted origins
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },

  credentials: true, // Allow cookies and auth headers

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    env.API_KEY_HEADER || 'x-api-key',
  ],

  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Total-Count', // For pagination
  ],

  maxAge: 86400, // 24 hours - how long browsers can cache preflight

  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Create CORS middleware instance
export const corsMiddleware = cors(corsOptions);

// Strict CORS for sensitive endpoints
export const strictCorsOptions: CorsOptions = {
  ...corsOptions,
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    if (!origin || !allowedOrigins.includes(origin)) {
      callback(new Error('CORS: Strict mode - origin not allowed'));
    } else {
      callback(null, true);
    }
  },
};

export const strictCorsMiddleware = cors(strictCorsOptions);

// API-specific CORS (allows any origin but requires API key)
export const apiCorsOptions: CorsOptions = {
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', env.API_KEY_HEADER || 'x-api-key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
};

export const apiCorsMiddleware = cors(apiCorsOptions);
