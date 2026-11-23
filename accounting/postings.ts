import Decimal from 'decimal.js';
import { Numeric, PostingLine, JournalSource } from './types';

const ZERO = new Decimal(0);

function dec(value: Numeric | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Decimal ? value : new Decimal(value);
}

/**
 * True when an amount is worth posting a line for. Compares against zero
 * rather than using `isPositive()`, which is sign-based and returns true for 0.
 */
function posts(value: Numeric | null | undefined): boolean {
  return dec(value).greaterThan(0);
}

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
  cgst: Numeric;
  sgst: Numeric;
  igst: Numeric;
  cess: Numeric;
};

/**
 * Sale invoice confirmed → Debtors Dr, Sales Cr, Output GST Cr,
 * and — when the sale moves goods — COGS Dr, Inventory Cr.
 *
 * The cost half used to be missing entirely. Inventory was debited by every
 * receipt and never relieved by a sale, so the balance sheet reported stock
 * that had already been shipped, `Cost of Goods Sold` stayed at zero and gross
 * profit was the full sale value. `costOfGoods` is the weighted-average cost
 * of the stock actually issued, so the margin recognised is the real one.
 *
 * Optional because a sale can legitimately move no goods — a service invoice
 * has no inventory to relieve — and posting a zero pair would just be noise.
 */
export function saleInvoicePosting(params: {
  partyId: string;
  taxableAmount: Numeric;
  tax: TaxAmounts;
  grandTotal: Numeric;
  costOfGoods?: Numeric;
}): PostingLine[] {
  const { partyId, taxableAmount, tax, grandTotal, costOfGoods } = params;
  const lines: PostingLine[] = [
    { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: grandTotal, credit: 0, partyId },
    { accountCode: ACCOUNTS.SALES, debit: 0, credit: taxableAmount },
  ];
  if (posts(tax.cgst)) lines.push({ accountCode: ACCOUNTS.GST_OUTPUT_CGST, debit: 0, credit: tax.cgst });
  if (posts(tax.sgst)) lines.push({ accountCode: ACCOUNTS.GST_OUTPUT_SGST, debit: 0, credit: tax.sgst });
  if (posts(tax.igst)) lines.push({ accountCode: ACCOUNTS.GST_OUTPUT_IGST, debit: 0, credit: tax.igst });
  if (posts(tax.cess)) lines.push({ accountCode: ACCOUNTS.GST_OUTPUT_CESS, debit: 0, credit: tax.cess });

  // Added as a balanced pair, so the entry stays balanced with or without it.
  if (costOfGoods !== undefined && posts(costOfGoods)) {
    lines.push({ accountCode: ACCOUNTS.COGS, debit: costOfGoods, credit: 0 });
    lines.push({ accountCode: ACCOUNTS.INVENTORY, debit: 0, credit: costOfGoods });
  }

  return lines;
}

/**
 * Sales return confirmed → reverse of sale invoice posting.
 *
 * Mirroring the sale means the cost side reverses too: goods coming back go
 * into Inventory Dr and out of COGS Cr, at the cost they were issued at.
 */
export function salesReturnPosting(params: {
  partyId: string;
  taxableAmount: Numeric;
  tax: TaxAmounts;
  grandTotal: Numeric;
  costOfGoods?: Numeric;
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
  inventoryValue: Numeric;
  tax: TaxAmounts;
  grandTotal: Numeric;
}): PostingLine[] {
  const { partyId, inventoryValue, tax, grandTotal } = params;
  const lines: PostingLine[] = [
    { accountCode: ACCOUNTS.INVENTORY, debit: inventoryValue, credit: 0 },
    { accountCode: ACCOUNTS.GR_IR_CLEARING, debit: 0, credit: grandTotal, partyId },
  ];
  if (posts(tax.cgst)) lines.push({ accountCode: ACCOUNTS.GST_INPUT_CGST, debit: tax.cgst, credit: 0 });
  if (posts(tax.sgst)) lines.push({ accountCode: ACCOUNTS.GST_INPUT_SGST, debit: tax.sgst, credit: 0 });
  if (posts(tax.igst)) lines.push({ accountCode: ACCOUNTS.GST_INPUT_IGST, debit: tax.igst, credit: 0 });
  if (posts(tax.cess)) lines.push({ accountCode: ACCOUNTS.GST_INPUT_CESS, debit: tax.cess, credit: 0 });
  return lines;
}

/**
 * Purchase order confirmed → GR/IR Clearing Dr, Accounts Payable Cr
 */
export function purchaseInvoicePosting(params: {
  partyId: string;
  grandTotal: Numeric;
}): PostingLine[] {
  return [
    { accountCode: ACCOUNTS.GR_IR_CLEARING, debit: params.grandTotal, credit: 0, partyId: params.partyId },
    { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: 0, credit: params.grandTotal, partyId: params.partyId },
  ];
}

