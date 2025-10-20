// Polyfill crypto for Better Auth in ESM Node.js environment
import crypto from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = crypto as any;
}

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

// TEMPORARILY DISABLED: These plugins may cause session validation issues
// import { admin, organization } from 'better-auth/plugins';
import { PrismaService } from './config/prisma.config.js';

const prismaClient = PrismaService.getInstance().client;

console.log('🔧 [AUTH DEBUG] Plugins disabled for testing session validation bug');

// Use BETTER_AUTH_URL from environment, or fallback to old behavior for local dev
const baseURL =
  process.env.BETTER_AUTH_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://app.omiliveshopping.com' // Production uses Firebase Hosting domain
    : 'http://localhost:9000');

console.log('Better Auth Config:', {
  baseURL,
  basePath: '/api/v1/auth',
  hasSecret: !!process.env.BETTER_AUTH_SECRET,
  secretPreview: process.env.BETTER_AUTH_SECRET?.substring(0, 10) + '...',
  nodeEnv: process.env.NODE_ENV,
  allEnvKeys: Object.keys(process.env).filter(k => k.includes('AUTH')),
});

export const auth = betterAuth({
  baseURL,
  basePath: '/api/v1/auth',
  secret: process.env.BETTER_AUTH_SECRET || 'default-secret-change-this-in-production',

  database: prismaAdapter(prismaClient, {
    provider: 'postgresql',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Enable later in production
    // CRITICAL: Enable sendToken to receive token in sign-in response
    // This allows both cookie and token-based auth
    sendToken: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    // IMPORTANT: cookieCache is disabled because it conflicts with custom cookie names
    // Firebase Hosting requires __session cookie, but cookieCache uses __Secure-better-auth.* names
    cookieCache: {
      enabled: false,
    },
  },

  // CRITICAL: Firebase Hosting only forwards cookies named "__session"
  // All other cookies are stripped before reaching Cloud Run
  // Reference: https://firebase.google.com/docs/hosting/manage-cache#using_cookies
  advanced: {
    cookies: {
      // Use __session as the primary cookie name to work with Firebase Hosting
      sessionToken: {
        name: '__session',
      },
    },
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
        defaultValue: (() => {
          // Generate a unique stream key using cuid pattern
          const timestamp = Date.now().toString(36);
          const randomStr = Math.random().toString(36).substring(2, 15);
          return `sk_${timestamp}${randomStr}`;
        })(),
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

  // TEMPORARILY DISABLED: Testing if these plugins cause session validation issues
  // Reference: GitHub issues #3892, #3470 suggest plugins can cause schema mismatches
  // plugins: [
  //   organization({
  //     async sendInvitationEmail(data) {
  //       // TODO: Implement email sending for organization invitations
  //       // For streaming channel invites
  //       console.log('Organization invitation email:', {
  //         organization: data.organization.name,
  //         inviter: data.inviter.user.name || data.inviter.user.email,
  //         email: data.email,
  //         invitationId: data.invitation.id,
  //       });
  //     },
  //   }),
  //   admin({
  //     impersonationSessionDuration: 60 * 60, // 1 hour
  //   }),
  // ],

  trustedOrigins: [
    'http://localhost:3000', // Frontend development (if using 3000)
    'http://localhost:8888', // Frontend development (current port)
    'http://localhost:9000', // Backend development
    'http://localhost:5173', // Frontend development (Vite)
    'https://app.omiliveshopping.com', // Firebase Hosting (production frontend)
    'https://omi-backend-355024965259.us-central1.run.app', // Cloud Run backend
    'https://omi.live', // Production (future)
    'https://*.omi.live', // Production subdomains (future)
  ],
});

// Export type for use in other files
export type Auth = typeof auth;
