import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  provider: process.env.MAIL_PROVIDER ?? 'smtp',
  from: process.env.MAIL_FROM,
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    secure: process.env.SMTP_SECURE === 'true',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
  },
  mailtrap: {
    host: process.env.MAILTRAP_HOST,
    port: parseInt(process.env.MAILTRAP_PORT ?? '2525', 10),
    user: process.env.MAILTRAP_USER,
    password: process.env.MAILTRAP_PASSWORD,
  },
}));
