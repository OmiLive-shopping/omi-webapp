import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { unifiedResponse } from 'uni-response';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json(
      unifiedResponse(false, 'Validation failed', {
        errors: errors.array().map((err) => ({
          field: err.type === 'field' ? err.path : undefined,
          message: err.msg,
          value: err.type === 'field' ? err.value : undefined,
        })),
      })
    );
    return;
  }
  next();
};

// Common validation rules
export const commonValidations = {
  // UUID validation
  uuid: (field: string) => param(field).isUUID().withMessage(`${field} must be a valid UUID`),
  
  // Pagination
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sort').optional().isIn(['asc', 'desc']).withMessage('Sort must be either asc or desc'),
  ],

  // Email
  email: (field: string = 'email') => 
    body(field)
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),

  // Password
  password: (field: string = 'password') =>
    body(field)
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),

  // Username
  username: (field: string = 'username') =>
    body(field)
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  // Generic string
  string: (field: string, min: number = 1, max: number = 255) =>
    body(field)
      .trim()
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`),

  // Boolean
  boolean: (field: string) =>
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean`),

  // Date
  date: (field: string) =>
    body(field)
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid ISO 8601 date`),

  // URL
  url: (field: string) =>
    body(field)
      .optional()
      .isURL()
      .withMessage(`${field} must be a valid URL`),

  // Array
  array: (field: string, minLength: number = 0, maxLength: number = 100) =>
    body(field)
      .optional()
      .isArray({ min: minLength, max: maxLength })
      .withMessage(`${field} must be an array with ${minLength}-${maxLength} items`),

  // Sanitization helpers
  sanitizeHtml: (field: string) =>
    body(field).trim().escape(),
};

// Specific validation rules for different features

// User validations
export const userValidations = {
  register: [
    commonValidations.email(),
    commonValidations.username(),
    commonValidations.password(),
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  ],

  login: [
    commonValidations.email(),
    body('password').notEmpty().withMessage('Password is required'),
  ],

  updateProfile: [
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    commonValidations.url('avatarUrl'),
  ],
};

// Stream validations
export const streamValidations = {
  create: [
    commonValidations.string('title', 3, 100),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('scheduled').isISO8601().withMessage('Scheduled time must be a valid date'),
    body('categoryId').optional().isUUID(),
    body('tags').optional().isArray({ max: 10 }).withMessage('Maximum 10 tags allowed'),
    body('tags.*').optional().isString().isLength({ min: 1, max: 30 }),
  ],

  update: [
    commonValidations.string('title', 3, 100).optional(),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('thumbnailUrl').optional().isURL(),
    body('categoryId').optional().isUUID(),
    body('tags').optional().isArray({ max: 10 }),
  ],

  goLive: [
    body('streamUrl').optional().isURL(),
  ],
};

// Product validations
export const productValidations = {
  create: [
    commonValidations.string('name', 3, 100),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('originalPrice').optional().isFloat({ min: 0 }),
    body('categoryId').optional().isUUID(),
    body('imageUrl').optional().isURL(),
    body('images').optional().isArray({ max: 10 }),
    body('images.*').optional().isURL(),
    body('inStock').optional().isBoolean(),
    body('stockCount').optional().isInt({ min: 0 }),
    body('tags').optional().isArray({ max: 20 }),
    body('tags.*').optional().isString().isLength({ min: 1, max: 30 }),
  ],

  update: [
    commonValidations.string('name', 3, 100).optional(),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('price').optional().isFloat({ min: 0 }),
    body('originalPrice').optional().isFloat({ min: 0 }),
    body('categoryId').optional().isUUID(),
    body('imageUrl').optional().isURL(),
    body('images').optional().isArray({ max: 10 }),
    body('images.*').optional().isURL(),
    body('inStock').optional().isBoolean(),
    body('stockCount').optional().isInt({ min: 0 }),
  ],
};

// Comment validations
export const commentValidations = {
  create: [
    body('content').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be 1-500 characters'),
    body('streamId').isUUID(),
    body('replyToId').optional().isUUID(),
  ],
};

// Search validations
export const searchValidations = {
  search: [
    query('q').trim().isLength({ min: 1, max: 100 }).withMessage('Search query must be 1-100 characters'),
    query('type').optional().isIn(['products', 'streams', 'users']).withMessage('Invalid search type'),
    ...commonValidations.pagination,
  ],
};

// Helper function to create custom validation chains
export function createValidationChain(validations: ValidationChain[]): (req: Request, res: Response, next: NextFunction) => void {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    handleValidationErrors(req, res, next);
  };
}