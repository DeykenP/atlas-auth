import { RequestContext } from '../interfaces/request-context.interface';

export const PASSWORD_CHANGED = 'auth.password.changed';

export type PasswordChangeMethod = 'reset' | 'change';

export class PasswordChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly method: PasswordChangeMethod,
    public readonly context: RequestContext,
  ) {}
}
