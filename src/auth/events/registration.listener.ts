import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailVerificationService } from '../services/email-verification.service';
import { AuthEventName } from './auth-event-name.enum';
import { UserRegisteredEvent } from './user-registered.event';

@Injectable()
export class RegistrationListener {
  private readonly logger = new Logger(RegistrationListener.name);

  constructor(private readonly emailVerificationService: EmailVerificationService) {}

  @OnEvent(AuthEventName.USER_REGISTERED)
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    try {
      await this.emailVerificationService.sendRegistrationVerification(event.userId, event.email);
    } catch (error) {
      // Registration must not fail because the mail provider is down; the
      // user can request a new link via /auth/resend-verification.
      this.logger.error(
        `Failed to send verification email to user ${event.userId}: ${(error as Error).message}`,
      );
    }
  }
}
