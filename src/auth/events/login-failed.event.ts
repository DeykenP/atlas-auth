import { LoginStatus } from '@prisma/client';
import { RequestContext } from '../interfaces/request-context.interface';

export class LoginFailedEvent {
  constructor(
    public readonly email: string,
    public readonly status: LoginStatus,
    public readonly context: RequestContext,
    public readonly userId?: string,
  ) {}
}
