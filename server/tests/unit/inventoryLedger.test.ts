import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// Mock DB before importing module under test
vi.mock('@seed/database', () => ({
  prisma: {},
  Prisma: {
    Decimal: class Decimal {
      private val: number;
      constructor(v: string | number) { this.val = Number(v); }
      mul(d: { val: number }) { return new (this.constructor as typeof Decimal)(this.val * d.val); }
      neg() { return new (this.constructor as typeof Decimal)(-this.val); }
      lt(d: { val: number }) { return this.val < d.val; }
      toFixed(n: number) { return this.val.toFixed(n); }
      toString() { return String(this.val); }
      get _val() { return this.val; }
    },
  },
}));

import { validateStockAvailability } from '../../helpers/inventoryLedger';

function makeTx(stock: { currentQuantity: { lt: (d: unknown) => boolean } } | null, allowNegative = false) {
  return {
    inventoryStock: {
      findFirst: vi.fn().mockResolvedValue(stock),
    },
    product: {
      findUnique: vi.fn().mockResolvedValue({ allowNegative, name: 'Widget' }),
    },
  } as unknown as Parameters<typeof validateStockAvailability>[0];
}

describe('validateStockAvailability', () => {
  it('returns stock when quantity is sufficient', async () => {
    const stock = { currentQuantity: { lt: () => false } };
    const tx = makeTx(stock);
    const result = await validateStockAvailability(tx, {
      productId: 'p1',
      warehouseId: 'w1',
      requiredQuantity: 5,
    });
    expect(result).toBe(stock);
  });

  it('throws TRPCError BAD_REQUEST when stock is insufficient', async () => {
    const stock = { currentQuantity: { lt: () => true, toFixed: () => '2.00' } };
    const tx = makeTx(stock, false);
    await expect(
      validateStockAvailability(tx, {
        productId: 'p1',
        warehouseId: 'w1',
        requiredQuantity: 10,
        productName: 'Widget',
      }),
    ).rejects.toThrow(TRPCError);
  });

  it('returns null when stock is null but allowNegative is true', async () => {
    const tx = makeTx(null, true);
    const result = await validateStockAvailability(tx, {
      productId: 'p1',
      warehouseId: 'w1',
      requiredQuantity: 5,
    });
    expect(result).toBeNull();
  });

  it('throws TRPCError when stock is null and allowNegative is false', async () => {
    const tx = makeTx(null, false);
    await expect(
      validateStockAvailability(tx, {
        productId: 'p1',
        warehouseId: 'w1',
        requiredQuantity: 1,
      }),
    ).rejects.toThrow(TRPCError);
  });
});
