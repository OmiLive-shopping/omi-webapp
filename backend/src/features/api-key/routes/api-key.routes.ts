import { Router, Request, Response } from 'express';
import { auth } from '../../../middleware/auth.middleware';
import { apiKeyStore } from '../../../middleware/api-key.middleware';
import { unifiedResponse } from 'uni-response';
import { body } from 'express-validator';
import { handleValidationErrors } from '../../../middleware/input-validation.middleware';

const router = Router();

// All API key management routes require authentication
router.use(auth);

// Additional check for admin role
const requireAdmin = (req: Request, res: Response, next: any) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json(unifiedResponse(false, 'Admin access required'));
    return;
  }
  next();
};

// List all API keys
router.get('/', requireAdmin, (req: Request, res: Response) => {
  const keys = apiKeyStore.listKeys();
  res.json(unifiedResponse(true, 'API keys retrieved', { keys }));
});

// Generate new API key
router.post('/',
  requireAdmin,
  [
    body('name').trim().isLength({ min: 3, max: 50 }).withMessage('Name must be 3-50 characters'),
    body('permissions').isArray().withMessage('Permissions must be an array'),
    body('permissions.*').isIn(['read', 'write', 'delete']).withMessage('Invalid permission'),
    body('rateLimit.max').optional().isInt({ min: 1 }).withMessage('Rate limit max must be positive'),
    body('rateLimit.windowMs').optional().isInt({ min: 1000 }).withMessage('Window must be at least 1 second'),
  ],
  handleValidationErrors,
  (req: Request, res: Response) => {
    const { name, permissions, rateLimit } = req.body;
    
    const { id, key } = apiKeyStore.generateNewKey(name, permissions);
    
    res.json(unifiedResponse(true, 'API key created', {
      id,
      key,
      message: 'Save this key securely. It will not be shown again.',
    }));
  }
);

// Revoke API key
router.delete('/:id',
  requireAdmin,
  (req: Request, res: Response) => {
    const { id } = req.params;
    
    const revoked = apiKeyStore.revokeKey(id);
    
    if (revoked) {
      res.json(unifiedResponse(true, 'API key revoked'));
    } else {
      res.status(404).json(unifiedResponse(false, 'API key not found'));
    }
  }
);

export default router;