import { createHash } from 'crypto';

export function computeDeviceFingerprint(userAgent?: string): string {
  return createHash('sha256')
    .update(userAgent ?? 'unknown')
    .digest('hex');
}
