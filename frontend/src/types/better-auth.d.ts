/**
 * Better Auth Session Types
 * 
 * This file documents the actual return types from Better Auth's getSession() function
 * based on empirical testing and the library's behavior.
 */

/**
 * The actual structure returned by Better Auth's getSession() function
 * Better Auth wraps the response in a Data type with either data or error
 */
export type BetterAuthSessionResponse = 
  | {
      data: {
        session: {
          id: string;
          token: string;
          userId: string;
          expiresAt: Date;
          ipAddress?: string;
          userAgent?: string;
        };
        user: {
          id: string;
          email: string;
          emailVerified: boolean;
          name: string;
          username?: string;
          role?: string;
          isAdmin?: boolean;
          streamKey?: string;
          createdAt: Date;
          updatedAt: Date;
          image?: string | null;
        };
      } | null;
    }
  | {
      error: {
        message: string;
        code?: string;
      };
    };