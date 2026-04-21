import { prisma, AccountSubType } from '@seed/database';
import { TRPCError } from '@trpc/server';

// Seed the default Indian Chart of Accounts for a new business
const DEFAULT_COA = [
  // Assets
  { code: '1001', name: 'Cash in Hand', type: 'ASSET' as const, subType: 'CASH' as const },
  { code: '1002', name: 'Bank Accounts', type: 'ASSET' as const, subType: 'BANK' as const },
  { code: '1100', name: 'Trade Receivables', type: 'ASSET' as const, subType: 'ACCOUNTS_RECEIVABLE' as const },
  { code: '1200', name: 'Inventory', type: 'ASSET' as const, subType: 'INVENTORY' as const },
  { code: '1500', name: 'Fixed Assets', type: 'ASSET' as const, subType: 'FIXED_ASSET' as const },
  // Liabilities
  { code: '2100', name: 'Trade Payables', type: 'LIABILITY' as const, subType: 'ACCOUNTS_PAYABLE' as const },
  { code: '2201', name: 'GST Output CGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2202', name: 'GST Output SGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2203', name: 'GST Output IGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2211', name: 'GST Input CGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2212', name: 'GST Input SGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2213', name: 'GST Input IGST', type: 'LIABILITY' as const, subType: 'GST_PAYABLE' as const },
  { code: '2300', name: 'GR/IR Clearing', type: 'LIABILITY' as const, subType: 'OTHER_LIABILITY' as const },
  // Equity
  { code: '3001', name: 'Owner Equity / Capital', type: 'EQUITY' as const, subType: 'CAPITAL' as const },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY' as const, subType: 'RETAINED_EARNINGS' as const },
  // Income
  { code: '4001', name: 'Sales Revenue', type: 'INCOME' as const, subType: 'SALES' as const },
  { code: '4002', name: 'Sales Returns', type: 'INCOME' as const, subType: 'SALES' as const },
  { code: '4900', name: 'Other Income', type: 'INCOME' as const, subType: 'OTHER_INCOME' as const },
  // Expenses
  { code: '5001', name: 'Purchases', type: 'EXPENSE' as const, subType: 'PURCHASE' as const },
  { code: '5002', name: 'Purchase Returns', type: 'EXPENSE' as const, subType: 'PURCHASE' as const },
  { code: '5100', name: 'Cost of Goods Sold', type: 'EXPENSE' as const, subType: 'COGS' as const },
  { code: '5200', name: 'Stock Loss / Write-off', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
  { code: '5300', name: 'Depreciation', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
  { code: '5400', name: 'Salaries & Wages', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
  { code: '5500', name: 'Rent', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
  { code: '5900', name: 'Other Expenses', type: 'EXPENSE' as const, subType: 'OPERATING_EXPENSE' as const },
];

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
  const totalDebit = input.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = input.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: `Journal entry is not balanced: debits=${totalDebit}, credits=${totalCredit}` });
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

  const lines = await prisma.journalLine.findMany({
    where: { entry: { businessId, ...dateFilter } },
    include: { account: true },
  });

  const map = new Map<string, { account: { code: string; name: string; type: string }; debit: number; credit: number }>();
  for (const line of lines) {
    const key = line.accountId;
    if (!map.has(key)) {
      map.set(key, {
        account: { code: line.account.code, name: line.account.name, type: line.account.type },
        debit: 0,
        credit: 0,
      });
    }
    const entry = map.get(key)!;
    entry.debit += Number(line.debit);
    entry.credit += Number(line.credit);
  }

  const rows = Array.from(map.values()).sort((a, b) => a.account.code.localeCompare(b.account.code));
  const totals = rows.reduce((s, r) => ({ debit: s.debit + r.debit, credit: s.credit + r.credit }), { debit: 0, credit: 0 });

  return { rows, totals };
}

export async function getProfitAndLoss(businessId: string, dateFrom: Date, dateTo: Date) {
  const lines = await prisma.journalLine.findMany({
    where: {
      entry: { businessId, date: { gte: dateFrom, lte: dateTo } },
      account: { type: { in: ['INCOME', 'EXPENSE'] } },
    },
    include: { account: { select: { code: true, name: true, type: true } } },
  });

  let revenue = 0;
  let expenses = 0;
  const incomeLines: { name: string; amount: number }[] = [];
  const expenseLines: { name: string; amount: number }[] = [];
  const incomeMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();

  for (const line of lines) {
    const net = Number(line.credit) - Number(line.debit);
    if (line.account.type === 'INCOME') {
      revenue += net;
      incomeMap.set(line.account.name, (incomeMap.get(line.account.name) ?? 0) + net);
    } else {
      expenses += -net;
      expenseMap.set(line.account.name, (expenseMap.get(line.account.name) ?? 0) + -net);
    }
  }

  for (const [name, amount] of incomeMap) incomeLines.push({ name, amount });
  for (const [name, amount] of expenseMap) expenseLines.push({ name, amount });

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
