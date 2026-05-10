import { describe, it, expect } from 'vitest';
import { stockAdjustmentSchema, stockTransferSchema, damageReportSchema } from '../stockops';

describe('stockAdjustmentSchema', () => {
  const valid = {
    businessId: 'b1',
    warehouseId: 'wh-1',
    reason: 'Cycle count',
    items: [{ productId: 'p1', systemQuantity: 10, actualQuantity: 8, unitCost: 5 }],
  };

  it('accepts valid adjustment', () => {
    expect(() => stockAdjustmentSchema.parse(valid)).not.toThrow();
  });

  it('requires reason', () => {
    expect(stockAdjustmentSchema.safeParse({ ...valid, reason: '' }).success).toBe(false);
  });

  it('requires at least one item', () => {
    expect(stockAdjustmentSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });

  it('rejects negative quantities', () => {
    expect(
      stockAdjustmentSchema.safeParse({
        ...valid,
        items: [{ ...valid.items[0], systemQuantity: -1 }],
      }).success,
    ).toBe(false);
  });
});

describe('stockTransferSchema', () => {
  const valid = {
    businessId: 'b1',
    sourceWarehouseId: 'wh-1',
    destWarehouseId: 'wh-2',
    items: [{ productId: 'p1', quantity: 5, unitCost: 10 }],
  };

  it('accepts valid transfer', () => {
    expect(() => stockTransferSchema.parse(valid)).not.toThrow();
  });

  it('requires sourceWarehouseId', () => {
    const { sourceWarehouseId: _, ...rest } = valid;
    expect(stockTransferSchema.safeParse(rest).success).toBe(false);
  });

  it('requires destWarehouseId', () => {
    const { destWarehouseId: _, ...rest } = valid;
    expect(stockTransferSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects quantity 0', () => {
    expect(
      stockTransferSchema.safeParse({ ...valid, items: [{ ...valid.items[0], quantity: 0 }] }).success,
    ).toBe(false);
  });
});

describe('damageReportSchema', () => {
  const valid = {
    businessId: 'b1',
    warehouseId: 'wh-1',
    reason: 'Physical damage',
    items: [{ productId: 'p1', quantity: 2, unitCost: 15, damageType: 'DAMAGED' as const }],
  };

  it('accepts valid damage report', () => {
    expect(() => damageReportSchema.parse(valid)).not.toThrow();
  });

  it('requires reason', () => {
    expect(damageReportSchema.safeParse({ ...valid, reason: '' }).success).toBe(false);
  });

  it('rejects invalid damageType', () => {
    expect(
      damageReportSchema.safeParse({
        ...valid,
        items: [{ ...valid.items[0], damageType: 'BROKEN' }],
      }).success,
    ).toBe(false);
  });

  it('accepts all valid damageType values', () => {
    for (const type of ['DAMAGED', 'EXPIRED', 'LOST', 'OTHER'] as const) {
      expect(
        damageReportSchema.safeParse({
          ...valid,
          items: [{ ...valid.items[0], damageType: type }],
        }).success,
      ).toBe(true);
    }
  });
});
