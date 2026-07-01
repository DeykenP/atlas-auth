export enum AuthEventName {
  USER_REGISTERED = 'auth.user.registered',
  USER_LOGGED_IN = 'auth.user.logged_in',
  USER_LOGGED_OUT = 'auth.user.logged_out',
  LOGIN_FAILED = 'auth.login.failed',
  TOKEN_REFRESHED = 'auth.token.refreshed',
  TOKEN_REUSE_DETECTED = 'auth.token.reuse_detected',
}
