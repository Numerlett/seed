import { describe, it, expect } from 'vitest';
import { purchaseOrderSchema, grnSchema, purchaseReturnSchema } from '../purchase';

const validItem = { productId: 'p1', quantity: 5, unitPrice: 20 };

describe('purchaseOrderSchema', () => {
  const valid = { businessId: 'b1', supplierId: 's1', items: [validItem] };

  it('accepts valid PO', () => {
    expect(() => purchaseOrderSchema.parse(valid)).not.toThrow();
  });

  it('requires supplierId', () => {
    const { supplierId: _, ...rest } = valid;
    expect(purchaseOrderSchema.safeParse(rest).success).toBe(false);
  });

  it('requires businessId', () => {
    const { businessId: _, ...rest } = valid;
    expect(purchaseOrderSchema.safeParse(rest).success).toBe(false);
  });

  it('requires at least one item', () => {
    expect(purchaseOrderSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it('rejects item with quantity 0', () => {
    expect(purchaseOrderSchema.safeParse({ ...valid, items: [{ ...validItem, quantity: 0 }] }).success).toBe(false);
  });
});

describe('grnSchema', () => {
  const valid = {
    businessId: 'b1',
    supplierId: 's1',
    warehouseId: 'w1',
    items: [{ productId: 'p1', quantityReceived: 3, unitPrice: 20 }],
  };

  it('accepts valid GRN', () => {
    expect(() => grnSchema.parse(valid)).not.toThrow();
  });

  it('requires supplierId', () => {
    const { supplierId: _, ...rest } = valid;
    expect(grnSchema.safeParse(rest).success).toBe(false);
  });

  it('requires warehouseId', () => {
    const { warehouseId: _, ...rest } = valid;
    expect(grnSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects item with quantityReceived <= 0', () => {
    expect(
      grnSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantityReceived: 0 }] }).success,
    ).toBe(false);
  });
});

describe('purchaseReturnSchema', () => {
  const valid = {
    businessId: 'b1',
    supplierId: 's1',
    warehouseId: 'w1',
    items: [{ productId: 'p1', quantity: 2, unitPrice: 10 }],
  };

  it('accepts valid return', () => {
    expect(() => purchaseReturnSchema.parse(valid)).not.toThrow();
  });

  it('requires at least one item', () => {
    expect(purchaseReturnSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });
});
