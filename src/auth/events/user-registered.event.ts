import { RequestContext } from '../interfaces/request-context.interface';

export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly context: RequestContext,
  ) {}
}
