import { prisma, AccountSubType } from '@seed/database';
import { TRPCError } from '@trpc/server';
import { assertPostable } from '@seed/accounting';
import { DEFAULT_COA } from '../../../lib/accounting/chartOfAccounts';


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

export async function getTrialBalance(businessId: string, asOf?: Date) {
  const dateFilter = asOf ? { date: { lte: asOf } } : {};

  // Aggregated in the database rather than by loading every journal line into
  // memory: a business with a few years of history would otherwise exhaust the
  // machine long before the report rendered.
  const grouped = await prisma.journalLine.groupBy({
    by: ['accountId'],
    where: { entry: { businessId, ...dateFilter } },
    _sum: { debit: true, credit: true },
  });

  if (grouped.length === 0) {
    return { rows: [], totals: { debit: 0, credit: 0 } };
  }

  const accounts = await prisma.chartOfAccount.findMany({
    where: { id: { in: grouped.map((g) => g.accountId) } },
    select: { id: true, code: true, name: true, type: true },
  });
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  const rows = grouped
    .map((group) => {
      const account = accountById.get(group.accountId);
      return {
        account: {
          code: account?.code ?? '',
          name: account?.name ?? 'Unknown account',
          type: account?.type ?? '',
        },
        debit: Number(group._sum.debit ?? 0),
        credit: Number(group._sum.credit ?? 0),
      };
    })
    .sort((a, b) => a.account.code.localeCompare(b.account.code));

  const totals = rows.reduce(
    (s, r) => ({ debit: s.debit + r.debit, credit: s.credit + r.credit }),
    { debit: 0, credit: 0 },
  );

  return { rows, totals };
}

export async function getProfitAndLoss(businessId: string, dateFrom: Date, dateTo: Date) {
  // Aggregated per account in the database rather than by streaming every
  // journal line through Node.
  const grouped = await prisma.journalLine.groupBy({
    by: ['accountId'],
    where: {
      entry: { businessId, date: { gte: dateFrom, lte: dateTo } },
      account: { type: { in: ['INCOME', 'EXPENSE'] } },
    },
    _sum: { debit: true, credit: true },
  });

  const incomeLines: { name: string; amount: number }[] = [];
  const expenseLines: { name: string; amount: number }[] = [];
  let revenue = 0;
  let expenses = 0;

  if (grouped.length > 0) {
    const accounts = await prisma.chartOfAccount.findMany({
      where: { id: { in: grouped.map((g) => g.accountId) } },
      select: { id: true, name: true, type: true },
    });
    const accountById = new Map(accounts.map((a) => [a.id, a]));

    for (const group of grouped) {
      const account = accountById.get(group.accountId);
      if (!account) continue;

      // Income accounts carry a credit balance, expenses a debit balance.
      const net =
        Number(group._sum.credit ?? 0) - Number(group._sum.debit ?? 0);

      if (account.type === 'INCOME') {
        revenue += net;
        incomeLines.push({ name: account.name, amount: net });
      } else {
        expenses += -net;
        expenseLines.push({ name: account.name, amount: -net });
      }
    }
  }

  return {
    revenue,
    expenses,
    netProfit: revenue - expenses,
    incomeLines,
    expenseLines,
  };
}

export async function getBalanceSheet(businessId: string, asOf: Date) {
  const { rows } = await getTrialBalance(businessId, asOf);

  const assets = rows.filter((r) => r.account.type === 'ASSET');
  const liabilities = rows.filter((r) => r.account.type === 'LIABILITY');
  const equity = rows.filter((r) => r.account.type === 'EQUITY');

  const sum = (rows: typeof assets) => rows.reduce((s, r) => s + r.debit - r.credit, 0);
  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);
  const totalEquity = sum(equity);

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
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
