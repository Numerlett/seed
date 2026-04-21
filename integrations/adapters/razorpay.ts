import axios from 'axios';

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

export function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
}
