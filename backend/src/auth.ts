import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin } from "better-auth/plugins";
import { PrismaService } from "./config/prisma.config.js";

const prismaClient = PrismaService.getInstance().client;

export const auth = betterAuth({
  baseURL: "http://localhost:9000",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET || "default-secret-change-this-in-production",
  
  database: prismaAdapter(prismaClient, {
    provider: "postgresql"
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false // Enable later in production
  },
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  
  rateLimit: {
    window: 60, // 1 minute
    max: 100, // 100 requests per minute
    customRules: {
      "/sign-in": { window: 60, max: 5 },
      "/sign-up": { window: 60, max: 3 }
    }
  },
  
  user: {
    additionalFields: {
      streamKey: { 
        type: "string", 
        required: false,
        defaultValue: (() => {
          // Generate a unique stream key using cuid pattern
          const timestamp = Date.now().toString(36);
          const randomStr = Math.random().toString(36).substring(2, 15);
          return `sk_${timestamp}${randomStr}`;
        })()
      },
      username: { type: "string", required: true },
      firstName: { type: "string", required: false },
      lastName: { type: "string", required: false },
      bio: { type: "string", required: false },
      avatarUrl: { type: "string", required: false },
      // Remove role from additional fields as it conflicts with Prisma relation
      isAdmin: { 
        type: "boolean", 
        required: false, 
        defaultValue: false,
        input: false // Admin-only field
      }
    }
  },
  
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        // TODO: Implement email sending for organization invitations
        // For streaming channel invites
        console.log("Organization invitation email:", {
          organization: data.organization.name,
          inviter: data.inviter.user.name || data.inviter.user.email,
          email: data.email,
          invitationId: data.invitation.id
        });
      }
    }),
    admin({
      impersonationSessionDuration: 60 * 60, // 1 hour
    })
  ],
  
  trustedOrigins: [
    "http://localhost:3000",      // Frontend development (if using 3000)
    "http://localhost:9000",      // Backend development
    "http://localhost:5173",      // Frontend development (Vite)
    "https://omi.live",          // Production
    "https://*.omi.live"         // Production subdomains
  ]
});

// Export type for use in other files
export type Auth = typeof auth;