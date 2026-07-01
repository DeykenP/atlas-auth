import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoginStatus } from '@prisma/client';
import {
  AuthEventName,
  LoginFailedEvent,
  TokenReuseDetectedEvent,
  UserLoggedInEvent,
  UserLoggedOutEvent,
  UserRegisteredEvent,
} from '../../auth/events';
import { AuditLogRepository } from './audit-log.repository';
import { LoginHistoryRepository } from './login-history.repository';

@Injectable()
export class AuditListener {
  private readonly logger = new Logger(AuditListener.name);

  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly loginHistoryRepository: LoginHistoryRepository,
  ) {}

  @OnEvent(AuthEventName.USER_REGISTERED)
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
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
    await this.loginHistoryRepository.record({
      userId: event.userId,
      email: event.email,
      status: event.status,
      ipAddress: event.context.ipAddress,
      userAgent: event.context.userAgent,
    });
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
}
