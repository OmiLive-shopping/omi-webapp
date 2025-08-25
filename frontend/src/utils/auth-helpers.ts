/**
 * Auth Helper Functions
 * Utilities for working with Better Auth session responses
 */

import type { BetterAuthSessionResponse } from '@/types/better-auth';
import { getBetterAuthSessionCookie } from './cookie-helper';

/**
 * Type guard to check if the response has session data
 */
export function hasSessionData(
  response: any
): response is { data: NonNullable<BetterAuthSessionResponse['data']> } {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    response.data &&
    'session' in response.data &&
    'user' in response.data
  );
}

/**
 * Type guard to check if the response is an error
 */
export function isSessionError(
  response: any
): response is { error: { message: string; code?: string } } {
  return (
    response &&
    typeof response === 'object' &&
    'error' in response &&
    response.error &&
    'message' in response.error
  );
}

/**
 * Helper to extract session token from Better Auth response
 */
export function extractSessionToken(response: any): string | undefined {
  console.log('Extracting token from response:', response);
  
  // First try to get the actual session cookie value
  const cookieToken = getBetterAuthSessionCookie();
  if (cookieToken) {
    console.log('Using session token from cookie:', cookieToken.substring(0, 20) + '...');
    return cookieToken;
  }
  
  // Fallback to session data if available
  if (hasSessionData(response)) {
    // Better Auth uses session.id as the token
    const token = response.data.session.id || response.data.session.token;
    console.log('Using session ID as fallback:', token);
    return token;
  }
  
  return undefined;
}