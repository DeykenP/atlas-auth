import { Transporter, createTransport } from 'nodemailer';
import { MailMessage, MailProvider } from '../interfaces/mail-provider.interface';

export interface SmtpOptions {
  host: string;
  port: number;
  user?: string;
  password?: string;
  secure: boolean;
  from: string;
}

export class SmtpProvider implements MailProvider {
  readonly name: string = 'smtp';

  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(options: SmtpOptions) {
    this.from = options.from;
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user ? { user: options.user, pass: options.password } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
