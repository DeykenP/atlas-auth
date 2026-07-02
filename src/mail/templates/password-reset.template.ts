import { RenderedTemplate, actionButton, renderLayout } from './layout';

export function passwordResetTemplate(resetUrl: string, ttlMinutes: number): RenderedTemplate {
  const subject = 'Reset your password';
  const body = `
    <p>A password reset was requested for your account. Set a new password below.</p>
    ${actionButton(resetUrl, 'Reset password')}
    <p>This link expires in ${ttlMinutes} minutes. If you didn't request a reset,
    your password is still safe and no action is needed.</p>`;

  return {
    subject,
    html: renderLayout(subject, body),
    text: `Reset your password\n\nOpen this link to set a new password:\n${resetUrl}\n\nThis link expires in ${ttlMinutes} minutes.`,
  };
}
