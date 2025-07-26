import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../auth.js';

const router = Router();

/**
 * Better Auth handler for all authentication endpoints
 * This handles:
 * - POST /api/auth/sign-up
 * - POST /api/auth/sign-in
 * - POST /api/auth/sign-out
 * - GET /api/auth/session
 * - And all other Better Auth endpoints
 * 
 * IMPORTANT: This must be mounted BEFORE express.json() middleware
 * in the main app to avoid body parsing conflicts
 */
const authHandler = toNodeHandler(auth);

// Debug the handler
console.log('Auth handler type:', typeof authHandler);
console.log('Auth handler:', authHandler);

router.all('/*', async (req, res, next) => {
  console.log('Better Auth route hit:', req.method, req.originalUrl, req.url);
  console.log('Request path:', req.path);
  console.log('Base URL:', req.baseUrl);
  
  try {
    const result = await authHandler(req, res);
    console.log('Handler result:', result);
    
    // If handler doesn't send response, pass to next middleware
    if (!res.headersSent) {
      console.log('Headers not sent, returning 404');
      res.status(404).send('Not Found');
    }
  } catch (error) {
    console.error('Better Auth handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;