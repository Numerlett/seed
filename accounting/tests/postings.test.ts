import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import { assertPostable } from '../validation';
import {
  ACCOUNTS,
  purchaseReturnPosting,
  purchaseReturnStockPosting,
  stockGainPosting,
  stockWriteOffPosting,
} from '../postings';
import type { PostingLine } from '../types';

/** Net debit minus credit for one account across a set of lines. */
function netDebit(lines: PostingLine[], accountCode: string): Decimal {
  return lines
    .filter((line) => line.accountCode === accountCode)
    .reduce(
      (sum, line) =>
        sum.plus(line.debit.toString()).minus(line.credit.toString()),
      new Decimal(0),
    );
}

describe('purchase return postings', () => {
  const supplierLeg = purchaseReturnPosting({
    partyId: 'supplier-1',
    taxableAmount: '6000.00',
    tax: { cgst: '540.00', sgst: '540.00', igst: 0, cess: 0 },
    grandTotal: '7080.00',
  });
  const stockLeg = purchaseReturnStockPosting({
    partyId: 'supplier-1',
    inventoryValue: '6000.00',
  });

  it('the supplier leg reduces the payable and the input tax credit', () => {
    expect(netDebit(supplierLeg, ACCOUNTS.ACCOUNTS_PAYABLE).toFixed(2)).toBe(
      '7080.00',
    );
    expect(netDebit(supplierLeg, ACCOUNTS.GST_INPUT_CGST).toFixed(2)).toBe(
      '-540.00',
    );
    expect(netDebit(supplierLeg, ACCOUNTS.GST_INPUT_SGST).toFixed(2)).toBe(
      '-540.00',
    );
  });

  it('the stock leg takes the goods out of Inventory', () => {
    expect(netDebit(stockLeg, ACCOUNTS.INVENTORY).toFixed(2)).toBe('-6000.00');
  });

  it('is balanced on its own, so it can be posted with or without the supplier leg', () => {
    expect(() => assertPostable(stockLeg)).not.toThrow();
    expect(() => assertPostable(supplierLeg)).not.toThrow();
  });

  it('together the two legs leave GR/IR clearing at zero', () => {
    // The supplier leg credits GR/IR for the taxable value; the stock leg
    // debits it for the value of the goods. Both are 6000, so the receipt's
    // GR/IR entries are fully reversed. Before the stock leg existed the
    // credit stood alone and the account was left 6000 out.
    const lines = [...supplierLeg, ...stockLeg];
    expect(() => assertPostable(lines)).not.toThrow();
    expect(netDebit(lines, ACCOUNTS.GR_IR_CLEARING).isZero()).toBe(true);
  });
});

describe('stock gain and write-off postings', () => {
  it('a write-off debits Stock Loss and credits Inventory', () => {
    const lines = stockWriteOffPosting({ amount: '2400.00' });
    expect(netDebit(lines, ACCOUNTS.STOCK_LOSS).toFixed(2)).toBe('2400.00');
    expect(netDebit(lines, ACCOUNTS.INVENTORY).toFixed(2)).toBe('-2400.00');
    expect(() => assertPostable(lines)).not.toThrow();
  });

  it('a gain is the exact mirror: Inventory debited, Stock Loss credited', () => {
    const lines = stockGainPosting({ amount: '1800.00' });
    expect(netDebit(lines, ACCOUNTS.INVENTORY).toFixed(2)).toBe('1800.00');
    expect(netDebit(lines, ACCOUNTS.STOCK_LOSS).toFixed(2)).toBe('-1800.00');
    expect(() => assertPostable(lines)).not.toThrow();
  });

  it('a gain and an equal write-off cancel out in Stock Loss', () => {
    // Shrinkage is one net figure: a count that finds as much as it loses
    // should not look like a loss.
    const lines = [
      ...stockGainPosting({ amount: '500.00' }),
      ...stockWriteOffPosting({ amount: '500.00' }),
    ];
    expect(netDebit(lines, ACCOUNTS.STOCK_LOSS).isZero()).toBe(true);
    expect(netDebit(lines, ACCOUNTS.INVENTORY).isZero()).toBe(true);
  });
});
