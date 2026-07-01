import { RequestContext } from '../interfaces/request-context.interface';

export class UserLoggedOutEvent {
  constructor(
    public readonly userId: string,
    public readonly sessionId: string,
    public readonly context: RequestContext,
  ) {}
}
