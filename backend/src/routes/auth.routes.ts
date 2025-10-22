import { toNodeHandler } from 'better-auth/node';
import { Router } from 'express';

import { auth } from '../auth.js';

const router = Router();

/**
 * Better Auth handler for all authentication endpoints
 * This handles:
 * - POST /v1/auth/sign-up/email
 * - POST /v1/auth/sign-in/email
 * - POST /v1/auth/sign-out
 * - GET /v1/auth/get-session
 * - And all other Better Auth endpoints
 *
 * IMPORTANT: This must be mounted BEFORE express.json() middleware
 * in the main app to avoid body parsing conflicts
 */
const authHandler = toNodeHandler(auth);

// Debug the handler
console.log('Auth handler type:', typeof authHandler);
console.log('Auth handler:', authHandler);

// Debug endpoint to manually check session
router.get('/debug-session-check', async (req, res) => {
  console.log('🧪 DEBUG: Manual session check');

  try {
    // Convert Node.js headers to Web Headers
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, v));
      }
    });

    const session = await auth.api.getSession({ headers });
    console.log('🧪 Session from api.getSession:', JSON.stringify(session, null, 2));
    res.json({
      success: true,
      session,
      authorization: req.headers.authorization,
      rawHeaders: Object.fromEntries(headers.entries()),
    });
  } catch (error: any) {
    console.error('🧪 Error checking session:', error);
    res.json({
      success: false,
      error: error?.message || String(error),
      stack: error?.stack,
    });
  }
});

router.all('/*', async (req, res) => {
  console.log('🔵 Better Auth route hit:', req.method, req.originalUrl, req.url);
  console.log('🔵 Request path:', req.path);
  console.log('🔵 Base URL:', req.baseUrl);
  console.log('🔵 Authorization:', req.headers.authorization ? 'Bearer ***' : 'none');
  console.log('🔵 Headers:', JSON.stringify(req.headers, null, 2));

  try {
    const result = await authHandler(req, res);
    console.log('🟢 Handler result:', result);
    console.log('🟢 Response sent:', res.headersSent);

    // If handler doesn't send response, pass to next middleware
    if (!res.headersSent) {
      console.log('🔴 Headers not sent, returning 404');
      res.status(404).send('Not Found');
    } else {
      console.log('✅ Response successfully sent by Better Auth');
    }
  } catch (error) {
    console.error('🔴 Better Auth handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
