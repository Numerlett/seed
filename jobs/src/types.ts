export type EmailJobData = {
  to: string;
  subject: string;
  templateKey: string;
  variables: Record<string, unknown>;
  businessId?: string;
};

export type SmsJobData = {
  to: string;
  message: string;
  businessId?: string;
};

export type WhatsAppJobData = {
  to: string;
  templateKey: string;
  variables: Record<string, unknown>;
  businessId?: string;
};

export type PdfJobData = {
  type: 'invoice' | 'grn' | 'purchase-order' | 'credit-note' | 'debit-note' | 'delivery-challan' | 'statement' | 'report';
  referenceId: string;
  businessId: string;
  userId?: string;
};

export type EinvoiceJobData = {
  invoiceId: string;
  businessId: string;
  action: 'generate' | 'cancel';
  cancelReason?: string;
};

export type StockAlertJobData = {
  productId: string;
  businessId: string;
  currentQty: number;
  reorderLevel: number;
  warehouseId?: string;
};

export type PaymentReminderJobData = {
  invoiceId: string;
  businessId: string;
  partyId: string;
  channel: 'email' | 'sms' | 'whatsapp';
  daysOverdue: number;
};
