import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { GlobalExceptionFilter } from './global-exception.filter';

function buildHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/v1/test', method: 'GET' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

function buildFilter(isProduction: boolean): GlobalExceptionFilter {
  const config = { get: jest.fn().mockReturnValue(isProduction) } as unknown as ConfigService;
  return new GlobalExceptionFilter(config);
}

describe('GlobalExceptionFilter', () => {
  it('passes through a plain HttpException with its own status and message', () => {
    const filter = buildFilter(false);
    const { host, status, json } = buildHost();

    filter.catch(new NotFoundException('Role not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Role not found' }),
    );
  });

  it('preserves class-validator message arrays from BadRequestException', () => {
    const filter = buildFilter(false);
    const { host, json } = buildHost();

    filter.catch(new BadRequestException(['email must be an email']), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: ['email must be an email'] }),
    );
  });

  it('maps a Prisma unique constraint violation to 409', () => {
    const filter = buildFilter(false);
    const { host, status, json } = buildHost();

    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['email'] },
    });

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, error: 'Conflict' }),
    );
  });

  it('maps a Prisma "record not found" error to 404', () => {
    const filter = buildFilter(false);
    const { host, status } = buildHost();

    const prismaError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });

    filter.catch(prismaError, host);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('hides the real error message behind a generic one in production', () => {
    const filter = buildFilter(true);
    const { host, status, json } = buildHost();

    filter.catch(new Error('leaked internal detail: db password is hunter2'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Something went wrong' }));
  });

  it('surfaces the real error message outside production', () => {
    const filter = buildFilter(false);
    const { host, json } = buildHost();

    filter.catch(new Error('helpful dev-only detail'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'helpful dev-only detail' }),
    );
  });
});
