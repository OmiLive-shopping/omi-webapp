export const ROLES = {
  ADMIN: 'admin',
  STREAMER: 'streamer',
  USER: 'user',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'products.create',
    'products.update',
    'products.delete',
    'categories.create',
    'categories.update',
    'categories.delete',
    'streams.create',
    'streams.update',
    'streams.delete',
    'streams.moderate',
    'users.view',
    'users.update',
    'users.delete',
    'api-keys.manage',
  ],
  [ROLES.STREAMER]: [
    'streams.create',
    'streams.update',
    'streams.delete',
    'streams.moderate',
    'products.view',
  ],
  [ROLES.USER]: ['products.view', 'streams.view', 'profile.update'],
} as const;

export type Permission = (typeof ROLE_PERMISSIONS)[Role][number];
