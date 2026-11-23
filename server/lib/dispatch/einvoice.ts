import type {
  EInvoicePayload,
  EInvoiceResponse,
  EWayBillByIrnPayload,
  EWayBillResponse,
} from '@seed/integrations';
import { assertIntegrationConfigured } from './errors';

/**
 * Generate an e-invoice IRN via GSP.
 * - Serverless: calls the GSP API synchronously and returns the response.
 * - Long-running: enqueues to BullMQ and returns null; the worker generates the
 *   IRN and persists the response. Callers in long-running mode must read the
 *   IRN/status from the database once the job completes.
 *
 * Throws `IntegrationNotConfiguredError` when GSP credentials are absent, so
 * the caller never records an e-invoice that no one can complete.
 */
export async function generateEInvoice(
  payload: EInvoicePayload,
): Promise<EInvoiceResponse | null> {
  await assertIntegrationConfigured('einvoice');

  if (process.env.DEPLOYMENT_MODE === 'serverless') {
    const { generateIRN } = await import('@seed/integrations');
    return generateIRN(payload);
  }
  const { getEinvoiceQueue } = await import('@seed/jobs');
  await getEinvoiceQueue().add('generate', payload);
  return null;
}

/**
 * Cancel a registered IRN. The IRP only permits this within 24 hours of
 * registration; after that the invoice must be reversed with a credit note.
 */
export async function cancelEInvoice(args: {
  irn: string;
  reason: 1 | 2 | 3 | 4 | 5;
  remarks: string;
}): Promise<unknown> {
  await assertIntegrationConfigured('einvoice');

  if (process.env.DEPLOYMENT_MODE === 'serverless') {
    const { cancelIRN } = await import('@seed/integrations');
    return cancelIRN(args.irn, args.reason, args.remarks);
  }
  const { getEinvoiceQueue } = await import('@seed/jobs');
  await getEinvoiceQueue().add('cancel', args);
  return null;
}

/** Raise an e-way bill against an already-registered IRN. */
export async function generateEWayBill(
  payload: EWayBillByIrnPayload,
): Promise<EWayBillResponse | null> {
  await assertIntegrationConfigured('einvoice');

  if (process.env.DEPLOYMENT_MODE === 'serverless') {
    const { generateEWayBillByIrn } = await import('@seed/integrations');
    return generateEWayBillByIrn(payload);
  }
  const { getEinvoiceQueue } = await import('@seed/jobs');
  await getEinvoiceQueue().add('ewaybill', payload);
  return null;
}
