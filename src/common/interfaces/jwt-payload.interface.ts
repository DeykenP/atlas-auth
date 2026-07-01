export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  jti: string;
  iat?: number;
  exp?: number;
}
