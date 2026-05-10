import { describe, it, expect } from 'vitest';
import { productSchema } from '../inventory';

const validProduct = {
  name: 'Test Widget',
  sku: 'WGT-001',
  costPrice: 50,
  sellingPrice: 100,
  taxRate: 18,
  discountRate: 0,
  businessId: 'biz-1',
};

describe('productSchema', () => {
  it('accepts valid product', () => {
    expect(() => productSchema.parse(validProduct)).not.toThrow();
  });

  it('requires name', () => {
    expect(productSchema.safeParse({ ...validProduct, name: '' }).success).toBe(false);
  });

  it('requires sku', () => {
    expect(productSchema.safeParse({ ...validProduct, sku: '' }).success).toBe(false);
  });

  it('requires businessId', () => {
    const { businessId: _, ...rest } = validProduct;
    expect(productSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects name longer than 100 chars', () => {
    expect(productSchema.safeParse({ ...validProduct, name: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects negative costPrice', () => {
    expect(productSchema.safeParse({ ...validProduct, costPrice: -1 }).success).toBe(false);
  });

  it('rejects negative sellingPrice', () => {
    expect(productSchema.safeParse({ ...validProduct, sellingPrice: -1 }).success).toBe(false);
  });

  it('rejects taxRate > 100', () => {
    expect(productSchema.safeParse({ ...validProduct, taxRate: 101 }).success).toBe(false);
  });

  it('rejects discountRate > 100', () => {
    expect(productSchema.safeParse({ ...validProduct, discountRate: 101 }).success).toBe(false);
  });

  it('defaults unit to pcs', () => {
    const result = productSchema.parse(validProduct);
    expect(result.unit).toBe('pcs');
  });

  it('defaults isActive to true', () => {
    const result = productSchema.parse(validProduct);
    expect(result.isActive).toBe(true);
  });

  it('defaults allowNegative to false', () => {
    const result = productSchema.parse(validProduct);
    expect(result.allowNegative).toBe(false);
  });

  it('accepts optional categoryId', () => {
    const result = productSchema.safeParse({ ...validProduct, categoryId: 'cat-1' });
    expect(result.success).toBe(true);
  });

  it('accepts empty string for image (upload URL not yet set)', () => {
    const result = productSchema.safeParse({ ...validProduct, image: '' });
    expect(result.success).toBe(true);
  });
});