/**
 * Supplier invoice with input GST → GR/IR Clearing Dr (taxable) + Input GST Dr,
 * Accounts Payable Cr (grand total).
 *
 * This is the purchase-side counterpart of `saleInvoicePosting`: it is where
 * input tax credit enters the books. `purchaseInvoicePosting` above is the
 * simpler form for a purchase carrying no recoverable tax.
 */
export function supplierInvoicePosting(params: {
  partyId: string;
  taxableAmount: Numeric;
  tax: TaxAmounts;
  grandTotal: Numeric;
}): PostingLine[] {
  const { partyId, taxableAmount, tax, grandTotal } = params;
  const lines: PostingLine[] = [
    { accountCode: ACCOUNTS.GR_IR_CLEARING, debit: taxableAmount, credit: 0, partyId },
  ];
  if (posts(tax.cgst)) lines.push({ accountCode: ACCOUNTS.GST_INPUT_CGST, debit: tax.cgst, credit: 0 });
  if (posts(tax.sgst)) lines.push({ accountCode: ACCOUNTS.GST_INPUT_SGST, debit: tax.sgst, credit: 0 });
  if (posts(tax.igst)) lines.push({ accountCode: ACCOUNTS.GST_INPUT_IGST, debit: tax.igst, credit: 0 });
  if (posts(tax.cess)) lines.push({ accountCode: ACCOUNTS.GST_INPUT_CESS, debit: tax.cess, credit: 0 });
  lines.push({ accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: 0, credit: grandTotal, partyId });
  return lines;
}

/**
 * Purchase return confirmed → reverse of the supplier invoice posting.
 * Reduces both the payable and the input tax credit claimed.
 *
 * This is the supplier leg only. The goods physically leaving are booked by
 * `purchaseReturnStockPosting`; a confirmed return posts both in one entry.
 */
export function purchaseReturnPosting(params: {
  partyId: string;
  taxableAmount: Numeric;
  tax: TaxAmounts;
  grandTotal: Numeric;
}): PostingLine[] {
  return supplierInvoicePosting(params).map((l) => ({
    ...l,
    debit: l.credit,
    credit: l.debit,
  }));
}

/**
 * Goods leaving on a purchase return → GR/IR Clearing Dr, Inventory Cr.
 *
 * The mirror of the Inventory/GR-IR pair `grnPosting` books on receipt, and the
 * other half of a purchase return alongside `purchaseReturnPosting`. Without it
 * the stock leaves the warehouse while the Inventory account keeps carrying it,
 * and the return's credit to GR/IR clearing has nothing to clear against.
 *
 * `inventoryValue` is the value the stock subledger gave up — quantity times
 * the price on the return line — so the account and the subledger move together.
 */
export function purchaseReturnStockPosting(params: {
  partyId: string;
  inventoryValue: Numeric;
}): PostingLine[] {
  return [
    { accountCode: ACCOUNTS.GR_IR_CLEARING, debit: params.inventoryValue, credit: 0, partyId: params.partyId },
    { accountCode: ACCOUNTS.INVENTORY, debit: 0, credit: params.inventoryValue },
  ];
}

/**
 * Payment received → Bank/Cash Dr, Debtors Cr
 */
export function paymentReceivedPosting(params: {
  partyId: string;
  amount: Numeric;
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
  amount: Numeric;
  bankAccountCode?: string;
}): PostingLine[] {
  return [
    { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: params.amount, credit: 0, partyId: params.partyId },
    { accountCode: params.bankAccountCode ?? ACCOUNTS.BANK, debit: 0, credit: params.amount },
  ];
}

/**
 * Stock write-off → Stock Loss Expense Dr, Inventory Cr.
 *
 * Used for damage and expiry, and for a stock count that finds less than the
 * books say. `amount` is the weighted-average value of the units removed.
 */
export function stockWriteOffPosting(params: { amount: Numeric }): PostingLine[] {
  return [
    { accountCode: ACCOUNTS.STOCK_LOSS, debit: params.amount, credit: 0 },
    { accountCode: ACCOUNTS.INVENTORY, debit: 0, credit: params.amount },
  ];
}

/**
 * Stock gain from a count → Inventory Dr, Stock Loss Cr.
 *
 * The mirror of a write-off, booked to the same account so a business's net
 * shrinkage is a single figure: losses debit it, gains credit it.
 */
export function stockGainPosting(params: { amount: Numeric }): PostingLine[] {
  return [
    { accountCode: ACCOUNTS.INVENTORY, debit: params.amount, credit: 0 },
    { accountCode: ACCOUNTS.STOCK_LOSS, debit: 0, credit: params.amount },
  ];
}

export type { JournalSource };
