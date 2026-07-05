import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e.${Date.now()}@example.com`;
  const password = 'Str0ng!Passw0rd';

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.enableVersioning({ type: VersioningType.URI });
    app.use(cookieParser(process.env.COOKIE_SECRET));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: 'e2e.' } } });
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('rejects weak passwords on registration', async () => {
    await request(server())
      .post('/api/v1/auth/register')
      .send({ email: 'weak@example.com', password: 'weak' })
      .expect(400);
  });

  it('registers a new user and returns an access token + refresh cookie', async () => {
    const res = await request(server())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'E2E' })
      .expect(201);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email, isEmailVerified: false });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects a duplicate registration', async () => {
    await request(server()).post('/api/v1/auth/register').send({ email, password }).expect(409);
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    await request(server()).get('/api/v1/users/me').expect(401);
  });

  it('rejects login with the wrong password', async () => {
    await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPass1!' })
      .expect(401);
  });

  it('logs in and can access a protected route with the access token', async () => {
    const loginRes = await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const accessToken = loginRes.body.accessToken as string;
    const refreshCookie = loginRes.headers['set-cookie'];

    const meRes = await request(server())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meRes.body.email).toBe(email);

    const refreshRes = await request(server())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));
    expect(refreshRes.body.accessToken).not.toBe(accessToken);

    const newRefreshCookie = refreshRes.headers['set-cookie'];

    // the old refresh cookie was rotated out — replaying it must revoke the family
    await request(server()).post('/api/v1/auth/refresh').set('Cookie', refreshCookie).expect(401);

    // ...which means even the freshly rotated token is now dead too
    await request(server())
      .post('/api/v1/auth/refresh')
      .set('Cookie', newRefreshCookie)
      .expect(401);
  });

  it('logs out and immediately invalidates the access token', async () => {
    const loginRes = await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const accessToken = loginRes.body.accessToken as string;

    await request(server())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', loginRes.headers['set-cookie'])
      .expect(204);

    await request(server())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });

  it('locks the account after repeated failed logins', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(server()).post('/api/v1/auth/login').send({ email, password: 'WrongPass1!' });
    }

    const res = await request(server())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(401);

    expect(res.body.message).toMatch(/locked/i);
  });
});
