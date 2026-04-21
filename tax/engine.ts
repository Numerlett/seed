import { TaxLineInput, TaxLineResult, TaxInvoiceResult, SupplyType } from './types';

/**
 * Returns true if the transaction is inter-state (IGST applies).
 * Compares seller state code vs buyer state code (first 2 chars of GSTIN or explicit stateCode).
 */
export function isInterState(sellerStateCode: string, buyerStateCode: string): boolean {
  return sellerStateCode.trim() !== buyerStateCode.trim();
}

/**
 * Resolves supply type based on buyer registration and context.
 */
export function resolveSupplyType(
  buyerGstin: string | undefined,
  isExport: boolean,
  isSEZ: boolean,
): SupplyType {
  if (isExport) return 'EXPORT';
  if (isSEZ) return 'SEZ';
  if (buyerGstin && buyerGstin.length === 15) return 'B2B';
  return 'B2C';
}

/**
 * Rounds to 2 decimal places (banker's rounding avoided; standard for GST).
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Computes GST for a single line item.
 * - If inter-state: full rate goes to IGST
 * - If intra-state: rate splits equally into CGST + SGST
 */
export function computeLine(line: TaxLineInput, interState: boolean): TaxLineResult {
  const lineValue = line.quantity * line.unitPrice;
  const discount = line.discountAmount ?? 0;
  const taxableAmount = round2(lineValue - discount);

  const totalTaxRate = line.taxRatePercent;
  const cessRate = line.cessRatePercent ?? 0;

  let cgstRate = 0, cgstAmount = 0;
  let sgstRate = 0, sgstAmount = 0;
  let igstRate = 0, igstAmount = 0;

  if (interState) {
    igstRate = totalTaxRate;
    igstAmount = round2((taxableAmount * igstRate) / 100);
  } else {
    cgstRate = round2(totalTaxRate / 2);
    sgstRate = round2(totalTaxRate / 2);
    cgstAmount = round2((taxableAmount * cgstRate) / 100);
    sgstAmount = round2((taxableAmount * sgstRate) / 100);
  }

  const cessAmount = round2((taxableAmount * cessRate) / 100);
  const totalTax = round2(cgstAmount + sgstAmount + igstAmount + cessAmount);
  const lineTotal = round2(taxableAmount + totalTax);

  return {
    ...line,
    taxableAmount,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    cessAmount,
    totalTax,
    lineTotal,
  };
}

/**
 * Computes GST for all invoice lines and returns full invoice tax summary.
 */
export function computeInvoice(
  lines: TaxLineInput[],
  sellerStateCode: string,
  buyerStateCode: string,
  buyerGstin?: string,
  isExport = false,
  isSEZ = false,
): TaxInvoiceResult {
  const interState = isInterState(sellerStateCode, buyerStateCode);
  const supplyType = resolveSupplyType(buyerGstin, isExport, isSEZ);

  const computedLines = lines.map((l) => computeLine(l, interState));

  const subtotal = round2(computedLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0));
  const totalDiscount = round2(computedLines.reduce((s, l) => s + (l.discountAmount ?? 0), 0));
  const totalTaxable = round2(computedLines.reduce((s, l) => s + l.taxableAmount, 0));
  const totalCgst = round2(computedLines.reduce((s, l) => s + l.cgstAmount, 0));
  const totalSgst = round2(computedLines.reduce((s, l) => s + l.sgstAmount, 0));
  const totalIgst = round2(computedLines.reduce((s, l) => s + l.igstAmount, 0));
  const totalCess = round2(computedLines.reduce((s, l) => s + l.cessAmount, 0));
  const totalTax = round2(totalCgst + totalSgst + totalIgst + totalCess);
  const grandTotal = round2(totalTaxable + totalTax);

  return {
    lines: computedLines,
    subtotal,
    totalDiscount,
    totalTaxable,
    totalCgst,
    totalSgst,
    totalIgst,
    totalCess,
    totalTax,
    grandTotal,
    isInterState: interState,
    supplyType,
  };
}

/**
 * Extracts the state code from a GSTIN (first 2 chars).
 */
export function stateCodeFromGstin(gstin: string): string {
  return gstin.slice(0, 2);
}

/**
 * Validates a GSTIN format (15-char alphanumeric, known pattern).
 */
export function validateGstin(gstin: string): boolean {
  const gstinPattern = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinPattern.test(gstin.toUpperCase());
}
