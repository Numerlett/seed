import { Prisma } from '@seed/database';
import type { InvoicePdfData, PdfLineItem } from '@seed/pdf';

/** Prisma Decimals stringify losslessly; Number() on them is a rounding risk. */
function num(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type InvoiceWithRelations = Prisma.SaleInvoiceGetPayload<{
  include: {
    items: { include: { product: true } };
    customer: { include: { addresses: true } };
    business: { include: { gstRegistration: true } };
  };
}>;

/**
 * Maps a persisted invoice onto the PDF template's input.
 *
 * Every GST figure here is read from the invoice, never recomputed — the
 * printed document must match what was filed, and recomputing at render time
 * would let the two drift apart.
 */
export function toInvoicePdfData(
  invoice: InvoiceWithRelations,
): InvoicePdfData {
  const registration = invoice.business.gstRegistration;
  const billingAddress = invoice.customer.addresses[0];

  const lineItems: PdfLineItem[] = invoice.items.map((item, index) => ({
    slNo: index + 1,
    description: item.product.name,
    hsnCode: item.hsnCode ?? item.product.hsnCode ?? undefined,
    quantity: num(item.quantity),
    unit: item.product.unit,
    unitPrice: num(item.unitPrice),
    discount: num(item.discount),
    taxableAmount: num(item.taxableAmount),
    cgstRate: num(item.cgstRate),
    cgstAmount: num(item.cgstAmount),
    sgstRate: num(item.sgstRate),
    sgstAmount: num(item.sgstAmount),
    igstRate: num(item.igstRate),
    igstAmount: num(item.igstAmount),
    totalAmount: num(item.totalPrice),
  }));

  return {
    invoiceNumber: invoice.documentNumber,
    invoiceDate: formatDate(invoice.invoiceDate),
    dueDate: invoice.dueDate ? formatDate(invoice.dueDate) : undefined,
    business: {
      name: registration?.tradeName ?? invoice.business.name,
      gstin: registration?.gstin ?? invoice.business.gstin ?? undefined,
      email: invoice.business.email ?? undefined,
      phone: invoice.business.phone ?? undefined,
      logo: invoice.business.logoImage ?? undefined,
      address: invoice.business.addressLine1
        ? {
            line1: invoice.business.addressLine1,
            line2: invoice.business.addressLine2 ?? undefined,
            city: invoice.business.city ?? '',
            state: invoice.business.state ?? '',
            postalCode: invoice.business.postalCode ?? '',
            country: invoice.business.country ?? undefined,
          }
        : undefined,
    },
    customer: {
      name: invoice.customer.name,
      gstin: invoice.customer.gstin ?? undefined,
      email: invoice.customer.email ?? undefined,
      phone: invoice.customer.phone ?? undefined,
      address: billingAddress
        ? {
            line1: billingAddress.line1,
            line2: billingAddress.line2 ?? undefined,
            city: billingAddress.city,
            state: billingAddress.state,
            postalCode: billingAddress.postalCode,
            country: billingAddress.country,
          }
        : undefined,
    },
    lineItems,
    subtotal: num(invoice.totalAmount),
    totalDiscount: num(invoice.discountAmount),
    totalTaxable: num(invoice.taxableAmount),
    totalCgst: num(invoice.cgstAmount),
    totalSgst: num(invoice.sgstAmount),
    totalIgst: num(invoice.igstAmount),
    totalTax: num(invoice.taxAmount),
    grandTotal: num(invoice.grandTotal),
    notes: invoice.notes ?? undefined,
  };
}
