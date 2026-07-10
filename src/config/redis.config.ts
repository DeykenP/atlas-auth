import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  // Single connection string, e.g. from a hosting platform (Render, Railway,
  // Upstash). Takes priority over the individual host/port/password fields
  // below, which remain the local-dev / docker-compose path.
  url: process.env.REDIS_URL || undefined,
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true',
}));
