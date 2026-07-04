import { RequestContext } from '../../auth/interfaces/request-context.interface';

export const SESSION_REVOKED = 'sessions.session.revoked';
export const ALL_SESSIONS_REVOKED = 'sessions.all.revoked';

export class SessionRevokedEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly context: RequestContext,
  ) {}
}

export class AllSessionsRevokedEvent {
  constructor(
    public readonly userId: string,
    public readonly revokedCount: number,
    public readonly keptSessionId: string | null,
    public readonly context: RequestContext,
  ) {}
}
