/**
 * Helper to get Better Auth session cookie
 */
export function getBetterAuthSessionCookie(): string | undefined {
  // Better Auth stores the session in a cookie named 'better-auth.session_token'
  const cookies = document.cookie.split(';');
  
  console.log('All cookies:', document.cookie);
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'better-auth.session_token') {
      console.log('Found Better Auth session cookie:', value);
      // Decode the URL-encoded value
      return decodeURIComponent(value);
    }
  }
  
  console.log('No Better Auth session cookie found');
  return undefined;
}