import { randomBytes, createHash } from 'crypto';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailTokenType } from '@prisma/client';
import { MailService } from '../../mail/mail.service';
import { UsersRepository } from '../../users/repositories/users.repository';
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import { RequestContext } from '../interfaces/request-context.interface';

export class EmailVerifiedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly type: EmailTokenType,
    public readonly context: RequestContext,
  ) {}
}

export const EMAIL_VERIFIED = 'auth.email.verified';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendRegistrationVerification(userId: string, email: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (user?.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }
    const token = await this.issueToken(userId, EmailTokenType.REGISTRATION);
    await this.mailService.sendVerificationEmail(email, token);
  }

  async requestEmailChange(userId: string, newEmail: string): Promise<void> {
    const normalized = newEmail.toLowerCase();
    const taken = await this.usersRepository.findByEmail(normalized);
    if (taken) {
      throw new ConflictException('An account with this email already exists');
    }

    const token = await this.issueToken(userId, EmailTokenType.EMAIL_CHANGE, normalized);
    await this.mailService.sendEmailChangeConfirmation(normalized, token);
  }

  async verify(tokenPlain: string, context: RequestContext): Promise<void> {
    const tokenHash = createHash('sha256').update(tokenPlain).digest('hex');
    const record = await this.emailVerificationRepository.findByHash(tokenHash);

    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.usersRepository.findById(record.userId);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    let verifiedEmail = user.email;
    if (record.type === EmailTokenType.EMAIL_CHANGE) {
      if (!record.newEmail) {
        throw new BadRequestException('Invalid or expired verification token');
      }
      const taken = await this.usersRepository.findByEmail(record.newEmail);
      if (taken && taken.id !== user.id) {
        throw new ConflictException('An account with this email already exists');
      }
      await this.usersRepository.updateEmail(user.id, record.newEmail);
      verifiedEmail = record.newEmail;
    } else {
      await this.usersRepository.markEmailVerified(user.id);
    }

    await this.emailVerificationRepository.markConsumed(record.id);

    this.eventEmitter.emit(
      EMAIL_VERIFIED,
      new EmailVerifiedEvent(user.id, verifiedEmail, record.type, context),
    );
  }

  private async issueToken(
    userId: string,
    type: EmailTokenType,
    newEmail?: string,
  ): Promise<string> {
    await this.emailVerificationRepository.invalidateOutstanding(userId, type);

    const token = randomBytes(32).toString('base64url');
    const ttlMinutes = this.config.getOrThrow<number>('security.tokenTtl.emailVerificationMinutes');

    await this.emailVerificationRepository.create({
      userId,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      type,
      newEmail,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });

    return token;
  }
}
