import { RequestContext } from '../interfaces/request-context.interface';

export class TokenRefreshedEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly context: RequestContext,
  ) {}
}
