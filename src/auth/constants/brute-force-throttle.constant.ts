/**
 * Tighter rate limit for credential/enumeration-sensitive endpoints, on top
 * of the global default and the account lockout in AuthService.
 */
export const BRUTE_FORCE_THROTTLE = {
  default: { limit: 5, ttl: 60_000 },
};
