import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function buildContext(userPermissions: string[]): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: { permissions: userPermissions } }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows the request when no permissions are required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(buildContext([]))).toBe(true);
  });

  it('allows the request when the user has every required permission', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['users:read', 'users:write']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(buildContext(['users:read', 'users:write', 'roles:read']))).toBe(true);
  });

  it('throws ForbiddenException when a required permission is missing', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['users:write']),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() => guard.canActivate(buildContext(['users:read']))).toThrow(ForbiddenException);
  });
});
