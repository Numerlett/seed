import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  einvoiceStatus,
  emailStatus,
  razorpayStatus,
  smsStatus,
  whatsappStatus,
} from '@seed/integrations';

/**
 * These predicates decide whether a feature is offered at all, so a wrong
 * answer either hides a working integration or lets an unconfigured one write
 * records nothing can complete.
 */
const KEYS = [
  'EMAIL_PROVIDER',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USERNAME',
  'SMTP_PASSWORD',
  'SMTP_MAIL',
  'RESEND_API_KEY',
  'RESEND_MAIL',
  'SMS_PROVIDER',
  'MSG91_AUTH_KEY',
  'MSG91_SENDER_ID',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
  'WHATSAPP_PROVIDER',
  'WHATSAPP_FROM',
  'GUPSHUP_API_KEY',
  'GUPSHUP_SRC_NAME',
  'GSP_CLIENT_ID',
  'GSP_CLIENT_SECRET',
  'GSP_USERNAME',
  'GSP_PASSWORD',
  'GSP_GSTIN',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('einvoiceStatus', () => {
  it('is unconfigured with no credentials, and names what is missing', () => {
    const status = einvoiceStatus();
    expect(status.configured).toBe(false);
    expect(status.missing).toContain('GSP_CLIENT_ID');
    expect(status.missing).toContain('GSP_GSTIN');
  });

  it('is configured once every credential is present', () => {
    process.env.GSP_CLIENT_ID = 'id';
    process.env.GSP_CLIENT_SECRET = 'secret';
    process.env.GSP_USERNAME = 'user';
    process.env.GSP_PASSWORD = 'pass';
    process.env.GSP_GSTIN = '27AAPFU0939F1ZV';

    const status = einvoiceStatus();
    expect(status.configured).toBe(true);
    expect(status.missing).toEqual([]);
  });

  it('does not require GSP_BASE_URL, which has a usable default', () => {
    expect(einvoiceStatus().missing).not.toContain('GSP_BASE_URL');
  });

  it('treats a blank value as absent', () => {
    process.env.GSP_CLIENT_ID = '   ';
    expect(einvoiceStatus().missing).toContain('GSP_CLIENT_ID');
  });
});

describe('emailStatus', () => {
  it('checks SMTP variables by default', () => {
    const status = emailStatus();
    expect(status.provider).toBe('smtp');
    expect(status.missing).toContain('SMTP_HOST');
  });

  it('checks Resend variables when Resend is selected', () => {
    process.env.EMAIL_PROVIDER = 'resend';
    const status = emailStatus();
    expect(status.provider).toBe('resend');
    expect(status.missing).toEqual(['RESEND_API_KEY', 'RESEND_MAIL']);
    // SMTP settings are irrelevant to a Resend deployment.
    expect(status.missing).not.toContain('SMTP_HOST');
  });
});

describe('smsStatus and whatsappStatus', () => {
  it('defaults SMS to MSG91 and WhatsApp to Twilio', () => {
    expect(smsStatus().provider).toBe('msg91');
    expect(whatsappStatus().provider).toBe('twilio');
  });

  it('switches the required variables with the provider', () => {
    process.env.SMS_PROVIDER = 'twilio';
    expect(smsStatus().missing).toContain('TWILIO_ACCOUNT_SID');

    process.env.WHATSAPP_PROVIDER = 'gupshup';
    expect(whatsappStatus().missing).toEqual(['GUPSHUP_API_KEY', 'GUPSHUP_SRC_NAME']);
  });
});

describe('razorpayStatus', () => {
  it('needs both key and secret', () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
    expect(razorpayStatus().configured).toBe(false);
    expect(razorpayStatus().missing).toEqual(['RAZORPAY_KEY_SECRET']);

    process.env.RAZORPAY_KEY_SECRET = 'secret';
    expect(razorpayStatus().configured).toBe(true);
  });
});
