import { PostingLine, JournalSource } from './types';

/**
 * Standard account codes (Indian Chart of Accounts defaults).
 * Businesses can customise these via ChartOfAccounts table.
 */
export const ACCOUNTS = {
  // Assets
  CASH: '1001',
  BANK: '1002',
  ACCOUNTS_RECEIVABLE: '1100',
  INVENTORY: '1200',
  // Liabilities
  ACCOUNTS_PAYABLE: '2100',
  GST_OUTPUT_CGST: '2201',
  GST_OUTPUT_SGST: '2202',
  GST_OUTPUT_IGST: '2203',
  GST_OUTPUT_CESS: '2204',
  GST_INPUT_CGST: '2211',
  GST_INPUT_SGST: '2212',
  GST_INPUT_IGST: '2213',
  GST_INPUT_CESS: '2214',
  GR_IR_CLEARING: '2300',
  // Equity
  RETAINED_EARNINGS: '3100',
  // Income
  SALES: '4001',
  SALES_RETURN: '4002',
  OTHER_INCOME: '4900',
  // Expenses
  PURCHASE: '5001',
  PURCHASE_RETURN: '5002',
  COGS: '5100',
  STOCK_LOSS: '5200',
  DEPRECIATION: '5300',
} as const;

type TaxAmounts = {
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
};

/**
 * Sale invoice confirmed → Debtors Dr, Sales Cr, Output GST Cr
 */
export function saleInvoicePosting(params: {
  partyId: string;
  taxableAmount: number;
  tax: TaxAmounts;
  grandTotal: number;
}): PostingLine[] {
  const { partyId, taxableAmount, tax, grandTotal } = params;
  const lines: PostingLine[] = [
    { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: grandTotal, credit: 0, partyId },
    { accountCode: ACCOUNTS.SALES, debit: 0, credit: taxableAmount },
  ];
  if (tax.cgst > 0) lines.push({ accountCode: ACCOUNTS.GST_OUTPUT_CGST, debit: 0, credit: tax.cgst });
  if (tax.sgst > 0) lines.push({ accountCode: ACCOUNTS.GST_OUTPUT_SGST, debit: 0, credit: tax.sgst });
  if (tax.igst > 0) lines.push({ accountCode: ACCOUNTS.GST_OUTPUT_IGST, debit: 0, credit: tax.igst });
  if (tax.cess > 0) lines.push({ accountCode: ACCOUNTS.GST_OUTPUT_CESS, debit: 0, credit: tax.cess });
  return lines;
}

/**
 * Sales return confirmed → reverse of sale invoice posting
 */
export function salesReturnPosting(params: {
  partyId: string;
  taxableAmount: number;
  tax: TaxAmounts;
  grandTotal: number;
}): PostingLine[] {
  return saleInvoicePosting(params).map((l) => ({
    ...l,
    debit: l.credit,
    credit: l.debit,
  }));
}

/**
 * GRN confirmed → Inventory Dr, GR/IR Clearing Cr, Input GST Dr
 */
export function grnPosting(params: {
  partyId: string;
  inventoryValue: number;
  tax: TaxAmounts;
  grandTotal: number;
}): PostingLine[] {
  const { partyId, inventoryValue, tax, grandTotal } = params;
  const lines: PostingLine[] = [
    { accountCode: ACCOUNTS.INVENTORY, debit: inventoryValue, credit: 0 },
    { accountCode: ACCOUNTS.GR_IR_CLEARING, debit: 0, credit: grandTotal, partyId },
  ];
  if (tax.cgst > 0) lines.push({ accountCode: ACCOUNTS.GST_INPUT_CGST, debit: tax.cgst, credit: 0 });
  if (tax.sgst > 0) lines.push({ accountCode: ACCOUNTS.GST_INPUT_SGST, debit: tax.sgst, credit: 0 });
  if (tax.igst > 0) lines.push({ accountCode: ACCOUNTS.GST_INPUT_IGST, debit: tax.igst, credit: 0 });
  if (tax.cess > 0) lines.push({ accountCode: ACCOUNTS.GST_INPUT_CESS, debit: tax.cess, credit: 0 });
  return lines;
}

/**
 * Purchase order confirmed → GR/IR Clearing Dr, Accounts Payable Cr
 */
export function purchaseInvoicePosting(params: {
  partyId: string;
  grandTotal: number;
}): PostingLine[] {
  return [
    { accountCode: ACCOUNTS.GR_IR_CLEARING, debit: params.grandTotal, credit: 0, partyId: params.partyId },
    { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: 0, credit: params.grandTotal, partyId: params.partyId },
  ];
}

/**
 * Payment received → Bank/Cash Dr, Debtors Cr
 */
export function paymentReceivedPosting(params: {
  partyId: string;
  amount: number;
  bankAccountCode?: string;
}): PostingLine[] {
  return [
    { accountCode: params.bankAccountCode ?? ACCOUNTS.BANK, debit: params.amount, credit: 0 },
    { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: 0, credit: params.amount, partyId: params.partyId },
  ];
}

/**
 * Payment made → Accounts Payable Dr, Bank/Cash Cr
 */
export function paymentMadePosting(params: {
  partyId: string;
  amount: number;
  bankAccountCode?: string;
}): PostingLine[] {
  return [
    { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: params.amount, credit: 0, partyId: params.partyId },
    { accountCode: params.bankAccountCode ?? ACCOUNTS.BANK, debit: 0, credit: params.amount },
  ];
}

/**
 * Stock write-off (damage/expired) → Stock Loss Expense Dr, Inventory Cr
 */
export function stockWriteOffPosting(params: { amount: number }): PostingLine[] {
  return [
    { accountCode: ACCOUNTS.STOCK_LOSS, debit: params.amount, credit: 0 },
    { accountCode: ACCOUNTS.INVENTORY, debit: 0, credit: params.amount },
  ];
}

export type { JournalSource };
