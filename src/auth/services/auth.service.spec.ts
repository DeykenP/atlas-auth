import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { LoginStatus } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuthEventName } from '../events';

const NOW = new Date('2026-01-01T00:00:00.000Z');

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'jane@example.com',
    passwordHash: 'hashed-password',
    firstName: null,
    lastName: null,
    avatarUrl: null,
    isEmailVerified: false,
    failedLoginAttempts: 0,
    lockedUntil: null as Date | null,
    lastLoginAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

describe('AuthService', () => {
  let usersRepository: Record<string, jest.Mock>;
  let usersService: Record<string, jest.Mock>;
  let authRepository: Record<string, jest.Mock>;
  let hashingService: Record<string, jest.Mock>;
  let tokenService: Record<string, jest.Mock>;
  let tokenBlacklistService: Record<string, jest.Mock>;
  let eventEmitter: Record<string, jest.Mock>;
  let config: Record<string, jest.Mock>;
  let authService: AuthService;

  const device = { id: 'device-1' };
  const session = { id: 'session-1', isRevoked: false, userId: 'user-1' };
  const signedAccessToken = { token: 'access-token', jti: 'jti-1', expiresAt: NOW };
  const generatedRefreshToken = {
    token: 'refresh-plain',
    tokenHash: 'refresh-hash',
    expiresAt: NOW,
  };

  beforeEach(() => {
    usersRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findWithAccessById: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
      registerFailedLoginAttempt: jest.fn(),
    };
    usersService = {
      extractRolesAndPermissions: jest.fn().mockReturnValue({ roles: [], permissions: [] }),
    };
    authRepository = {
      upsertDevice: jest.fn().mockResolvedValue(device),
      createSession: jest.fn().mockResolvedValue(session),
      findSessionById: jest.fn(),
      revokeSession: jest.fn(),
      touchSession: jest.fn(),
      createRefreshToken: jest.fn(),
      findRefreshTokenByHash: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeRefreshTokenFamily: jest.fn(),
    };
    hashingService = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      verify: jest.fn(),
    };
    tokenService = {
      signAccessToken: jest.fn().mockResolvedValue(signedAccessToken),
      generateRefreshToken: jest.fn().mockReturnValue(generatedRefreshToken),
      hashRefreshToken: jest.fn().mockReturnValue('refresh-hash'),
      getAccessTokenTtlMs: jest.fn().mockReturnValue(15 * 60 * 1000),
    };
    tokenBlacklistService = {
      blacklist: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };
    config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, number> = {
          'security.accountLockout.maxAttempts': 5,
          'security.accountLockout.durationMinutes': 15,
        };
        return values[key];
      }),
    };

    authService = new AuthService(
      usersRepository as never,
      usersService as never,
      authRepository as never,
      hashingService as never,
      tokenService as never,
      tokenBlacklistService as never,
      eventEmitter as never,
      config as never,
    );
  });

  describe('register', () => {
    it('throws ConflictException when the email is already taken', async () => {
      usersRepository.findByEmail.mockResolvedValue(buildUser());

      await expect(
        authService.register({ email: 'jane@example.com', password: 'Str0ng!Passw0rd' }, {}),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(usersRepository.create).not.toHaveBeenCalled();
    });

    it('hashes the password, creates the user, and issues a session', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      const created = buildUser();
      usersRepository.create.mockResolvedValue(created);

      const result = await authService.register(
        { email: 'Jane@Example.com', password: 'Str0ng!Passw0rd', firstName: 'Jane' },
        { ipAddress: '127.0.0.1' },
      );

      expect(hashingService.hash).toHaveBeenCalledWith('Str0ng!Passw0rd');
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'jane@example.com', passwordHash: 'hashed-password' }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuthEventName.USER_REGISTERED,
        expect.objectContaining({ userId: created.id, email: created.email }),
      );
      expect(result.tokens.accessToken).toBe(signedAccessToken);
      expect(result.tokens.refreshToken).toBe(generatedRefreshToken);
      expect(result.tokens.sessionId).toBe(session.id);
    });
  });

  describe('login', () => {
    it('rejects and logs FAILED_NOT_FOUND when no user matches the email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'ghost@example.com', password: 'x' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuthEventName.LOGIN_FAILED,
        expect.objectContaining({ status: LoginStatus.FAILED_NOT_FOUND }),
      );
    });

    it('rejects a locked account without checking the password', async () => {
      const lockedUntil = new Date(Date.now() + 60_000);
      usersRepository.findByEmail.mockResolvedValue(buildUser({ lockedUntil }));

      await expect(
        authService.login({ email: 'jane@example.com', password: 'x' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(hashingService.verify).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuthEventName.LOGIN_FAILED,
        expect.objectContaining({ status: LoginStatus.FAILED_LOCKED }),
      );
    });

    it('allows login again once the lockout window has passed', async () => {
      const lockedUntil = new Date(Date.now() - 60_000);
      usersRepository.findByEmail.mockResolvedValue(buildUser({ lockedUntil }));
      hashingService.verify.mockResolvedValue(true);

      await expect(
        authService.login({ email: 'jane@example.com', password: 'correct' }, {}),
      ).resolves.toBeDefined();
    });

    it('registers a failed attempt and rejects on wrong password', async () => {
      const user = buildUser();
      usersRepository.findByEmail.mockResolvedValue(user);
      hashingService.verify.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'jane@example.com', password: 'wrong' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(usersRepository.registerFailedLoginAttempt).toHaveBeenCalledWith(user.id, 5, 15);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuthEventName.LOGIN_FAILED,
        expect.objectContaining({ status: LoginStatus.FAILED_PASSWORD }),
      );
    });

    it('resets attempts, issues a session, and emits USER_LOGGED_IN on success', async () => {
      const user = buildUser();
      usersRepository.findByEmail.mockResolvedValue(user);
      hashingService.verify.mockResolvedValue(true);

      const result = await authService.login(
        { email: 'jane@example.com', password: 'correct' },
        { ipAddress: '10.0.0.1' },
      );

      expect(usersRepository.recordSuccessfulLogin).toHaveBeenCalledWith(user.id);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuthEventName.USER_LOGGED_IN,
        expect.objectContaining({ userId: user.id, sessionId: session.id }),
      );
      expect(result.tokens.accessToken).toBe(signedAccessToken);
    });
  });

  describe('refresh', () => {
    it('rejects an unknown refresh token', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue(null);

      await expect(authService.refresh('nope', {})).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('detects reuse of an already-rotated token and revokes the whole family', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        sessionId: session.id,
        familyId: 'family-1',
        revokedAt: NOW,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(authService.refresh('stale-token', {})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(authRepository.revokeRefreshTokenFamily).toHaveBeenCalledWith('family-1');
      expect(authRepository.revokeSession).toHaveBeenCalledWith(session.id);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuthEventName.TOKEN_REUSE_DETECTED,
        expect.objectContaining({ familyId: 'family-1' }),
      );
    });

    it('rejects an expired refresh token', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        sessionId: session.id,
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(authService.refresh('expired', {})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects when the session has been revoked', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        sessionId: session.id,
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      authRepository.findSessionById.mockResolvedValue({ ...session, isRevoked: true });

      await expect(authService.refresh('valid-but-session-dead', {})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rotates the token and issues a fresh access token on success', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        sessionId: session.id,
        familyId: 'family-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      authRepository.findSessionById.mockResolvedValue(session);
      usersRepository.findById.mockResolvedValue(buildUser());

      const result = await authService.refresh('valid-token', {});

      expect(authRepository.createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ familyId: 'family-1', sessionId: session.id }),
      );
      expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith('rt-1', 'refresh-hash');
      expect(result.tokens.accessToken).toBe(signedAccessToken);
    });
  });

  describe('logout', () => {
    it('revokes the session and blacklists the access token', async () => {
      authRepository.findRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        familyId: 'family-1',
      });

      await authService.logout(
        { sub: 'user-1', sessionId: session.id },
        'refresh-plain',
        'jti-1',
        Math.floor(Date.now() / 1000) + 900,
        {},
      );

      expect(authRepository.revokeRefreshTokenFamily).toHaveBeenCalledWith('family-1');
      expect(authRepository.revokeSession).toHaveBeenCalledWith(session.id);
      expect(tokenBlacklistService.blacklist).toHaveBeenCalledWith('jti-1', expect.any(Number));
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuthEventName.USER_LOGGED_OUT,
        expect.objectContaining({ userId: 'user-1', sessionId: session.id }),
      );
    });
  });
});
