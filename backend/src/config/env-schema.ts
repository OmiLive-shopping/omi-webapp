import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().url(),
  SHADOW_DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  WHITE_LIST_URLS: z
    .string()
    .transform(value => value.split(',').map(url => url.trim()))
    .refine(urls => urls.every(url => z.string().url().safeParse(url).success), {
      message: 'Each value in WHITE_LIST_URLS must be a valid URL',
    }),
  CLIENT_URL: z.string().url().optional(),
  SOCKET_ADMIN_USERNAME: z.string().optional(),
  SOCKET_ADMIN_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().url().optional().default('redis://localhost:6379'),
  API_KEY_HEADER: z.string().optional().default('x-api-key'),
  
  // Security Configuration
  SECURITY_ENABLE_AUDIT_LOGGING: z.string().transform(val => val === 'true').optional().default('true'),
  SECURITY_MAX_ANONYMOUS_CONNECTIONS: z.coerce.number().optional().default(1000),
  SECURITY_SUSPICIOUS_ACTIVITY_THRESHOLD: z.coerce.number().optional().default(10),
  SECURITY_BLOCK_SUSPICIOUS_IPS: z.string().transform(val => val === 'true').optional().default('true'),
  SECURITY_MAX_PAYLOAD_SIZE: z.coerce.number().optional().default(1048576), // 1MB
  SECURITY_MAX_MESSAGE_LENGTH: z.coerce.number().optional().default(10000), // 10KB
});

export type EnvVars = z.infer<typeof envSchema>;
