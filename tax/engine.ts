import Decimal from 'decimal.js';
import {
  Numeric,
  SupplyType,
  TaxInvoiceInput,
  TaxInvoiceResult,
  TaxLineInput,
  TaxLineResult,
} from './types';

const ZERO = new Decimal(0);
const HUNDRED = new Decimal(100);

/** The GST rate slabs in force, including the 0.25% slab for precious stones. */
export const GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28] as const;

function dec(value: Numeric | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return ZERO;
  return value instanceof Decimal ? value : new Decimal(value);
}

/**
 * Rounds to paise. ROUND_HALF_UP is symmetric about zero, so credit notes and
 * other negative amounts round by the same magnitude as the sale they reverse.
 */
function money(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Returns true when IGST applies rather than CGST + SGST.
 *
 * A buyer with no recorded state code is not treated as a mismatch: for an
 * unregistered recipient the place of supply is the supplier's location, so the
 * sale is intra-state. Comparing against an empty string would charge IGST on
 * every walk-in sale.
 */
export function isInterState(
  sellerStateCode: string,
  buyerStateCode?: string | null,
): boolean {
  const seller = (sellerStateCode ?? '').trim();
  const buyer = (buyerStateCode ?? '').trim();
  if (!buyer) return false;
  return seller !== buyer;
}

/**
 * Resolves supply type based on buyer registration and context.
 */
export function resolveSupplyType(
  buyerGstin: string | null | undefined,
  isExport: boolean,
  isSEZ: boolean,
): SupplyType {
  if (isExport) return 'EXPORT';
  if (isSEZ) return 'SEZ';
  if (buyerGstin && buyerGstin.trim().length === 15) return 'B2B';
  return 'B2C';
}

/**
 * Computes GST for a single line.
 *
 * - Inter-state: the whole rate goes to IGST.
 * - Intra-state: the rate splits into CGST + SGST.
 * - Zero-rated (export/SEZ under LUT): no GST and no cess.
 */
export function computeLine(
  line: TaxLineInput,
  interState: boolean,
  zeroRated = false,
): TaxLineResult {
  const quantity = dec(line.quantity);
  const unitPrice = dec(line.unitPrice);
  const discountAmount = dec(line.discountAmount);
  const declaredRate = dec(line.taxRatePercent);
  const cessRatePercent = dec(line.cessRatePercent);

  const taxableAmount = money(quantity.times(unitPrice).minus(discountAmount));
  const rate = zeroRated ? ZERO : declaredRate;

  let cgstRate = ZERO;
  let cgstAmount = ZERO;
  let sgstRate = ZERO;
  let sgstAmount = ZERO;
  let igstRate = ZERO;
  let igstAmount = ZERO;

  // Round the combined tax once, then divide. Rounding each half separately
  // overstates odd rates — 0.25% split that way yields 0.13 + 0.13 = 0.26%.
  const totalGst = money(taxableAmount.times(rate).div(HUNDRED));

  if (interState) {
    igstRate = rate;
    igstAmount = totalGst;
  } else {
    cgstRate = rate.div(2);
    sgstRate = rate.div(2);
    // When the total does not halve evenly, CGST takes the lower half and SGST
    // absorbs the odd paisa, so the two always sum back to the total exactly.
    // ROUND_DOWN truncates toward zero, keeping credit notes symmetric.
    cgstAmount = totalGst.div(2).toDecimalPlaces(2, Decimal.ROUND_DOWN);
    sgstAmount = totalGst.minus(cgstAmount);
  }

  const cessAmount = zeroRated
    ? ZERO
    : money(taxableAmount.times(cessRatePercent).div(HUNDRED));

  const totalTax = cgstAmount.plus(sgstAmount).plus(igstAmount).plus(cessAmount);
  const lineTotal = taxableAmount.plus(totalTax);

  return {
    productId: line.productId,
    hsnCode: line.hsnCode,
    sacCode: line.sacCode,
    isReverseCharge: line.isReverseCharge ?? false,
    quantity,
    unitPrice,
    discountAmount,
    taxRatePercent: declaredRate,
    cessRatePercent,
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
 * Computes GST across every line and returns the invoice-level summary.
 *
 * Totals are sums of already-rounded line values, so the breakup on the invoice
 * always reconciles with the sum of its lines — which is what the GSTR returns
 * are checked against.
 */
export function computeInvoice(input: TaxInvoiceInput): TaxInvoiceResult {
  const supplyType = resolveSupplyType(
    input.buyerGstin,
    input.isExport ?? false,
    input.isSEZ ?? false,
  );

  // Exports and SEZ supplies sit under the IGST head regardless of state, and
  // are zero-rated unless the supplier opts to pay IGST and reclaim it.
  const isCrossBorder = supplyType === 'EXPORT' || supplyType === 'SEZ';
  const interState = isCrossBorder
    ? true
    : isInterState(input.sellerStateCode, input.buyerStateCode);
  const isZeroRated = isCrossBorder && !input.withPaymentOfTax;

  const lines = input.lines.map((line) =>
    computeLine(line, interState, isZeroRated),
  );

  const sum = (pick: (line: TaxLineResult) => Decimal): Decimal =>
    lines.reduce((acc, line) => acc.plus(pick(line)), ZERO);

  const subtotal = money(sum((l) => l.quantity.times(l.unitPrice)));
  const totalDiscount = money(sum((l) => l.discountAmount));
  const totalTaxable = sum((l) => l.taxableAmount);
  const totalCgst = sum((l) => l.cgstAmount);
  const totalSgst = sum((l) => l.sgstAmount);
  const totalIgst = sum((l) => l.igstAmount);
  const totalCess = sum((l) => l.cessAmount);
  const totalTax = totalCgst.plus(totalSgst).plus(totalIgst).plus(totalCess);

  const grandTotal = totalTaxable.plus(totalTax);
  const roundedGrandTotal = grandTotal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const roundOff = roundedGrandTotal.minus(grandTotal);

  return {
    lines,
    subtotal,
    totalDiscount,
    totalTaxable,
    totalCgst,
    totalSgst,
    totalIgst,
    totalCess,
    totalTax,
    grandTotal,
    roundOff,
    roundedGrandTotal,
    isInterState: interState,
    isZeroRated,
    supplyType,
  };
}

/**
 * Extracts the state code from a GSTIN (first 2 chars).
 */
export function stateCodeFromGstin(gstin: string): string {
  return gstin.slice(0, 2);
}

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// State codes run 01–38; 00 and 39+ are not allocated.
const GSTIN_PATTERN =
  /^(0[1-9]|[12][0-9]|3[0-8])[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/**
 * Validates a GSTIN's format, state code, and check digit.
 *
 * The check digit is a weighted modulo-36 sum over the first 14 characters,
 * which catches transposed and mistyped digits that a format check alone lets
 * through.
 */
export function validateGstin(gstin: string): boolean {
  const value = (gstin ?? '').trim().toUpperCase();
  if (!GSTIN_PATTERN.test(value)) return false;

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const codePoint = GSTIN_CHARSET.indexOf(value[i]);
    if (codePoint < 0) return false;
    const factor = i % 2 === 0 ? 1 : 2;
    const product = codePoint * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }

  const expected = GSTIN_CHARSET[(36 - (sum % 36)) % 36];
  return value[14] === expected;
}

/**
 * Converts a computed invoice to plain numbers for transport over tRPC.
 * Use at API boundaries only — persist the Decimal values, not these.
 */
export function toPlainNumbers(result: TaxInvoiceResult) {
  const n = (value: Decimal) => value.toNumber();
  return {
    ...result,
    lines: result.lines.map((line) => ({
      ...line,
      quantity: n(line.quantity),
      unitPrice: n(line.unitPrice),
      discountAmount: n(line.discountAmount),
      taxRatePercent: n(line.taxRatePercent),
      cessRatePercent: n(line.cessRatePercent),
      taxableAmount: n(line.taxableAmount),
      cgstRate: n(line.cgstRate),
      cgstAmount: n(line.cgstAmount),
      sgstRate: n(line.sgstRate),
      sgstAmount: n(line.sgstAmount),
      igstRate: n(line.igstRate),
      igstAmount: n(line.igstAmount),
      cessAmount: n(line.cessAmount),
      totalTax: n(line.totalTax),
      lineTotal: n(line.lineTotal),
    })),
    subtotal: n(result.subtotal),
    totalDiscount: n(result.totalDiscount),
    totalTaxable: n(result.totalTaxable),
    totalCgst: n(result.totalCgst),
    totalSgst: n(result.totalSgst),
    totalIgst: n(result.totalIgst),
    totalCess: n(result.totalCess),
    totalTax: n(result.totalTax),
    grandTotal: n(result.grandTotal),
    roundOff: n(result.roundOff),
    roundedGrandTotal: n(result.roundedGrandTotal),
  };
}
