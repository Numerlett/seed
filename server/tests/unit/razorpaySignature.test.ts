import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyWebhookSignature } from '@seed/integrations';

const SECRET = 'whsec_test_secret';

function sign(body: string, secret = SECRET) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ event: 'payment_link.paid', payload: {} });

  it('accepts a signature produced with the shared secret', () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it('accepts the raw Buffer the express raw parser provides', () => {
    const raw = Buffer.from(body, 'utf8');
    expect(verifyWebhookSignature(raw, sign(body), SECRET)).toBe(true);
  });

  it('rejects a signature made with a different secret', () => {
    expect(verifyWebhookSignature(body, sign(body, 'other'), SECRET)).toBe(false);
  });

  it('rejects a body that was altered after signing', () => {
    const signature = sign(body);
    const tampered = JSON.stringify({ event: 'payment_link.paid', extra: 1 });
    expect(verifyWebhookSignature(tampered, signature, SECRET)).toBe(false);
  });

  it('rejects a signature of the wrong length instead of throwing', () => {
    // timingSafeEqual throws on mismatched lengths; the guard must catch it.
    expect(() => verifyWebhookSignature(body, 'short', SECRET)).not.toThrow();
    expect(verifyWebhookSignature(body, 'short', SECRET)).toBe(false);
  });

  it('rejects empty credentials rather than treating them as valid', () => {
    expect(verifyWebhookSignature(body, '', SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), '')).toBe(false);
  });
});
