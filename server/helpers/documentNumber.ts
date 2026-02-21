import { prisma } from '@seed/database';

/**
 * Document number prefixes for each transaction type.
 */
export const DOC_PREFIXES = {
  PURCHASE_ORDER: 'PO',
  GRN: 'GRN',
  SALE_INVOICE: 'INV',
  PURCHASE_RETURN: 'PR',
  SALES_RETURN: 'SR',
  STOCK_ADJUSTMENT: 'ADJ',
  STOCK_TRANSFER: 'TRF',
  DAMAGE_REPORT: 'DMG',
} as const;

type DocPrefix = (typeof DOC_PREFIXES)[keyof typeof DOC_PREFIXES];

/**
 * Table name mapping for each prefix — used to query the latest document number.
 */
const TABLE_MAP: Record<DocPrefix, string> = {
  PO: 'purchase_orders',
  GRN: 'goods_receipt_notes',
  INV: 'sale_invoices',
  PR: 'purchase_returns',
  SR: 'sales_returns',
  ADJ: 'stock_adjustments',
  TRF: 'stock_transfers',
  DMG: 'damage_reports',
};

/**
 * Generates a sequential document number for a given business and document type.
 * Format: `{PREFIX}-{NNNN}` (e.g. PO-0001, GRN-0042, INV-0123)
 *
 * If `userProvided` is given and non-empty, it's returned as-is (hybrid mode).
 */
export async function generateDocumentNumber(
  businessId: string,
  prefix: DocPrefix,
  userProvided?: string,
): Promise<string> {
  // Hybrid: if user provides a custom number, use it
  if (userProvided && userProvided.trim().length > 0) {
    return userProvided.trim();
  }

  const tableName = TABLE_MAP[prefix];

  // Query the latest document number for this business using raw SQL
  // This handles any format and finds the highest numeric suffix
  const result = await prisma.$queryRawUnsafe<{ document_number: string }[]>(
    `SELECT "documentNumber" as document_number FROM "${tableName}"
     WHERE "businessId" = $1 AND "documentNumber" LIKE $2
     ORDER BY "documentNumber" DESC LIMIT 1`,
    businessId,
    `${prefix}-%`,
  );

  let nextNum = 1;

  if (result.length > 0) {
    const lastDoc = result[0].document_number;
    const parts = lastDoc.split('-');
    const numPart = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(numPart)) {
      nextNum = numPart + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}
