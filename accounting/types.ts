import type Decimal from 'decimal.js';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export type AccountSubType =
  // Assets
  | 'CASH' | 'BANK' | 'ACCOUNTS_RECEIVABLE' | 'INVENTORY' | 'FIXED_ASSET' | 'OTHER_ASSET'
  // Liabilities
  | 'ACCOUNTS_PAYABLE' | 'GST_PAYABLE' | 'TDS_PAYABLE' | 'LOAN' | 'OTHER_LIABILITY'
  // Equity
  | 'CAPITAL' | 'RETAINED_EARNINGS' | 'DRAWINGS'
  // Income
  | 'SALES' | 'OTHER_INCOME' | 'INTEREST_INCOME'
  // Expense
  | 'PURCHASE' | 'COGS' | 'OPERATING_EXPENSE' | 'DEPRECIATION' | 'TAX_EXPENSE' | 'OTHER_EXPENSE';

export type JournalSource =
  | 'SALE_INVOICE'
  | 'SALE_RETURN'
  | 'PURCHASE_ORDER'
  | 'GRN'
  | 'PURCHASE_RETURN'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_MADE'
  | 'STOCK_ADJUSTMENT'
  | 'DAMAGE_REPORT'
  | 'PAYROLL_RUN'
  | 'DEPRECIATION_RUN'
  | 'MANUAL';

/**
 * Any value readable as a number. Accepting strings and Decimals lets Prisma
 * `Decimal` columns pass through without a lossy trip via `Number()`.
 */
export type Numeric = number | string | Decimal;

export type PostingLine = {
  accountCode: string;
  debit: Numeric;
  credit: Numeric;
  narration?: string;
  partyId?: string;
};

export type JournalEntryInput = {
  businessId: string;
  date: Date;
  source: JournalSource;
  sourceId: string;
  narration: string;
  lines: PostingLine[];
  postedBy?: string;
};
