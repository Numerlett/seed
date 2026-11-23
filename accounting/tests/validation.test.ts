import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import {
  assertBalanced,
  assertPostable,
  assertValidLines,
  totalCredit,
  totalDebit,
} from '../validation';
import {
  ACCOUNTS,
  grnPosting,
  paymentMadePosting,
  paymentReceivedPosting,
  purchaseInvoicePosting,
  saleInvoicePosting,
  salesReturnPosting,
  stockWriteOffPosting,
} from '../postings';
import type { PostingLine } from '../types';

const balanced: PostingLine[] = [
  { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: 1180, credit: 0 },
  { accountCode: ACCOUNTS.SALES, debit: 0, credit: 1000 },
  { accountCode: ACCOUNTS.GST_OUTPUT_CGST, debit: 0, credit: 90 },
  { accountCode: ACCOUNTS.GST_OUTPUT_SGST, debit: 0, credit: 90 },
];

describe('assertBalanced', () => {
  it('accepts an entry whose debits equal its credits', () => {
    expect(() => assertBalanced(balanced)).not.toThrow();
  });

  it('rejects an entry that does not balance', () => {
    expect(() =>
      assertBalanced([
        { accountCode: ACCOUNTS.BANK, debit: 100, credit: 0 },
        { accountCode: ACCOUNTS.SALES, debit: 0, credit: 99 },
      ]),
    ).toThrow(/not balanced/);
  });

  it('regression: rejects a sub-paisa imbalance the old tolerance allowed', () => {
    // The previous float check passed anything within 0.001, so this entry was
    // accepted and the difference accumulated silently into the trial balance.
    expect(() =>
      assertBalanced([
        { accountCode: ACCOUNTS.BANK, debit: '100.0005', credit: 0 },
        { accountCode: ACCOUNTS.SALES, debit: 0, credit: '100' },
      ]),
    ).toThrow(/not balanced/);
  });

  it('accepts amounts that float arithmetic would not balance', () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point.
    expect(() =>
      assertBalanced([
        { accountCode: ACCOUNTS.BANK, debit: '0.1', credit: 0 },
        { accountCode: ACCOUNTS.CASH, debit: '0.2', credit: 0 },
        { accountCode: ACCOUNTS.SALES, debit: 0, credit: '0.3' },
      ]),
    ).not.toThrow();
  });

  it('reads Decimal amounts without conversion', () => {
    expect(() =>
      assertBalanced([
        { accountCode: ACCOUNTS.BANK, debit: new Decimal('250.75'), credit: 0 },
        { accountCode: ACCOUNTS.SALES, debit: 0, credit: new Decimal('250.75') },
      ]),
    ).not.toThrow();
  });
});

describe('assertValidLines', () => {
  it('accepts well-formed lines', () => {
    expect(() => assertValidLines(balanced)).not.toThrow();
  });

  it('rejects an empty entry', () => {
    expect(() => assertValidLines([])).toThrow(/at least one line/);
  });

  it('rejects negative amounts', () => {
    expect(() =>
      assertValidLines([
        { accountCode: ACCOUNTS.BANK, debit: -100, credit: 0 },
      ]),
    ).toThrow(/cannot be negative/);
  });

  it('rejects a line posting to both sides', () => {
    expect(() =>
      assertValidLines([
        { accountCode: ACCOUNTS.BANK, debit: 100, credit: 100 },
      ]),
    ).toThrow(/both debit and credit/);
  });

  it('rejects a line that posts nothing', () => {
    expect(() =>
      assertValidLines([{ accountCode: ACCOUNTS.BANK, debit: 0, credit: 0 }]),
    ).toThrow(/must post an amount/);
  });
});

describe('assertPostable', () => {
  it('runs both checks, catching shape errors before balance', () => {
    expect(() =>
      assertPostable([
        { accountCode: ACCOUNTS.BANK, debit: -50, credit: 0 },
        { accountCode: ACCOUNTS.SALES, debit: 0, credit: -50 },
      ]),
    ).toThrow(/cannot be negative/);
  });
});

describe('totals', () => {
  it('sums each column exactly', () => {
    expect(totalDebit(balanced).toString()).toBe('1180');
    expect(totalCredit(balanced).toString()).toBe('1180');
  });
});

describe('postings produce balanced entries', () => {
  const tax = { cgst: 90, sgst: 90, igst: 0, cess: 0 };
  const interStateTax = { cgst: 0, sgst: 0, igst: 180, cess: 0 };

  it('sale invoice (intra-state)', () => {
    const lines = saleInvoicePosting({
      partyId: 'party-1',
      taxableAmount: 1000,
      tax,
      grandTotal: 1180,
    });
    expect(() => assertPostable(lines)).not.toThrow();
  });

  it('sale invoice (inter-state)', () => {
    const lines = saleInvoicePosting({
      partyId: 'party-1',
      taxableAmount: 1000,
      tax: interStateTax,
      grandTotal: 1180,
    });
    expect(() => assertPostable(lines)).not.toThrow();
    // Only the IGST head should appear.
    expect(lines.some((l) => l.accountCode === ACCOUNTS.GST_OUTPUT_IGST)).toBe(true);
    expect(lines.some((l) => l.accountCode === ACCOUNTS.GST_OUTPUT_CGST)).toBe(false);
  });

  it('sales return reverses the sale exactly', () => {
    const params = {
      partyId: 'party-1',
      taxableAmount: 1000,
      tax,
      grandTotal: 1180,
    };
    const sale = saleInvoicePosting(params);
    const ret = salesReturnPosting(params);

    expect(() => assertPostable(ret)).not.toThrow();
    expect(totalDebit(ret).toString()).toBe(totalCredit(sale).toString());
  });

  it('GRN', () => {
    const lines = grnPosting({
      partyId: 'supplier-1',
      inventoryValue: 1000,
      tax,
      grandTotal: 1180,
    });
    expect(() => assertPostable(lines)).not.toThrow();
  });

  it('purchase invoice', () => {
    const lines = purchaseInvoicePosting({
      partyId: 'supplier-1',
      grandTotal: 1180,
    });
    expect(() => assertPostable(lines)).not.toThrow();
  });

  it('payment received', () => {
    const lines = paymentReceivedPosting({ partyId: 'party-1', amount: 500 });
    expect(() => assertPostable(lines)).not.toThrow();
  });

  it('payment made', () => {
    const lines = paymentMadePosting({ partyId: 'supplier-1', amount: 500 });
    expect(() => assertPostable(lines)).not.toThrow();
  });

  it('stock write-off', () => {
    const lines = stockWriteOffPosting({ amount: 250 });
    expect(() => assertPostable(lines)).not.toThrow();
  });

  it('omits tax heads that carry no amount', () => {
    const lines = saleInvoicePosting({
      partyId: 'party-1',
      taxableAmount: 1000,
      tax: { cgst: 0, sgst: 0, igst: 0, cess: 0 },
      grandTotal: 1000,
    });
    expect(lines).toHaveLength(2);
    expect(() => assertPostable(lines)).not.toThrow();
  });

  it('balances with Decimal tax amounts straight from the tax engine', () => {
    const lines = saleInvoicePosting({
      partyId: 'party-1',
      taxableAmount: new Decimal('10000'),
      tax: {
        cgst: new Decimal('12.5'),
        sgst: new Decimal('12.5'),
        igst: 0,
        cess: 0,
      },
      grandTotal: new Decimal('10025'),
    });
    expect(() => assertPostable(lines)).not.toThrow();
  });
});
