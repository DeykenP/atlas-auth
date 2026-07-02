import { SmtpProvider, SmtpOptions } from './smtp.provider';

/** Mailtrap sandbox is plain SMTP with dedicated credentials. */
export class MailtrapProvider extends SmtpProvider {
  override readonly name = 'mailtrap';

  constructor(options: Omit<SmtpOptions, 'secure'>) {
    super({ ...options, secure: false });
  }
}
