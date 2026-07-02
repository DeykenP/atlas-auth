import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PROVIDER, MailProvider } from './interfaces/mail-provider.interface';
import { verifyEmailTemplate } from './templates/verify-email.template';
import { emailChangeTemplate } from './templates/email-change.template';
import { passwordResetTemplate } from './templates/password-reset.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_PROVIDER) private readonly provider: MailProvider,
    private readonly config: ConfigService,
  ) {}

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/verify-email', token);
    const ttl = this.config.getOrThrow<number>('security.tokenTtl.emailVerificationMinutes');
    await this.deliver(to, 'verification', () => verifyEmailTemplate(url, ttl));
  }

  async sendEmailChangeConfirmation(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/verify-email', token);
    const ttl = this.config.getOrThrow<number>('security.tokenTtl.emailVerificationMinutes');
    await this.deliver(to, 'email change', () => emailChangeTemplate(url, ttl));
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = this.buildUrl('/reset-password', token);
    const ttl = this.config.getOrThrow<number>('security.tokenTtl.passwordResetMinutes');
    await this.deliver(to, 'password reset', () => passwordResetTemplate(url, ttl));
  }

  private buildUrl(path: string, token: string): string {
    const appUrl = this.config.getOrThrow<string>('app.url').replace(/\/$/, '');
    return `${appUrl}${path}?token=${encodeURIComponent(token)}`;
  }

  private async deliver(
    to: string,
    kind: string,
    render: () => { subject: string; html: string; text: string },
  ): Promise<void> {
    const { subject, html, text } = render();
    await this.provider.send({ to, subject, html, text });
    this.logger.log(`Sent ${kind} email via ${this.provider.name} to ${this.maskEmail(to)}`);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    const visible = local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
  }
}
