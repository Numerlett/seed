export type TaxRegime = 'GST' | 'VAT' | 'SALES_TAX';

export type GSTType = 'CGST' | 'SGST' | 'IGST' | 'CESS' | 'EXEMPT' | 'NIL';

export type SupplyType = 'B2B' | 'B2C' | 'EXPORT' | 'SEZ' | 'DEEMED_EXPORT';

export type PlaceOfSupply =
  | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
  | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20'
  | '21' | '22' | '23' | '24' | '25' | '26' | '27' | '28' | '29' | '30'
  | '31' | '32' | '33' | '34' | '35' | '36' | '37' | '38';

export type TaxLineInput = {
  productId?: string;
  hsnCode?: string;
  sacCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRatePercent: number;
  cessRatePercent?: number;
  isReverseCharge?: boolean;
};

export type TaxLineResult = TaxLineInput & {
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
  lineTotal: number;
};

export type TaxInvoiceResult = {
  lines: TaxLineResult[];
  subtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  grandTotal: number;
  isInterState: boolean;
  supplyType: SupplyType;
};

export type GSTRegistration = {
  gstin: string;
  tradeName: string;
  legalName: string;
  stateCode: string;
  registrationType: 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED';
};
