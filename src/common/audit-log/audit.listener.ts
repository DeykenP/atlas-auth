import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoginStatus } from '@prisma/client';
import {
  AuthEventName,
  LoginFailedEvent,
  TokenRefreshedEvent,
  TokenReuseDetectedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserRegisteredEvent,
} from '../../auth/events';
import {
  ALL_SESSIONS_REVOKED,
  AllSessionsRevokedEvent,
  SESSION_REVOKED,
  SessionRevokedEvent,
} from '../../sessions/events/session-revoked.event';
import { EMAIL_VERIFIED, EmailVerifiedEvent } from '../../auth/services/email-verification.service';
import { PASSWORD_CHANGED, PasswordChangedEvent } from '../../auth/events/password-changed.event';
import { RequestContext } from '../../auth/interfaces/request-context.interface';
import { AuditLogRepository } from './audit-log.repository';
import { LoginHistoryRepository } from './login-history.repository';

@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly loginHistoryRepository: LoginHistoryRepository,
  ) {}

  /** Nest's Logger only accepts a string context, so fold request metadata into the message itself. */
  private describe(context: RequestContext): string {
    return `[ip=${context.ipAddress ?? 'unknown'} ua="${context.userAgent ?? 'unknown'}"]`;
  }

  @OnEvent(AuthEventName.USER_REGISTERED)
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    this.logger.log(`User registered: ${event.email} ${this.describe(event.context)}`);
    await this.auditLogRepository.record({
      userId: event.userId,
      action: AuthEventName.USER_REGISTERED,
      entityType: 'User',
      entityId: event.userId,
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
    });
  }

  @OnEvent(AuthEventName.USER_LOGGED_IN)
  async handleUserLoggedIn(event: UserLoggedInEvent): Promise<void> {
    this.logger.log(
      `Login succeeded: ${event.email} session=${event.sessionId} ${this.describe(event.context)}`,
    );
    await Promise.all([
      this.loginHistoryRepository.record({
        userId: event.userId,
        email: event.email,
        status: LoginStatus.SUCCESS,
        ipAddress: event.context.ipAddress,
        userAgent: event.context.userAgent,
      }),
      this.auditLogRepository.record({
        userId: event.userId,
        action: AuthEventName.USER_LOGGED_IN,
        entityType: 'Session',
        entityId: event.sessionId,
        ipAddress: event.context.ipAddress,
        userAgent: event.context.userAgent,
      }),
    ]);
  }

  @OnEvent(AuthEventName.USER_LOGGED_OUT)
  async handleUserLoggedOut(event: UserLoggedOutEvent): Promise<void> {
    this.logger.log(
      `Logout: user ${event.userId} session=${event.sessionId} ${this.describe(event.context)}`,
    );
    await this.auditLogRepository.record({
      userId: event.userId,
      action: AuthEventName.USER_LOGGED_OUT,
      entityType: 'Session',
      entityId: event.sessionId,
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
    });
  }

  @OnEvent(AuthEventName.LOGIN_FAILED)
  async handleLoginFailed(event: LoginFailedEvent): Promise<void> {
    this.logger.warn(
      `Login failed (${event.status}): ${event.email} ${this.describe(event.context)}`,
    );
    await this.loginHistoryRepository.record({
      userId: event.userId,
      email: event.email,
      status: event.status,
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
    });
  }

  @OnEvent(AuthEventName.TOKEN_REFRESHED)
  handleTokenRefreshed(event: TokenRefreshedEvent): void {
    this.logger.log(
      `Access token refreshed: user ${event.userId} session=${event.sessionId} ${this.describe(event.context)}`,
    );
  }

  @OnEvent(AuthEventName.TOKEN_REUSE_DETECTED)
  async handleTokenReuseDetected(event: TokenReuseDetectedEvent): Promise<void> {
    this.logger.warn(
      `Refresh token reuse detected for user ${event.userId}, family ${event.familyId} — session family revoked`,
    );
    await this.auditLogRepository.record({
      userId: event.userId,
      action: AuthEventName.TOKEN_REUSE_DETECTED,
      entityType: 'RefreshTokenFamily',
      entityId: event.familyId,
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
    });
  }

  @OnEvent(EMAIL_VERIFIED)
  async handleEmailVerified(event: EmailVerifiedEvent): Promise<void> {
    await this.auditLogRepository.record({
      userId: event.userId,
      action: EMAIL_VERIFIED,
      entityType: 'User',
      entityId: event.userId,
      metadata: { email: event.email, type: event.type },
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
    });
  }

  @OnEvent(PASSWORD_CHANGED)
  async handlePasswordChanged(event: PasswordChangedEvent): Promise<void> {
    this.logger.log(
      `Password ${event.method}: user ${event.userId} ${this.describe(event.context)}`,
    );
    await this.auditLogRepository.record({
      userId: event.userId,
      action: PASSWORD_CHANGED,
      entityType: 'User',
      entityId: event.userId,
      metadata: { method: event.method },
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
    });
  }

  @OnEvent(SESSION_REVOKED)
  async handleSessionRevoked(event: SessionRevokedEvent): Promise<void> {
    this.logger.warn(
      `Session revoked: user ${event.userId} session=${event.sessionId} ${this.describe(event.context)}`,
    );
    await this.auditLogRepository.record({
      userId: event.userId,
      action: SESSION_REVOKED,
      entityType: 'Session',
      entityId: event.sessionId,
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
    });
  }

  @OnEvent(ALL_SESSIONS_REVOKED)
  async handleAllSessionsRevoked(event: AllSessionsRevokedEvent): Promise<void> {
    await this.auditLogRepository.record({
      userId: event.userId,
      action: ALL_SESSIONS_REVOKED,
      entityType: 'Session',
      metadata: { revokedCount: event.revokedCount, keptSessionId: event.keptSessionId },
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
    });
  }
}
