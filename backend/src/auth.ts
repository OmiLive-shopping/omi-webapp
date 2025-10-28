// Polyfill crypto for Better Auth in ESM Node.js environment
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware } from 'better-auth/api';
import { admin, bearer } from 'better-auth/plugins';
import crypto from 'crypto';

import { PrismaService } from './config/prisma.config.js';

if (typeof globalThis.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.crypto = crypto as any;
}

const prismaClient = PrismaService.getInstance().client;

console.log('🔧 [AUTH] Bearer token authentication enabled');

// Use BETTER_AUTH_URL from environment, or fallback to old behavior for local dev
// eslint-disable-next-line node/no-process-env
const baseURL =
  // eslint-disable-next-line node/no-process-env
  process.env.BETTER_AUTH_URL ||
  // eslint-disable-next-line node/no-process-env
  (process.env.NODE_ENV === 'production'
    ? 'https://app.omiliveshopping.com' // Production uses Firebase Hosting domain
    : 'http://localhost:9000');

console.log('Better Auth Config:', {
  baseURL,
  basePath: '/api/v1/auth',
  // eslint-disable-next-line node/no-process-env
  hasSecret: !!process.env.BETTER_AUTH_SECRET,
  // eslint-disable-next-line node/no-process-env
  secretPreview: process.env.BETTER_AUTH_SECRET?.substring(0, 10) + '...',
  // eslint-disable-next-line node/no-process-env
  nodeEnv: process.env.NODE_ENV,
  // eslint-disable-next-line node/no-process-env
  allEnvKeys: Object.keys(process.env).filter(k => k.includes('AUTH')),
});

export const auth = betterAuth({
  baseURL,
  basePath: '/api/v1/auth',
  // eslint-disable-next-line node/no-process-env
  secret: process.env.BETTER_AUTH_SECRET || 'default-secret-change-this-in-production',

  database: prismaAdapter(prismaClient, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Enable later in production
    // CRITICAL: sendToken has been removed in newer better-auth versions
    // Token is now sent by default when using bearer plugin
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    // Disable cookie-based sessions - Firebase strips cookies anyway
    cookieCache: {
      enabled: false,
      maxAge: 0, // Don't cache in cookies
    },
  },

  // Advanced configuration - disable cookie storage
  advanced: {
    // Disable session cookies entirely - use Bearer tokens only
    useSecureCookies: false,
    cookiePrefix: 'disabled',
  },

  rateLimit: {
    window: 60, // 1 minute
    max: 100, // 100 requests per minute
    customRules: {
      '/sign-in': { window: 60, max: 5 },
      '/sign-up': { window: 60, max: 3 },
    },
  },

  user: {
    additionalFields: {
      streamKey: {
        type: 'string',
        required: false,
        // No defaultValue - let Prisma's @default(cuid()) handle generation
      },
      username: { type: 'string', required: true },
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      bio: { type: 'string', required: false },
      avatarUrl: { type: 'string', required: false },
      // Remove role from additional fields as it conflicts with Prisma relation
      isAdmin: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false, // Admin-only field
      },
    },
  },

  // Enable Bearer token authentication for JWT-based auth and admin management
  plugins: [
    bearer(),
    admin({
      defaultRole: 'user',
    }),
  ],

  // Hooks to enrich user data with brand information
  hooks: {
    after: createAuthMiddleware(async ctx => {
      if (ctx.path === '/admin/list-users') {
        // Enrich users with brand data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const returned = ctx.context.returned as any;
        if (returned?.users && Array.isArray(returned.users)) {
          const enrichedUsers = await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            returned.users.map(async (user: any) => {
              if (user.role === 'brand') {
                const brand = await prismaClient.brand.findUnique({
                  where: { userId: user.id },
                  select: {
                    companyName: true,
                    verified: true,
                    slug: true,
                  },
                });
                return { ...user, brand };
              }
              return user;
            }),
          );
          ctx.context.returned = { ...returned, users: enrichedUsers };
        }
      }
    }),
  },

  trustedOrigins: [
    'http://localhost:3000', // Frontend development (if using 3000)
    'http://localhost:8888', // Frontend development (current port)
    'http://localhost:9000', // Backend development
    'http://localhost:5173', // Frontend development (Vite)
    'https://omiliveshopping.com', // Firebase Hosting (production frontend - main domain)
    'https://www.omiliveshopping.com', // Firebase Hosting (www variant)
    'https://app.omiliveshopping.com', // Firebase Hosting (app subdomain)
    'https://omi-backend-355024965259.us-central1.run.app', // Cloud Run backend
    'https://omi.live', // Production (future)
    'https://*.omi.live', // Production subdomains (future)
  ],
});

// Export type for use in other files
export type Auth = typeof auth;
