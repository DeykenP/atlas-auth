import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';

const CONFIG: Record<string, unknown> = {
  'jwt.accessSecret': 'unit-test-secret-at-least-32-characters-long',
  'jwt.accessExpiresIn': '15m',
  'jwt.refreshExpiresIn': '30d',
  'jwt.issuer': 'atlas-auth-test',
  'jwt.audience': 'atlas-auth-test-clients',
};

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        TokenService,
        {
          provide: ConfigService,
          useValue: { getOrThrow: (key: string) => CONFIG[key] },
        },
      ],
    }).compile();

    tokenService = module.get(TokenService);
  });

  describe('signAccessToken', () => {
    it('signs a JWT carrying the given claims plus a jti and expiry', async () => {
      const result = await tokenService.signAccessToken({
        sub: 'user-1',
        email: 'jane@example.com',
        roles: ['admin'],
        permissions: ['users:read'],
        sessionId: 'session-1',
      });

      expect(result.token.split('.')).toHaveLength(3);
      expect(result.jti).toMatch(/^[0-9a-f-]{36}$/);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('generates a distinct jti for every call', async () => {
      const payload = {
        sub: 'user-1',
        email: 'jane@example.com',
        roles: [],
        permissions: [],
        sessionId: 'session-1',
      };
      const a = await tokenService.signAccessToken(payload);
      const b = await tokenService.signAccessToken(payload);
      expect(a.jti).not.toBe(b.jti);
      expect(a.token).not.toBe(b.token);
    });
  });

  describe('generateRefreshToken', () => {
    it('produces a random opaque token and a matching sha256 hash', () => {
      const result = tokenService.generateRefreshToken();
      expect(result.token).not.toEqual(result.tokenHash);
      expect(result.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(tokenService.hashRefreshToken(result.token)).toBe(result.tokenHash);
    });

    it('never reuses a token across calls', () => {
      const a = tokenService.generateRefreshToken();
      const b = tokenService.generateRefreshToken();
      expect(a.token).not.toBe(b.token);
    });
  });

  describe('TTL helpers', () => {
    it('reports the access and refresh TTLs in milliseconds', () => {
      expect(tokenService.getAccessTokenTtlMs()).toBe(15 * 60 * 1000);
      expect(tokenService.getRefreshTokenTtlMs()).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });
});
