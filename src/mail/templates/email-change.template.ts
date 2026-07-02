import { RenderedTemplate, actionButton, renderLayout } from './layout';

export function emailChangeTemplate(verificationUrl: string, ttlMinutes: number): RenderedTemplate {
  const subject = 'Confirm your new email address';
  const body = `
    <p>A request was made to change the email on your account to this address.
    Confirm the change below.</p>
    ${actionButton(verificationUrl, 'Confirm new email')}
    <p>This link expires in ${ttlMinutes} minutes. If you didn't request this change,
    ignore this email and the address on the account will stay as it is.</p>`;

  return {
    subject,
    html: renderLayout(subject, body),
    text: `Confirm your new email address\n\nOpen this link to confirm the change:\n${verificationUrl}\n\nThis link expires in ${ttlMinutes} minutes.`,
  };
}
