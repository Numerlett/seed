import axios from 'axios';
import crypto from 'crypto';

/**
 * Razorpay integration: payment links, QR codes, webhook verification.
 * Configure via env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */

function getAuth() {
  return {
    username: process.env.RAZORPAY_KEY_ID || '',
    password: process.env.RAZORPAY_KEY_SECRET || '',
  };
}

const BASE = 'https://api.razorpay.com/v1';

export async function createPaymentLink(params: {
  amount: number; // in paise
  currency?: string;
  description: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  referenceId?: string;
  expireBy?: number; // unix timestamp
  notifyEmail?: boolean;
  notifySms?: boolean;
}) {
  const resp = await axios.post(
    `${BASE}/payment_links`,
    {
      amount: Math.round(params.amount),
      currency: params.currency ?? 'INR',
      description: params.description,
      customer: {
        name: params.customerName,
        email: params.customerEmail,
        contact: params.customerPhone,
      },
      reference_id: params.referenceId,
      expire_by: params.expireBy,
      notify: {
        email: params.notifyEmail ?? false,
        sms: params.notifySms ?? false,
      },
    },
    { auth: getAuth() },
  );
  return resp.data as { id: string; short_url: string; status: string };
}

export async function fetchPaymentLink(id: string) {
  const resp = await axios.get(`${BASE}/payment_links/${id}`, { auth: getAuth() });
  return resp.data;
}

export async function createQrCode(params: {
  type: 'bharat_qr' | 'upi_qr';
  name: string;
  description?: string;
  amount?: number;
  fixedAmount?: boolean;
  customerId?: string;
  closeBy?: number;
}) {
  const resp = await axios.post(
    `${BASE}/payments/qr_codes`,
    {
      type: params.type,
      name: params.name,
      description: params.description,
      usage: 'single_use',
      fixed_amount: params.fixedAmount ?? true,
      payment_amount: params.amount,
      customer_id: params.customerId,
      close_by: params.closeBy,
    },
    { auth: getAuth() },
  );
  return resp.data as { id: string; image_url: string; status: string };
}

/**
 * Verifies a Razorpay webhook signature.
 *
 * `body` must be the exact bytes Razorpay sent. Re-serialising a parsed object
 * changes key order and whitespace, and the HMAC will never match.
 *
 * The comparison is timing-safe: a plain `===` leaks how much of a forged
 * signature was correct, which is enough to reconstruct one byte at a time.
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(signature, 'utf8');

  // timingSafeEqual throws on a length mismatch, which is itself a safe answer.
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
