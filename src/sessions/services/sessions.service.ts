import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenBlacklistService } from '../../auth/services/token-blacklist.service';
import { TokenService } from '../../auth/services/token.service';
import { RequestContext } from '../../auth/interfaces/request-context.interface';
import { SessionsRepository } from '../repositories/sessions.repository';
import { SessionWithDevice } from '../interfaces/session-with-device.interface';
import {
  ALL_SESSIONS_REVOKED,
  AllSessionsRevokedEvent,
  SESSION_REVOKED,
  SessionRevokedEvent,
} from '../events/session-revoked.event';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly tokenService: TokenService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  listActive(userId: string): Promise<SessionWithDevice[]> {
    return this.sessionsRepository.findActiveByUser(userId);
  }

  async revokeSession(userId: string, sessionId: string, context: RequestContext): Promise<void> {
    const session = await this.sessionsRepository.findById(sessionId);
    if (!session || session.isRevoked) {
      throw new NotFoundException('Session not found');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('You can only revoke your own sessions');
    }

    await this.sessionsRepository.revoke(sessionId);
    await this.tokenBlacklistService.blacklistSession(
      sessionId,
      this.tokenService.getAccessTokenTtlMs(),
    );

    this.eventEmitter.emit(SESSION_REVOKED, new SessionRevokedEvent(userId, sessionId, context));
  }

  /** Revokes every other active session ("log out other devices"). */
  async revokeAllOtherSessions(
    userId: string,
    currentSessionId: string,
    context: RequestContext,
  ): Promise<number> {
    return this.revokeAll(userId, context, currentSessionId);
  }

  /** Revokes every active session for the user, e.g. after a password reset. */
  async revokeAllSessions(userId: string, context: RequestContext): Promise<number> {
    return this.revokeAll(userId, context);
  }

  private async revokeAll(
    userId: string,
    context: RequestContext,
    exceptSessionId?: string,
  ): Promise<number> {
    const revokedIds = await this.sessionsRepository.revokeAllExcept(userId, exceptSessionId);

    const accessTtl = this.tokenService.getAccessTokenTtlMs();
    await Promise.all(
      revokedIds.map((sessionId) =>
        this.tokenBlacklistService.blacklistSession(sessionId, accessTtl),
      ),
    );

    this.eventEmitter.emit(
      ALL_SESSIONS_REVOKED,
      new AllSessionsRevokedEvent(userId, revokedIds.length, exceptSessionId ?? null, context),
    );

    return revokedIds.length;
  }
}
