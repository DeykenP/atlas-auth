import { randomBytes, createHash } from 'crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HashingService } from '../../common/hashing/hashing.service';
import { MailService } from '../../mail/mail.service';
import { UsersRepository } from '../../users/repositories/users.repository';
import { SessionsService } from '../../sessions/services/sessions.service';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { RequestContext } from '../interfaces/request-context.interface';
import { PASSWORD_CHANGED, PasswordChangedEvent } from '../events/password-changed.event';

@Injectable()
export class PasswordService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly hashingService: HashingService,
    private readonly mailService: MailService,
    private readonly sessionsService: SessionsService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Always succeeds from the caller's perspective — never reveals whether the email exists. */
  async requestReset(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email.toLowerCase());
    if (!user) {
      return;
    }

    await this.passwordResetRepository.invalidateOutstanding(user.id);

    const token = randomBytes(32).toString('base64url');
    const ttlMinutes = this.config.getOrThrow<number>('security.tokenTtl.passwordResetMinutes');

    await this.passwordResetRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(token),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });

    await this.mailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(
    tokenPlain: string,
    newPassword: string,
    context: RequestContext,
  ): Promise<void> {
    const record = await this.passwordResetRepository.findByHash(this.hashToken(tokenPlain));
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await this.hashingService.hash(newPassword);
    await this.usersRepository.updatePassword(record.userId, passwordHash);
    await this.passwordResetRepository.markConsumed(record.id);

    // A password reset means the account may have been compromised — kill every session.
    await this.sessionsService.revokeAllSessions(record.userId, context);

    this.eventEmitter.emit(
      PASSWORD_CHANGED,
      new PasswordChangedEvent(record.userId, 'reset', context),
    );
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    currentPassword: string,
    newPassword: string,
    context: RequestContext,
  ): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const matches = await this.hashingService.verify(user.passwordHash, currentPassword);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await this.hashingService.hash(newPassword);
    await this.usersRepository.updatePassword(userId, passwordHash);

    // Keep the session the user is actively using; kill every other one.
    await this.sessionsService.revokeAllOtherSessions(userId, currentSessionId, context);

    this.eventEmitter.emit(PASSWORD_CHANGED, new PasswordChangedEvent(userId, 'change', context));
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
