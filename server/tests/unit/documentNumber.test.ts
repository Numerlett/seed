import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDocumentNumber, DOC_PREFIXES } from '../../helpers/documentNumber';

vi.mock('@seed/database', () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

import { prisma } from '@seed/database';

const mockPrisma = prisma as unknown as { $queryRawUnsafe: ReturnType<typeof vi.fn> };

describe('generateDocumentNumber', () => {
  beforeEach(() => {
    mockPrisma.$queryRawUnsafe.mockReset();
  });

  it('returns user-provided number unchanged', async () => {
    const result = await generateDocumentNumber('biz-1', DOC_PREFIXES.SALE_INVOICE, 'CUSTOM-001');
    expect(result).toBe('CUSTOM-001');
    expect(mockPrisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('generates INV-0001 when no existing records', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
    const result = await generateDocumentNumber('biz-1', DOC_PREFIXES.SALE_INVOICE);
    expect(result).toBe('INV-0001');
  });

  it('increments the sequence number from the last document', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ document_number: 'INV-0005' }]);
    const result = await generateDocumentNumber('biz-1', DOC_PREFIXES.SALE_INVOICE);
    expect(result).toBe('INV-0006');
  });

  it('pads sequence number to 4 digits', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ document_number: 'PO-0099' }]);
    const result = await generateDocumentNumber('biz-1', DOC_PREFIXES.PURCHASE_ORDER);
    expect(result).toBe('PO-0100');
  });

  it('uses correct prefix per document type', async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
    const grn = await generateDocumentNumber('biz-1', DOC_PREFIXES.GRN);
    expect(grn).toBe('GRN-0001');
  });
});
