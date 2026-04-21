export type PdfAddress = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
};

export type PdfParty = {
  name: string;
  gstin?: string;
  phone?: string;
  email?: string;
  address?: PdfAddress;
};

export type PdfLineItem = {
  slNo: number;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
  taxableAmount: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  totalAmount: number;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  irn?: string;
  qrCodeDataUrl?: string;
  business: PdfParty & { logo?: string };
  customer: PdfParty;
  lineItems: PdfLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  totalCgst?: number;
  totalSgst?: number;
  totalIgst?: number;
  totalTax: number;
  grandTotal: number;
  amountInWords?: string;
  notes?: string;
  termsAndConditions?: string;
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch?: string;
  };
};
