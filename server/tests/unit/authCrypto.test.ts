import { describe, it, expect } from 'vitest';
import { hashOtp } from '../../helpers/authCrypto';

describe('hashOtp', () => {
  it('returns a 64-character hex string', () => {
    expect(hashOtp('123456')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same hash for the same input', () => {
    expect(hashOtp('123456')).toBe(hashOtp('123456'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashOtp('123456')).not.toBe(hashOtp('654321'));
  });

  it('returns false for mismatched OTPs', () => {
    const hash = hashOtp('123456');
    expect(hash === hashOtp('000000')).toBe(false);
  });
});
