import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  APP_URL: Joi.string().uri().required(),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGINS: Joi.string().required(),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TLS: Joi.boolean().default(false),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  JWT_ISSUER: Joi.string().default('atlas-auth'),
  JWT_AUDIENCE: Joi.string().default('atlas-auth-clients'),

  COOKIE_SECRET: Joi.string().min(32).required(),
  REFRESH_TOKEN_COOKIE_NAME: Joi.string().default('refresh_token'),
  COOKIE_SECURE: Joi.boolean().default(true),

  ARGON2_MEMORY_COST: Joi.number().default(19456),
  ARGON2_TIME_COST: Joi.number().default(2),
  ARGON2_PARALLELISM: Joi.number().default(1),

  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: Joi.number().default(5),
  ACCOUNT_LOCKOUT_DURATION_MINUTES: Joi.number().default(15),

  THROTTLE_TTL_SECONDS: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: Joi.number().default(60),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: Joi.number().default(30),

  MAIL_PROVIDER: Joi.string().valid('smtp', 'resend', 'sendgrid', 'mailtrap').default('smtp'),
  MAIL_FROM: Joi.string().required(),

  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  SMTP_SECURE: Joi.boolean().default(false),

  RESEND_API_KEY: Joi.string().allow('').optional(),

  SENDGRID_API_KEY: Joi.string().allow('').optional(),

  MAILTRAP_HOST: Joi.string().optional(),
  MAILTRAP_PORT: Joi.number().port().optional(),
  MAILTRAP_USER: Joi.string().allow('').optional(),
  MAILTRAP_PASSWORD: Joi.string().allow('').optional(),

  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
});
