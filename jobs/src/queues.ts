import { Queue } from 'bullmq';
import { redis } from './redis';

const connection = redis;

export const emailQueue = new Queue('email', { connection });
export const smsQueue = new Queue('sms', { connection });
export const whatsappQueue = new Queue('whatsapp', { connection });
export const pdfQueue = new Queue('pdf', { connection });
export const einvoiceQueue = new Queue('einvoice', { connection });
export const reportQueue = new Queue('report', { connection });
export const recurringInvoiceQueue = new Queue('recurring-invoice', {
  connection,
});
export const stockAlertQueue = new Queue('stock-alert', { connection });
export const paymentReminderQueue = new Queue('payment-reminder', {
  connection,
});

export const allQueues = [
  emailQueue,
  smsQueue,
  whatsappQueue,
  pdfQueue,
  einvoiceQueue,
  reportQueue,
  recurringInvoiceQueue,
  stockAlertQueue,
  paymentReminderQueue,
];
