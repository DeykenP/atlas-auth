import { RequestContext } from '../interfaces/request-context.interface';

export class TokenReuseDetectedEvent {
  constructor(
    public readonly userId: string,
    public readonly familyId: string,
    public readonly context: RequestContext,
  ) {}
}
