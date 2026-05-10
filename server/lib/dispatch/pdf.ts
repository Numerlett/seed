import { ServerlessUnavailableError } from './errors';

export type AsyncPdfInput = {
  type: 'invoice' | 'grn' | 'purchase-order' | 'report';
  data: unknown;
  recipientEmail: string;
};

/**
 * Generate a PDF asynchronously and email it to the recipient when ready.
 * Long-running mode only — serverless deploys throw `ServerlessUnavailableError`.
 *
 * For sync PDF generation (download a buffer immediately), call
 * `generateInvoicePdf` from `@seed/pdf` directly. The dispatch layer is for
 * fire-and-forget async flows; sync generation has no queue equivalent.
 */
export async function generatePdfAsync(input: AsyncPdfInput): Promise<void> {
  if (process.env.DEPLOYMENT_MODE === 'serverless') {
    throw new ServerlessUnavailableError('async-pdf');
  }
  const { getPdfQueue } = await import('@seed/jobs');
  await getPdfQueue().add(input.type, input);
}
