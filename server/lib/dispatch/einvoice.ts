import type { EInvoicePayload, EInvoiceResponse } from '@seed/integrations';

/**
 * Generate an e-invoice IRN via GSP.
 * - Serverless: calls the GSP API synchronously and returns the response.
 * - Long-running: enqueues to BullMQ and returns null; the worker generates the
 *   IRN and persists the response. Callers in long-running mode must read the
 *   IRN/status from the database once the job completes.
 */
export async function generateEInvoice(
  payload: EInvoicePayload,
): Promise<EInvoiceResponse | null> {
  if (process.env.DEPLOYMENT_MODE === 'serverless') {
    const { generateIRN } = await import('@seed/integrations');
    return generateIRN(payload);
  }
  const { getEinvoiceQueue } = await import('@seed/jobs');
  await getEinvoiceQueue().add('generate', payload);
  return null;
}
