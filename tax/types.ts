import type Decimal from 'decimal.js';

export type TaxRegime = 'GST' | 'VAT' | 'SALES_TAX';

export type GSTType = 'CGST' | 'SGST' | 'IGST' | 'CESS' | 'EXEMPT' | 'NIL';

export type SupplyType = 'B2B' | 'B2C' | 'EXPORT' | 'SEZ' | 'DEEMED_EXPORT';

export type PlaceOfSupply =
  | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
  | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20'
  | '21' | '22' | '23' | '24' | '25' | '26' | '27' | '28' | '29' | '30'
  | '31' | '32' | '33' | '34' | '35' | '36' | '37' | '38';

/**
 * Any value the engine can read as a number. Accepting strings and Decimals
 * means Prisma `Decimal` columns can be passed straight through without a
 * lossy trip via `Number()`.
 */
export type Numeric = number | string | Decimal;

export type TaxLineInput = {
  productId?: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: Numeric;
  unitPrice: Numeric;
  /** Absolute currency amount, not a percentage. */
  discountAmount?: Numeric;
  taxRatePercent: Numeric;
  cessRatePercent?: Numeric;
  isReverseCharge?: boolean;
};

export type TaxLineResult = {
  productId?: string;
  hsnCode?: string;
  sacCode?: string;
  isReverseCharge: boolean;
  quantity: Decimal;
  unitPrice: Decimal;
  discountAmount: Decimal;
  taxRatePercent: Decimal;
  cessRatePercent: Decimal;
  /** Value the tax is charged on: (quantity × unitPrice) − discount. */
  taxableAmount: Decimal;
  cgstRate: Decimal;
  cgstAmount: Decimal;
  sgstRate: Decimal;
  sgstAmount: Decimal;
  igstRate: Decimal;
  igstAmount: Decimal;
  cessAmount: Decimal;
  totalTax: Decimal;
  lineTotal: Decimal;
};

export type TaxInvoiceInput = {
  lines: TaxLineInput[];
  /** Two-digit state code of the supplier, from their GST registration. */
  sellerStateCode: string;
  /**
   * Two-digit state code of the recipient. Absent means the buyer has no
   * recorded state (a walk-in B2C sale), in which case place of supply falls
   * back to the supplier's location and the sale is treated as intra-state.
   */
  buyerStateCode?: string | null;
  buyerGstin?: string | null;
  isExport?: boolean;
  isSEZ?: boolean;
  /**
   * Export/SEZ supplied on payment of IGST (refund claimed later). Left false,
   * the supply is zero-rated, which is the LUT/bond route.
   */
  withPaymentOfTax?: boolean;
};

export type TaxInvoiceResult = {
  lines: TaxLineResult[];
  /** Sum of line values before discount. */
  subtotal: Decimal;
  totalDiscount: Decimal;
  totalTaxable: Decimal;
  totalCgst: Decimal;
  totalSgst: Decimal;
  totalIgst: Decimal;
  totalCess: Decimal;
  totalTax: Decimal;
  /** Taxable + tax, before the round-off adjustment. */
  grandTotal: Decimal;
  /** Adjustment carrying grandTotal to the nearest rupee, as GST invoices require. */
  roundOff: Decimal;
  /** What the customer actually pays: grandTotal + roundOff. */
  roundedGrandTotal: Decimal;
  isInterState: boolean;
  isZeroRated: boolean;
  supplyType: SupplyType;
};

export type GSTRegistration = {
  gstin: string;
  tradeName: string;
  legalName: string;
  stateCode: string;
  registrationType: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED';
};
