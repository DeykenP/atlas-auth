import { RenderedTemplate, actionButton, renderLayout } from './layout';

export function verifyEmailTemplate(verificationUrl: string, ttlMinutes: number): RenderedTemplate {
  const subject = 'Verify your email address';
  const body = `
    <p>Thanks for signing up. Confirm your email address to activate your account.</p>
    ${actionButton(verificationUrl, 'Verify email')}
    <p>This link expires in ${ttlMinutes} minutes.</p>`;

  return {
    subject,
    html: renderLayout(subject, body),
    text: `Verify your email address\n\nOpen this link to confirm your account:\n${verificationUrl}\n\nThis link expires in ${ttlMinutes} minutes.`,
  };
}
