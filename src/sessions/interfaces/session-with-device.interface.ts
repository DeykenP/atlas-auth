import { Prisma } from '@prisma/client';

export const SESSION_DEVICE_INCLUDE = Prisma.validator<Prisma.SessionInclude>()({
  device: true,
});

export type SessionWithDevice = Prisma.SessionGetPayload<{
  include: typeof SESSION_DEVICE_INCLUDE;
}>;
