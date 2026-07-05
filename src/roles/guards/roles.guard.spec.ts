import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function buildContext(userRoles: string[]): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: { roles: userRoles } }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request when no roles are required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext([]))).toBe(true);
  });

  it('allows the request when the user has at least one required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin', 'editor']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext(['editor']))).toBe(true);
  });

  it('throws ForbiddenException when the user has none of the required roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(buildContext(['user']))).toThrow(ForbiddenException);
  });
});
