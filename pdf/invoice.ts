import { InvoicePdfData } from './types';

/**
 * Generates an invoice PDF as a Buffer.
 * Uses @react-pdf/renderer under the hood.
 * Returns a Buffer suitable for streaming or S3 upload.
 */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  // Dynamic import to avoid loading heavy deps at module init time
  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { createElement } = await import('react');
  const { InvoiceDocument } = await import('./templates/InvoiceDocument');

  const element = createElement(InvoiceDocument, { data });
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}
