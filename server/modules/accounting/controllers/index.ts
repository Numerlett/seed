import { prisma, AccountSubType, AccountType } from '@seed/database';
import { TRPCError } from '@trpc/server';
import {
  assertPostable,
  Decimal,
  money,
  sumBy,
  toMoneyNumber,
} from '@seed/accounting';
import { DEFAULT_COA } from '../../../lib/accounting/chartOfAccounts';
import { endOfDay } from '../../../helpers/dateRange';


export async function getChartOfAccounts(businessId: string) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { businessId },
    orderBy: [{ type: 'asc' }, { code: 'asc' }],
  });

  if (accounts.length === 0) {
    // Seed default COA on first access
    await prisma.chartOfAccount.createMany({
      data: DEFAULT_COA.map((a) => ({ ...a, businessId })),
      skipDuplicates: true,
    });
    return prisma.chartOfAccount.findMany({
      where: { businessId },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });
  }

  return accounts;
}

export async function createAccount(
  businessId: string,
  input: {
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    subType: AccountSubType;
    parentId?: string;
    description?: string;
  },
) {
  const existing = await prisma.chartOfAccount.findFirst({
    where: { businessId, code: input.code },
  });
  if (existing) {
    throw new TRPCError({ code: 'CONFLICT', message: `Account code ${input.code} already exists` });
  }

  return prisma.chartOfAccount.create({ data: { businessId, ...input } });
}

export async function getJournalEntries(
  businessId: string,
  input: { page: number; limit: number; accountId?: string; dateFrom?: Date; dateTo?: Date },
) {
  const skip = (input.page - 1) * input.limit;
  const where = {
    businessId,
    ...(input.dateFrom || input.dateTo
      ? { date: { ...(input.dateFrom ? { gte: input.dateFrom } : {}), ...(input.dateTo ? { lte: input.dateTo } : {}) } }
      : {}),
    ...(input.accountId ? { lines: { some: { accountId: input.accountId } } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { date: 'desc' },
      include: {
        lines: { include: { account: { select: { code: true, name: true } } } },
      },
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return { items, total, page: input.page };
}

export async function createManualJournalEntry(
  businessId: string,
  input: {
    date: Date;
    narration: string;
    lines: Array<{ accountId: string; debit: number; credit: number; description?: string }>;
  },
) {
  // Validated by @seed/accounting rather than inline: it compares in exact
  // decimal arithmetic and also rejects negative and double-sided lines, which
  // the previous float tolerance let through.
  try {
    assertPostable(
      input.lines.map((l) => ({
        accountCode: l.accountId,
        debit: l.debit,
        credit: l.credit,
      })),
    );
  } catch (error) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: error instanceof Error ? error.message : 'Invalid journal entry',
      cause: error,
    });
  }

  return prisma.journalEntry.create({
    data: {
      businessId,
      date: input.date,
      narration: input.narration,
      source: 'MANUAL',
      sourceId: 'manual',
      lines: {
        create: input.lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      },
    },
    include: { lines: true },
  });
}

/** An account's aggregated movement, kept in Decimal until the API boundary. */
type AccountBalance = {
  account: { code: string; name: string; type: string };
  debit: Decimal;
  credit: Decimal;
};

/**
 * Aggregates journal movement per account for a period.
 *
 * The shared source for the trial balance, P&L and balance sheet, so the three
 * reports can never disagree about what an account holds. Summed in the
 * database rather than by streaming every line through Node — a business with
 * a few years of history would exhaust the machine before the report rendered.
 */
async function accountBalances(
  businessId: string,
  range: { from?: Date; asOf?: Date; types?: AccountType[] } = {},
): Promise<AccountBalance[]> {
  const dateFilter =
    range.from || range.asOf
      ? {
          date: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.asOf ? { lte: endOfDay(range.asOf) } : {}),
          },
        }
      : {};

  const grouped = await prisma.journalLine.groupBy({
    by: ['accountId'],
    where: {
      entry: { businessId, ...dateFilter },
      ...(range.types ? { account: { type: { in: range.types } } } : {}),
    },
    _sum: { debit: true, credit: true },
  });

  if (grouped.length === 0) return [];

  // Scoped by business as well as id. The ids come from lines already filtered
  // to this business, so this is belt-and-braces — but it is the kind of query
  // that silently becomes a cross-tenant read after an innocent refactor.
  const accounts = await prisma.chartOfAccount.findMany({
    where: { businessId, id: { in: grouped.map((g) => g.accountId) } },
    select: { id: true, code: true, name: true, type: true },
  });
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  return grouped
    .map((group) => {
      const account = accountById.get(group.accountId);
      return {
        account: {
          code: account?.code ?? '',
          name: account?.name ?? 'Unknown account',
          type: account?.type ?? '',
        },
        debit: money(group._sum.debit),
        credit: money(group._sum.credit),
      };
    })
    .sort((a, b) => a.account.code.localeCompare(b.account.code));
}

/** Natural balance of an account, debit-positive. */
function netDebit(row: AccountBalance): Decimal {
  return row.debit.minus(row.credit);
}

