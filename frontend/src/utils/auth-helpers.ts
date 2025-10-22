/**
 * Auth Helper Functions
 * Utilities for working with Better Auth session responses
 */

import type { BetterAuthSessionResponse } from '@/types/better-auth';

/**
 * Type guard to check if the response has session data
 */
export function hasSessionData(
  response: any
): response is { data: { session: any; user: any; token?: string } } {
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
 * Returns the Bearer token from the response data
 */
export function extractSessionToken(response: any): string | undefined {
  console.log('Extracting token from response:', response);

  // Extract token from response data (Better Auth with bearer plugin)
  if (hasSessionData(response) && response.data.token) {
    const token = response.data.token;
    console.log('Using Bearer token from response');
    return token;
  }

  return undefined;
}