import { Request, Response, Router } from 'express';
import { body } from 'express-validator';
import { unifiedResponse } from 'uni-response';

import { apiKeyStore } from '../../../middleware/api-key.middleware.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { handleValidationErrors } from '../../../middleware/input-validation.middleware.js';
import { requireAdmin } from '../../../middleware/role.middleware.js';

const router = Router();

// All API key management routes require authentication and admin role
router.use(authenticate, requireAdmin);

// List all API keys
router.get('/', (req: Request, res: Response) => {
  const keys = apiKeyStore.listKeys();
  res.json(unifiedResponse(true, 'API keys retrieved', { keys }));
});

// Generate new API key
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 3, max: 50 }).withMessage('Name must be 3-50 characters'),
    body('permissions').isArray().withMessage('Permissions must be an array'),
    body('permissions.*').isIn(['read', 'write', 'delete']).withMessage('Invalid permission'),
    body('rateLimit.max')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Rate limit max must be positive'),
    body('rateLimit.windowMs')
      .optional()
      .isInt({ min: 1000 })
      .withMessage('Window must be at least 1 second'),
  ],
  handleValidationErrors,
  (req: Request, res: Response) => {
    const { name, permissions, rateLimit } = req.body;

    const { id, key } = apiKeyStore.generateNewKey(name, permissions);

    res.json(
      unifiedResponse(true, 'API key created', {
        id,
        key,
        message: 'Save this key securely. It will not be shown again.',
      }),
    );
  },
);

// Revoke API key
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const revoked = apiKeyStore.revokeKey(id);

  if (revoked) {
    res.json(unifiedResponse(true, 'API key revoked'));
  } else {
    res.status(404).json(unifiedResponse(false, 'API key not found'));
  }
});

export default router;
