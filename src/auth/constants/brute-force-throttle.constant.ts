/**
 * Tighter rate limit for credential/enumeration-sensitive endpoints, on top
 * of the global default and the account lockout in AuthService.
 *
 * Deliberately set above ACCOUNT_LOCKOUT_MAX_ATTEMPTS (default 5): this guard
 * runs before the login handler, so if its limit were <= the lockout
 * threshold it would always 429 first and the account-lockout response
 * would never surface. This layer's job is to catch a high-volume attacker
 * hitting many different accounts from one IP, not to duplicate the
 * per-account lockout.
 */
export const BRUTE_FORCE_THROTTLE = {
  default: { limit: 10, ttl: 60_000 },
};
