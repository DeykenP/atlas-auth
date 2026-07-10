import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  // RENDER_EXTERNAL_URL is injected automatically by Render; APP_URL wins when set.
  url: process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:3000',
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()),
  isProduction: process.env.NODE_ENV === 'production',
  // Swagger is on in non-production always; in production only when explicitly opted in
  // (e.g. a public demo deployment).
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production',
}));
