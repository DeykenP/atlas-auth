import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  cookieSecret: process.env.COOKIE_SECRET,
  refreshTokenCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME ?? 'refresh_token',
  cookieSecure: process.env.COOKIE_SECURE !== 'false',
  argon2: {
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST ?? '19456', 10),
    timeCost: parseInt(process.env.ARGON2_TIME_COST ?? '2', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM ?? '1', 10),
  },
  accountLockout: {
    maxAttempts: parseInt(process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS ?? '5', 10),
    durationMinutes: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES ?? '15', 10),
  },
  throttle: {
    ttlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
  tokenTtl: {
    emailVerificationMinutes: parseInt(
      process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES ?? '60',
      10,
    ),
    passwordResetMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? '30', 10),
  },
}));
