export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailProvider {
  /** Human-readable provider name, used in logs. */
  readonly name: string;
  send(message: MailMessage): Promise<void>;
}

export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');
