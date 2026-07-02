import { MailMessage, MailProvider } from '../interfaces/mail-provider.interface';

export class SendgridProvider implements MailProvider {
  readonly name = 'sendgrid';

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: this.parseAddress(this.from) },
        subject: message.subject,
        content: [
          { type: 'text/plain', value: message.text },
          { type: 'text/html', value: message.html },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`SendGrid API responded ${response.status}: ${body}`);
    }
  }

  /** Accepts either "user@host" or "Display Name <user@host>". */
  private parseAddress(from: string): string {
    const match = /<([^>]+)>/.exec(from);
    return match ? match[1] : from;
  }
}
