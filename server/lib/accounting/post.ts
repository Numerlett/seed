import { Prisma } from '@seed/database';
import { assertPostable, type PostingLine } from '@seed/accounting';
import type { JournalSource } from '@seed/accounting';
import { DEFAULT_COA } from './chartOfAccounts';

/**
 * PrismaClient is assignable to TransactionClient, so this accepts both while
 * keeping overload resolution working — a union of the two breaks `include`.
 */
export type DbClient = Prisma.TransactionClient;

/**
 * Ensures the business has a chart of accounts before anything posts to it.
 *
 * Seeding used to happen only on first read of the Chart of Accounts page, so
 * a business that never opened that page had no accounts at all and every
 * posting would fail to resolve one.
 */
export async function ensureChartOfAccounts(
  db: DbClient,
  businessId: string,
): Promise<void> {
  const existing = await db.chartOfAccount.count({ where: { businessId } });
  if (existing > 0) return;

  await db.chartOfAccount.createMany({
    data: DEFAULT_COA.map((account) => ({ ...account, businessId })),
    skipDuplicates: true,
  });
}

export type PostEntryArgs = {
  businessId: string;
  source: JournalSource;
  /** Id of the document this entry records, for idempotency and traceability. */
  sourceId: string;
  date: Date;
  narration: string;
  lines: PostingLine[];
  postedBy?: string;
};

/**
 * Writes one balanced journal entry.
 *
 * Idempotent on (businessId, source, sourceId): a document that already has a
 * live entry is not posted twice, which makes cancel-then-reconfirm safe. The
 * schema already indexes exactly that triple.
 *
 * Call inside the transaction that persists the document, so books and
 * documents commit together or not at all.
 */
export async function postJournalEntry(
  db: DbClient,
  args: PostEntryArgs,
): Promise<string | null> {
  const lines = args.lines.filter(
    (line) => Number(line.debit) !== 0 || Number(line.credit) !== 0,
  );
  if (lines.length === 0) return null;

  // Throws when debits and credits disagree, or a line is malformed.
  assertPostable(lines);

  const existing = await db.journalEntry.findFirst({
    where: {
      businessId: args.businessId,
      source: args.source,
      sourceId: args.sourceId,
      isReversed: false,
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  await ensureChartOfAccounts(db, args.businessId);

  const codes = [...new Set(lines.map((line) => line.accountCode))];
  const accounts = await db.chartOfAccount.findMany({
    where: { businessId: args.businessId, code: { in: codes } },
    select: { id: true, code: true },
  });
  const idByCode = new Map(accounts.map((a) => [a.code, a.id]));

  const missing = codes.filter((code) => !idByCode.has(code));
  if (missing.length > 0) {
    throw new Error(
      `Chart of accounts is missing ${missing.join(', ')} for this business. ` +
        'Add the account, or reseed the default chart, then retry.',
    );
  }

  const entry = await db.journalEntry.create({
    data: {
      businessId: args.businessId,
      source: args.source,
      sourceId: args.sourceId,
      date: args.date,
      narration: args.narration,
      postedBy: args.postedBy,
      lines: {
        create: lines.map((line) => ({
          accountId: idByCode.get(line.accountCode) as string,
          debit: new Prisma.Decimal(line.debit.toString()),
          credit: new Prisma.Decimal(line.credit.toString()),
          narration: line.narration,
          partyId: line.partyId,
        })),
      },
    },
    select: { id: true },
  });

  return entry.id;
}

/**
 * Reverses the live entry for a document, if it has one.
 *
 * Cancelling writes a mirror-image entry and marks the original reversed
 * rather than deleting it. An audit trail you can delete from is not one.
 */
export async function reverseJournalEntry(
  db: DbClient,
  args: {
    businessId: string;
    source: JournalSource;
    sourceId: string;
    date: Date;
    narration: string;
  },
): Promise<string | null> {
  const original = await db.journalEntry.findFirst({
    where: {
      businessId: args.businessId,
      source: args.source,
      sourceId: args.sourceId,
      isReversed: false,
    },
    include: { lines: true },
  });
  if (!original) return null;

  const reversal = await db.journalEntry.create({
    data: {
      businessId: args.businessId,
      source: args.source,
      sourceId: args.sourceId,
      date: args.date,
      narration: args.narration,
      reversalOf: original.id,
      lines: {
        create: original.lines.map((line) => ({
          accountId: line.accountId,
          // Swapped: the reversal cancels the original exactly.
          debit: line.credit,
          credit: line.debit,
          narration: line.narration,
          partyId: line.partyId,
        })),
      },
    },
    select: { id: true },
  });

  await db.journalEntry.update({
    where: { id: original.id },
    data: { isReversed: true },
  });

  return reversal.id;
}
