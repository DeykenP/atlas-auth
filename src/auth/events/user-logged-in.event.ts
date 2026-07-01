import { RequestContext } from '../interfaces/request-context.interface';

export class UserLoggedInEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly sessionId: string,
    public readonly context: RequestContext,
  ) {}
}
