import { computeDeviceFingerprint } from './fingerprint.util';

describe('computeDeviceFingerprint', () => {
  it('is deterministic for the same user agent', () => {
    const a = computeDeviceFingerprint('Mozilla/5.0 Chrome');
    const b = computeDeviceFingerprint('Mozilla/5.0 Chrome');
    expect(a).toBe(b);
  });

  it('differs across distinct user agents', () => {
    const chrome = computeDeviceFingerprint('Mozilla/5.0 Chrome');
    const safari = computeDeviceFingerprint('Mozilla/5.0 Safari');
    expect(chrome).not.toBe(safari);
  });

  it('falls back to a stable value when the user agent is missing', () => {
    expect(computeDeviceFingerprint(undefined)).toBe(computeDeviceFingerprint(undefined));
  });

  it('returns a 64-character hex sha256 digest', () => {
    const fingerprint = computeDeviceFingerprint('anything');
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
