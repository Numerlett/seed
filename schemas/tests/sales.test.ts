import { describe, it, expect } from 'vitest';
import {
  saleInvoiceItemSchema,
  saleInvoiceSchema,
  saleInvoiceUpdateSchema,
  salesReturnSchema,
} from '../sales';

const validItem = {
  productId: 'prod-1',
  quantity: 2,
  unitPrice: 100,
};

const validInvoice = {
  businessId: 'biz-1',
  customerId: 'cust-1',
  warehouseId: 'wh-1',
  items: [validItem],
};

describe('saleInvoiceItemSchema', () => {
  it('accepts valid item', () => {
    expect(() => saleInvoiceItemSchema.parse(validItem)).not.toThrow();
  });

  it('rejects quantity <= 0', () => {
    expect(saleInvoiceItemSchema.safeParse({ ...validItem, quantity: 0 }).success).toBe(false);
    expect(saleInvoiceItemSchema.safeParse({ ...validItem, quantity: -1 }).success).toBe(false);
  });

  it('rejects negative unitPrice', () => {
    expect(saleInvoiceItemSchema.safeParse({ ...validItem, unitPrice: -1 }).success).toBe(false);
  });

  it('defaults taxRate and discount to 0', () => {
    const result = saleInvoiceItemSchema.parse(validItem);
    expect(result.taxRate).toBe(0);
    expect(result.discount).toBe(0);
  });

  it('rejects taxRate > 100', () => {
    expect(saleInvoiceItemSchema.safeParse({ ...validItem, taxRate: 101 }).success).toBe(false);
  });

  it('rejects discount > 100', () => {
    expect(saleInvoiceItemSchema.safeParse({ ...validItem, discount: 101 }).success).toBe(false);
  });

  it('allows optional shelfId and batchId', () => {
    const result = saleInvoiceItemSchema.safeParse({ ...validItem, shelfId: 's1', batchId: 'b1' });
    expect(result.success).toBe(true);
  });
});

describe('saleInvoiceSchema', () => {
  it('accepts valid invoice', () => {
    expect(() => saleInvoiceSchema.parse(validInvoice)).not.toThrow();
  });

  it('requires businessId', () => {
    const { businessId: _, ...rest } = validInvoice;
    expect(saleInvoiceSchema.safeParse(rest).success).toBe(false);
  });

  it('requires customerId', () => {
    const { customerId: _, ...rest } = validInvoice;
    expect(saleInvoiceSchema.safeParse(rest).success).toBe(false);
  });

  it('requires warehouseId', () => {
    const { warehouseId: _, ...rest } = validInvoice;
    expect(saleInvoiceSchema.safeParse(rest).success).toBe(false);
  });

  it('requires at least one item', () => {
    expect(saleInvoiceSchema.safeParse({ ...validInvoice, items: [] }).success).toBe(false);
  });

  it('accepts optional documentNumber', () => {
    const result = saleInvoiceSchema.safeParse({ ...validInvoice, documentNumber: 'INV-001' });
    expect(result.success).toBe(true);
  });

  it('coerces invoiceDate string to Date', () => {
    const result = saleInvoiceSchema.parse({ ...validInvoice, invoiceDate: '2025-01-01' });
    expect(result.invoiceDate).toBeInstanceOf(Date);
  });
});

describe('saleInvoiceUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(() => saleInvoiceUpdateSchema.parse({})).not.toThrow();
  });

  it('accepts partial update', () => {
    const result = saleInvoiceUpdateSchema.safeParse({ notes: 'Updated' });
    expect(result.success).toBe(true);
  });

  it('rejects items array with zero items', () => {
    expect(saleInvoiceUpdateSchema.safeParse({ items: [] }).success).toBe(false);
  });
});

describe('salesReturnSchema', () => {
  const validReturn = {
    businessId: 'biz-1',
    customerId: 'cust-1',
    warehouseId: 'wh-1',
    items: [{ productId: 'p1', quantity: 1, unitPrice: 10 }],
  };

  it('accepts valid return', () => {
    expect(() => salesReturnSchema.parse(validReturn)).not.toThrow();
  });

  it('requires at least one item', () => {
    expect(salesReturnSchema.safeParse({ ...validReturn, items: [] }).success).toBe(false);
  });

  it('requires warehouseId', () => {
    const { warehouseId: _, ...rest } = validReturn;
    expect(salesReturnSchema.safeParse(rest).success).toBe(false);
  });
});
