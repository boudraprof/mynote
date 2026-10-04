import { z } from 'zod'

// ---------------------------------------------------------------------------
// Lightweight origin parsing — safe to import from client and server code.
// ---------------------------------------------------------------------------

const DEFAULT_ORIGINS = 'http://localhost:3000,https://mynote-demo.vercel.app'

export const parseOrigins = (origins: string): Array<string> => {
  return origins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

const envVar = (key: string, fallback: string): string =>
  typeof process !== 'undefined' && process.env[key]
    ? process.env[key]
    : fallback

export const trustedOrigins = parseOrigins(
  envVar('BETTER_AUTH_TRUSTED_ORIGINS', DEFAULT_ORIGINS),
)
export const allowedOrigins = parseOrigins(
  envVar('ALLOWED_ORIGINS', DEFAULT_ORIGINS),
)

// ---------------------------------------------------------------------------
// Strict environment validation — server-side only.
//
// Do NOT parse at module import time: this module is bundled for the client,
// where secrets are absent. Call `getEnv()` from server code (route handlers,
// server functions, middleware) when validated configuration is needed.
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),

  // Better Auth server
  BETTER_AUTH_SECRET: z.string().min(1, 'Better Auth secret is required'),
  BETTER_AUTH_BASE_URL: z.string().url('Invalid Better Auth base URL'),
  BETTER_AUTH_BASE_PATH: z.string().default('v1/api'),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string(),
  BETTER_AUTH_SECURE_COOKIES: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
  BETTER_AUTH_COOKIE_SAMESITE: z
    .enum(['lax', 'strict'])
    .optional()
    .default('lax'),

  // Better Auth client (Vite — available on both server and client via process.env / import.meta.env)
  VITE_BETTER_AUTH_BASE_URL: z.string().url('Invalid Vite Better Auth base URL'),
  VITE_BETTER_AUTH_BASE_PATH: z.string().default('v1/api'),

  // Google OAuth (server)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Google OAuth (client-side flag)
  VITE_GOOGLE_CLIENT_ID: z.string().optional(),

  // App URLs
  VITE_APP_URL: z.string().url('Invalid app URL'),
  APP_URL: z.string().url('Invalid app URL'),

  // CORS / Security
  ALLOWED_ORIGINS: z.string(),

  // SMTP (email)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional().default('noreply@example.com'),
  SMTP_FROM_NAME: z.string().optional(),

  // Cloudinary (image uploads)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Sentry (error tracking)
  VITE_SENTRY_DSN: z.string().optional(),

  // Logging
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error'])
    .optional()
    .default('info'),

  // Node environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Server port (used in server.mjs)
  PORT: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
})

export type Env = z.infer<typeof envSchema>

export function getEnv(): Env {
  try {
    return envSchema.parse({ ...process.env, ...import.meta.env })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n  ')
      throw new Error(
        `Invalid environment variables:\n  ${missingVars}\n\nPlease check your .env file against .env.example`,
      )
    }
    throw error
  }
}
