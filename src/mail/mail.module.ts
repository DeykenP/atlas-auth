import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_PROVIDER, MailProvider } from './interfaces/mail-provider.interface';
import { SmtpProvider } from './providers/smtp.provider';
import { MailtrapProvider } from './providers/mailtrap.provider';
import { ResendProvider } from './providers/resend.provider';
import { SendgridProvider } from './providers/sendgrid.provider';
import { MailService } from './mail.service';

function createMailProvider(config: ConfigService): MailProvider {
  const provider = config.getOrThrow<string>('mail.provider');
  const from = config.getOrThrow<string>('mail.from');

  switch (provider) {
    case 'resend':
      return new ResendProvider(config.getOrThrow<string>('mail.resend.apiKey'), from);
    case 'sendgrid':
      return new SendgridProvider(config.getOrThrow<string>('mail.sendgrid.apiKey'), from);
    case 'mailtrap':
      return new MailtrapProvider({
        host: config.getOrThrow<string>('mail.mailtrap.host'),
        port: config.getOrThrow<number>('mail.mailtrap.port'),
        user: config.get<string>('mail.mailtrap.user'),
        password: config.get<string>('mail.mailtrap.password'),
        from,
      });
    case 'smtp':
    default:
      return new SmtpProvider({
        host: config.getOrThrow<string>('mail.smtp.host'),
        port: config.getOrThrow<number>('mail.smtp.port'),
        user: config.get<string>('mail.smtp.user') || undefined,
        password: config.get<string>('mail.smtp.password') || undefined,
        secure: config.getOrThrow<boolean>('mail.smtp.secure'),
        from,
      });
  }
}

@Global()
@Module({
  providers: [
    {
      provide: MAIL_PROVIDER,
      inject: [ConfigService],
      useFactory: createMailProvider,
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
