import { createAuthClient } from 'better-auth/react';
import type { InferUser, InferSession } from 'better-auth/client';

// Create the auth client with proper configuration
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9000/v1',
  basePath: '/auth',
});

// Export Better Auth hooks and functions
export const {
  // Authentication functions
  signIn,
  signUp,
  signOut,
  
  // Session hooks
  useSession,
  
  // Other utilities
  getSession,
  updateUser,
  deleteUser,
  listSessions,
  revokeSession,
  revokeSessions,
  revokeOtherSessions,
  
  // Organization features (if using organization plugin)
  organization,
  
  // Admin features (if using admin plugin)
  admin,
} = authClient;

// Type exports for TypeScript
export type User = InferUser<typeof authClient>;
export type Session = InferSession<typeof authClient>;

// Custom user fields added in backend auth.ts
export interface AuthUser extends User {
  streamKey?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  role: string;
  // Standard Better Auth fields
  name?: string;
  email: string;
  emailVerified: boolean;
  image?: string;
}

// Helper function to get typed user
export function getTypedUser(user: User | null): AuthUser | null {
  return user as AuthUser | null;
}

// Helper hook to get typed session with custom user fields
export function useTypedSession() {
  const session = useSession();
  
  return {
    ...session,
    data: session.data ? {
      ...session.data,
      user: getTypedUser(session.data.user),
    } : null,
  };
}

// Auth state helper for migration compatibility
export function useAuthState() {
  const session = useTypedSession();
  
  return {
    user: session.data?.user || null,
    isAuthenticated: !!session.data?.user,
    isLoading: session.isPending,
    error: session.error,
  };
}

// Sign in with email/password
export async function signInWithEmail(email: string, password: string) {
  return signIn.email({
    email,
    password,
  });
}

// Sign up with email/password
export async function signUpWithEmail(data: {
  email: string;
  password: string;
  name: string;
  username: string;
}) {
  return signUp.email({
    email: data.email,
    password: data.password,
    name: data.name,
    // Additional fields need to be passed as part of the main object
    // Better Auth will pass these to the user additionalFields
    username: data.username,
  } as any); // Type assertion needed due to Better Auth's strict typing
}

// Check if user has a specific role
export function hasRole(user: AuthUser | null, role: string): boolean {
  if (!user) return false;
  return user.role === role || user.isAdmin;
}

// Check if user is a streamer
export function isStreamer(user: AuthUser | null): boolean {
  return hasRole(user, 'streamer');
}

// Check if user is admin
export function isAdmin(user: AuthUser | null): boolean {
  return user?.isAdmin || false;
}