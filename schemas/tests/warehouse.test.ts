import { describe, it, expect } from 'vitest';
import { warehouseSchema, shelfSchema, productBatchSchema } from '../warehouse';

describe('warehouseSchema', () => {
  const valid = { name: 'Main Warehouse', businessId: 'b1' };

  it('accepts valid warehouse', () => {
    expect(() => warehouseSchema.parse(valid)).not.toThrow();
  });

  it('requires name', () => {
    expect(warehouseSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('requires businessId', () => {
    const { businessId: _, ...rest } = valid;
    expect(warehouseSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    expect(warehouseSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('defaults isActive to true', () => {
    const result = warehouseSchema.parse(valid);
    expect(result.isActive).toBe(true);
  });
});

describe('shelfSchema', () => {
  const valid = { shelfCode: 'A-01', warehouseId: 'wh-1', businessId: 'b1' };

  it('accepts valid shelf', () => {
    expect(() => shelfSchema.parse(valid)).not.toThrow();
  });

  it('requires shelfCode', () => {
    expect(shelfSchema.safeParse({ ...valid, shelfCode: '' }).success).toBe(false);
  });

  it('rejects shelfCode longer than 50 chars', () => {
    expect(shelfSchema.safeParse({ ...valid, shelfCode: 'a'.repeat(51) }).success).toBe(false);
  });
});

describe('productBatchSchema', () => {
  const valid = { batchNumber: 'BATCH-001', purchasePrice: 50, productId: 'p1', businessId: 'b1' };

  it('accepts valid batch', () => {
    expect(() => productBatchSchema.parse(valid)).not.toThrow();
  });

  it('requires batchNumber', () => {
    expect(productBatchSchema.safeParse({ ...valid, batchNumber: '' }).success).toBe(false);
  });

  it('rejects negative purchasePrice', () => {
    expect(productBatchSchema.safeParse({ ...valid, purchasePrice: -1 }).success).toBe(false);
  });

  it('coerces expiryDate string to Date', () => {
    const result = productBatchSchema.parse({ ...valid, expiryDate: '2026-12-31' });
    expect(result.expiryDate).toBeInstanceOf(Date);
  });
});
