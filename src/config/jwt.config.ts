import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  issuer: process.env.JWT_ISSUER ?? 'atlas-auth',
  audience: process.env.JWT_AUDIENCE ?? 'atlas-auth-clients',
}));
