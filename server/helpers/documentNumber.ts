import { prisma, Prisma } from '@seed/database';

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
  PAYMENT_RECEIVED: 'RCP',
  PAYMENT_MADE: 'PAY',
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
  // Receipts and payments share one table; the prefix filter separates the two
  // sequences, so RCP and PAY each count up independently.
  RCP: 'payments',
  PAY: 'payments',
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

/**
 * How many times a colliding document number is regenerated before giving up.
 * Each retry re-reads the maximum, so N concurrent creates need at most N
 * attempts; this leaves room for a burst well beyond anything realistic.
 */
const MAX_NUMBER_ATTEMPTS = 8;

/**
 * Whether a unique-constraint violation was on the document number.
 *
 * Where the conflicting columns appear depends on the driver: `meta.target`
 * on some, and nested under `meta.driverAdapterError.cause.constraint.fields`
 * on the pg adapter this project uses. The message carries them in every
 * shape, so all three are searched rather than relying on one.
 */
function isDocumentNumberCollision(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }

  let meta = '';
  try {
    meta = JSON.stringify(error.meta ?? {});
  } catch {
    // Circular or otherwise unserialisable meta: the message alone will do.
  }

  return `${error.message} ${meta}`.includes('documentNumber');
}

/**
 * Runs `create` with a freshly generated document number, retrying if another
 * request claimed that number first.
 *
 * The number comes from reading the current maximum and adding one, which two
 * concurrent creates can do simultaneously — a double-clicked submit button is
 * enough. Each document type is unique on `(businessId, documentNumber)`, so
 * the loser of that race used to fail outright with a conflict the user could
 * do nothing about.
 *
 * Retrying rather than handing out numbers from a counter keeps the sequence
 * gapless: a rolled-back document leaves its number free for the next one,
 * which matters because GST expects invoice serials to run consecutively.
 *
 * A user-supplied number is never retried. If it collides, that is a real
 * conflict the user has to resolve, and silently renumbering their document
 * would be worse than telling them.
 */
export async function withDocumentNumber<T>(
  businessId: string,
  prefix: DocPrefix,
  userProvided: string | undefined,
  create: (documentNumber: string) => Promise<T>,
): Promise<T> {
  const isUserProvided = Boolean(userProvided && userProvided.trim().length > 0);

  for (let attempt = 1; ; attempt += 1) {
    const documentNumber = await generateDocumentNumber(
      businessId,
      prefix,
      userProvided,
    );

    try {
      return await create(documentNumber);
    } catch (error) {
      if (
        isDocumentNumberCollision(error) &&
        !isUserProvided &&
        attempt < MAX_NUMBER_ATTEMPTS
      ) {
        continue;
      }
      throw error;
    }
  }
}
