/**
 * Configuration detection for outbound integrations.
 *
 * Every adapter in this package reads its credentials from the environment at
 * call time. When those variables are absent the adapter still issues a request
 * — with empty credentials — and fails somewhere inside the provider's API with
 * an opaque error. These predicates let callers find out *before* they promise
 * the user something, so an unconfigured integration surfaces as "not set up"
 * rather than as a silent failure or a row that never leaves PENDING.
 *
 * Kept free of server dependencies so both the API and any worker can use it.
 */

export type IntegrationId =
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'einvoice'
  | 'razorpay';

export type IntegrationStatus = {
  id: IntegrationId;
  configured: boolean;
  /** Provider selected by env, when the integration supports more than one. */
  provider?: string;
  /** Environment variables that must be set before this can be used. */
  missing: string[];
};

function missingFrom(names: string[]): string[] {
  return names.filter((name) => {
    const value = process.env[name];
    return value === undefined || value.trim() === '';
  });
}

/** Email: SMTP by default, Resend when EMAIL_PROVIDER=resend. */
export function emailStatus(): IntegrationStatus {
  const provider = process.env.EMAIL_PROVIDER ?? 'smtp';
  const required =
    provider === 'resend'
      ? ['RESEND_API_KEY', 'RESEND_MAIL']
      : ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'SMTP_MAIL'];
  const missing = missingFrom(required);
  return { id: 'email', provider, configured: missing.length === 0, missing };
}

/** SMS: MSG91 by default, Twilio when SMS_PROVIDER=twilio. */
export function smsStatus(): IntegrationStatus {
  const provider = process.env.SMS_PROVIDER || 'msg91';
  const required =
    provider === 'twilio'
      ? ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER']
      : ['MSG91_AUTH_KEY', 'MSG91_SENDER_ID'];
  const missing = missingFrom(required);
  return { id: 'sms', provider, configured: missing.length === 0, missing };
}

/** WhatsApp: Twilio by default, Gupshup when WHATSAPP_PROVIDER=gupshup. */
export function whatsappStatus(): IntegrationStatus {
  const provider = process.env.WHATSAPP_PROVIDER || 'twilio';
  const required =
    provider === 'gupshup'
      ? ['GUPSHUP_API_KEY', 'GUPSHUP_SRC_NAME']
      : ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'WHATSAPP_FROM'];
  const missing = missingFrom(required);
  return { id: 'whatsapp', provider, configured: missing.length === 0, missing };
}

/**
 * E-invoicing via a GST Suvidha Provider.
 *
 * GSP_BASE_URL is excluded deliberately — the adapter defaults it to the NIC
 * sandbox, which is a usable default. Credentials have no safe default.
 */
export function einvoiceStatus(): IntegrationStatus {
  const missing = missingFrom([
    'GSP_CLIENT_ID',
    'GSP_CLIENT_SECRET',
    'GSP_USERNAME',
    'GSP_PASSWORD',
    'GSP_GSTIN',
  ]);
  return { id: 'einvoice', configured: missing.length === 0, missing };
}

export function razorpayStatus(): IntegrationStatus {
  const missing = missingFrom(['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']);
  return { id: 'razorpay', configured: missing.length === 0, missing };
}

const STATUS_FNS: Record<IntegrationId, () => IntegrationStatus> = {
  email: emailStatus,
  sms: smsStatus,
  whatsapp: whatsappStatus,
  einvoice: einvoiceStatus,
  razorpay: razorpayStatus,
};

export function integrationStatus(id: IntegrationId): IntegrationStatus {
  return STATUS_FNS[id]();
}

export function allIntegrationStatuses(): IntegrationStatus[] {
  return (Object.keys(STATUS_FNS) as IntegrationId[]).map(integrationStatus);
}

export function isConfigured(id: IntegrationId): boolean {
  return integrationStatus(id).configured;
}