export async function getTrialBalance(businessId: string, asOf?: Date) {
  const balances = await accountBalances(businessId, { asOf });

  const rows = balances.map((row) => ({
    account: row.account,
    debit: toMoneyNumber(row.debit),
    credit: toMoneyNumber(row.credit),
  }));

  // Summed as Decimal, converted once. Adding the already-converted numbers
  // would reintroduce the float drift this aggregation exists to avoid.
  return {
    rows,
    totals: {
      debit: toMoneyNumber(sumBy(balances, (row) => row.debit)),
      credit: toMoneyNumber(sumBy(balances, (row) => row.credit)),
    },
  };
}

/**
 * Net profit for a period, in Decimal. Income carries a credit balance and
 * expense a debit balance, so profit is credit − debit across both.
 *
 * Shared by the P&L and the balance sheet so the profit shown on one is by
 * construction the retained earnings figure on the other.
 */
async function netProfitFor(
  businessId: string,
  range: { from?: Date; asOf?: Date },
): Promise<Decimal> {
  const balances = await accountBalances(businessId, {
    ...range,
    types: ['INCOME', 'EXPENSE'],
  });
  return balances.reduce<Decimal>(
    (total, row) => total.minus(netDebit(row)),
    new Decimal(0),
  );
}

export async function getProfitAndLoss(businessId: string, dateFrom: Date, dateTo: Date) {
  const balances = await accountBalances(businessId, {
    from: dateFrom,
    asOf: dateTo,
    types: ['INCOME', 'EXPENSE'],
  });

  const incomeLines: { name: string; amount: number }[] = [];
  const expenseLines: { name: string; amount: number }[] = [];
  let revenue = new Decimal(0);
  let expenses = new Decimal(0);

  for (const row of balances) {
    // Credit-positive: income earned, expense incurred as a negative.
    const net = netDebit(row).negated();

    if (row.account.type === 'INCOME') {
      revenue = revenue.plus(net);
      incomeLines.push({ name: row.account.name, amount: toMoneyNumber(net) });
    } else {
      expenses = expenses.plus(net.negated());
      expenseLines.push({
        name: row.account.name,
        amount: toMoneyNumber(net.negated()),
      });
    }
  }

  return {
    revenue: toMoneyNumber(revenue),
    expenses: toMoneyNumber(expenses),
    netProfit: toMoneyNumber(revenue.minus(expenses)),
    incomeLines,
    expenseLines,
  };
}

/**
 * Balance sheet as at a date.
 *
 * Income and expense used to be dropped entirely, so the statement was out by
 * exactly the period's net profit — always, for every business. There are no
 * closing entries in this system, so current-period earnings are computed from
 * the income and expense accounts and presented as a line within equity. That
 * is what makes assets equal liabilities plus equity.
 *
 * Totals are returned as positive magnitudes in each section's natural
 * direction: assets debit-positive, liabilities and equity credit-positive.
 * `difference` is the residual and is exactly zero for a correct ledger —
 * it is returned rather than hidden so a broken invariant is visible in the UI
 * instead of being silently rendered.
 */
export async function getBalanceSheet(businessId: string, asOf: Date) {
  const balances = await accountBalances(businessId, { asOf });

  const section = (type: string) =>
    balances.filter((row) => row.account.type === type);

  const assetRows = section('ASSET');
  const liabilityRows = section('LIABILITY');
  const equityRows = section('EQUITY');

  const retainedEarnings = await netProfitFor(businessId, { asOf });

  const totalAssets = assetRows.reduce<Decimal>(
    (total, row) => total.plus(netDebit(row)),
    new Decimal(0),
  );
  // Credit-positive, so a liability of 100 reads as 100 rather than -100.
  const totalLiabilities = liabilityRows.reduce<Decimal>(
    (total, row) => total.minus(netDebit(row)),
    new Decimal(0),
  );
  const totalEquity = equityRows
    .reduce<Decimal>((total, row) => total.minus(netDebit(row)), new Decimal(0))
    .plus(retainedEarnings);

  const difference = totalAssets.minus(totalLiabilities).minus(totalEquity);

  const toRow = (row: AccountBalance) => ({
    account: row.account,
    debit: toMoneyNumber(row.debit),
    credit: toMoneyNumber(row.credit),
  });

  return {
    assets: assetRows.map(toRow),
    liabilities: liabilityRows.map(toRow),
    equity: [
      ...equityRows.map(toRow),
      // Computed, not posted. Labelled so nobody mistakes it for a real
      // account that a closing entry has already written.
      {
        account: {
          code: '3900',
          name: 'Current Period Earnings (computed)',
          type: 'EQUITY',
        },
        debit: toMoneyNumber(retainedEarnings.isNegative() ? retainedEarnings.negated() : 0),
        credit: toMoneyNumber(retainedEarnings.isNegative() ? 0 : retainedEarnings),
      },
    ],
    totalAssets: toMoneyNumber(totalAssets),
    totalLiabilities: toMoneyNumber(totalLiabilities),
    totalEquity: toMoneyNumber(totalEquity),
    retainedEarnings: toMoneyNumber(retainedEarnings),
    difference: toMoneyNumber(difference),
    balanced: difference.isZero(),
  };
}

export async function getFiscalYears(businessId: string) {
  return prisma.fiscalYear.findMany({
    where: { businessId },
    orderBy: { startDate: 'desc' },
  });
}

export async function createFiscalYear(
  businessId: string,
  input: { name: string; startDate: Date; endDate: Date },
) {
  return prisma.fiscalYear.create({ data: { businessId, ...input } });
}
