import { randomUUID } from 'crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoginStatus, User } from '@prisma/client';
import { HashingService } from '../../common/hashing/hashing.service';
import { computeDeviceFingerprint } from '../../common/utils/fingerprint.util';
import { UsersRepository } from '../../users/repositories/users.repository';
import { UsersService } from '../../users/services/users.service';
import { AuthRepository } from '../repositories/auth.repository';
import { TokenService } from './token.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RequestContext } from '../interfaces/request-context.interface';
import { SessionTokens } from '../interfaces/session-tokens.interface';
import {
  AuthEventName,
  LoginFailedEvent,
  TokenRefreshedEvent,
  TokenReuseDetectedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserRegisteredEvent,
} from '../events';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
    private readonly hashingService: HashingService,
    private readonly tokenService: TokenService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    context: RequestContext,
  ): Promise<{ user: User; tokens: SessionTokens }> {
    const existing = await this.usersRepository.findByEmail(dto.email.toLowerCase());
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.hashingService.hash(dto.password);
    const user = await this.usersRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    this.eventEmitter.emit(
      AuthEventName.USER_REGISTERED,
      new UserRegisteredEvent(user.id, user.email, context),
    );

    const tokens = await this.issueSession(user, context);
    return { user, tokens };
  }

  async login(
    dto: LoginDto,
    context: RequestContext,
  ): Promise<{ user: User; tokens: SessionTokens }> {
    const email = dto.email.toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      this.eventEmitter.emit(
        AuthEventName.LOGIN_FAILED,
        new LoginFailedEvent(email, LoginStatus.FAILED_NOT_FOUND, context),
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      this.eventEmitter.emit(
        AuthEventName.LOGIN_FAILED,
        new LoginFailedEvent(email, LoginStatus.FAILED_LOCKED, context, user.id),
      );
      throw new UnauthorizedException(
        'Account temporarily locked due to too many failed login attempts',
      );
    }

    const passwordMatches = await this.hashingService.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      await this.usersRepository.registerFailedLoginAttempt(
        user.id,
        this.config.getOrThrow<number>('security.accountLockout.maxAttempts'),
        this.config.getOrThrow<number>('security.accountLockout.durationMinutes'),
      );
      this.eventEmitter.emit(
        AuthEventName.LOGIN_FAILED,
        new LoginFailedEvent(email, LoginStatus.FAILED_PASSWORD, context, user.id),
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersRepository.recordSuccessfulLogin(user.id);
    const tokens = await this.issueSession(user, context);

    this.eventEmitter.emit(
      AuthEventName.USER_LOGGED_IN,
      new UserLoggedInEvent(user.id, user.email, tokens.sessionId, context),
    );

    return { user, tokens };
  }

  async refresh(
    refreshTokenPlain: string,
    context: RequestContext,
  ): Promise<{ user: User; tokens: SessionTokens }> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshTokenPlain);
    const existing = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      await this.authRepository.revokeRefreshTokenFamily(existing.familyId);
      await this.authRepository.revokeSession(existing.sessionId);
      this.eventEmitter.emit(
        AuthEventName.TOKEN_REUSE_DETECTED,
        new TokenReuseDetectedEvent(existing.userId, existing.familyId, context),
      );
      throw new UnauthorizedException('Refresh token reuse detected; session revoked');
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const session = await this.authRepository.findSessionById(existing.sessionId);
    if (!session || session.isRevoked) {
      throw new UnauthorizedException('Session has been revoked');
    }

    const user = await this.usersRepository.findById(existing.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newRefreshToken = this.tokenService.generateRefreshToken();
    await this.authRepository.createRefreshToken({
      userId: user.id,
      sessionId: session.id,
      familyId: existing.familyId,
      tokenHash: newRefreshToken.tokenHash,
      expiresAt: newRefreshToken.expiresAt,
      createdByIp: context.ipAddress,
    });
    await this.authRepository.revokeRefreshToken(existing.id, newRefreshToken.tokenHash);
    await this.authRepository.touchSession(session.id, newRefreshToken.expiresAt);

    const accessToken = await this.signAccessTokenForUser(user, session.id);

    this.eventEmitter.emit(
      AuthEventName.TOKEN_REFRESHED,
      new TokenRefreshedEvent(user.id, session.id, context),
    );

    return {
      user,
      tokens: { accessToken, refreshToken: newRefreshToken, sessionId: session.id },
    };
  }

  async logout(
    payload: { sub: string; sessionId: string },
    refreshTokenPlain: string | undefined,
    accessTokenJti: string,
    accessTokenExp: number | undefined,
    context: RequestContext,
  ): Promise<void> {
    if (refreshTokenPlain) {
      const tokenHash = this.tokenService.hashRefreshToken(refreshTokenPlain);
      const existing = await this.authRepository.findRefreshTokenByHash(tokenHash);
      if (existing) {
        await this.authRepository.revokeRefreshTokenFamily(existing.familyId);
      }
    }

    await this.authRepository.revokeSession(payload.sessionId);

    const remainingTtlMs = accessTokenExp
      ? accessTokenExp * 1000 - Date.now()
      : this.tokenService.getAccessTokenTtlMs();
    await this.tokenBlacklistService.blacklist(accessTokenJti, remainingTtlMs);

    this.eventEmitter.emit(
      AuthEventName.USER_LOGGED_OUT,
      new UserLoggedOutEvent(payload.sub, payload.sessionId, context),
    );
  }

  private async issueSession(user: User, context: RequestContext): Promise<SessionTokens> {
    const fingerprint = computeDeviceFingerprint(context.userAgent);
    const device = await this.authRepository.upsertDevice({
      userId: user.id,
      fingerprint,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    const refreshToken = this.tokenService.generateRefreshToken();
    const session = await this.authRepository.createSession({
      userId: user.id,
      deviceId: device.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      expiresAt: refreshToken.expiresAt,
    });

    const accessToken = await this.signAccessTokenForUser(user, session.id);

    await this.authRepository.createRefreshToken({
      userId: user.id,
      sessionId: session.id,
      familyId: randomUUID(),
      tokenHash: refreshToken.tokenHash,
      expiresAt: refreshToken.expiresAt,
      createdByIp: context.ipAddress,
    });

    return { accessToken, refreshToken, sessionId: session.id };
  }

  private async signAccessTokenForUser(user: User, sessionId: string) {
    const userWithAccess = await this.usersRepository.findWithAccessById(user.id);
    const { roles, permissions } = userWithAccess
      ? this.usersService.extractRolesAndPermissions(userWithAccess)
      : { roles: [], permissions: [] };

    return this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
      roles,
      permissions,
      sessionId,
    });
  }
}
