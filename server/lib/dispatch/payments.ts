import { assertIntegrationConfigured } from './errors';

export type CreatePaymentLinkInput = {
  /** Amount in paise — the provider's unit, not rupees. */
  amount: number;
  description: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  referenceId?: string;
  expireBy?: number;
  notifyEmail?: boolean;
  notifySms?: boolean;
};

/**
 * Creates a hosted payment link.
 *
 * Unlike mail or messaging this is never queued: the caller needs the URL in
 * the response to show the customer, so there is nothing useful to hand to a
 * worker. Both deployment modes call the provider inline.
 */
export async function createPaymentLink(input: CreatePaymentLinkInput) {
  await assertIntegrationConfigured('razorpay');
  const { createPaymentLink: create } = await import('@seed/integrations');
  return create(input);
}
