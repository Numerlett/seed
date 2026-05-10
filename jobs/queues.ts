import { Queue } from 'bullmq';
import { getRedis } from './lib/redis';

type Queues = {
  email: Queue;
  sms: Queue;
  whatsapp: Queue;
  pdf: Queue;
  einvoice: Queue;
  report: Queue;
  recurringInvoice: Queue;
  stockAlert: Queue;
  paymentReminder: Queue;
};

let _queues: Queues | undefined;

function buildQueues(): Queues {
  const connection = getRedis();
  return {
    email: new Queue('email', { connection }),
    sms: new Queue('sms', { connection }),
    whatsapp: new Queue('whatsapp', { connection }),
    pdf: new Queue('pdf', { connection }),
    einvoice: new Queue('einvoice', { connection }),
    report: new Queue('report', { connection }),
    recurringInvoice: new Queue('recurring-invoice', { connection }),
    stockAlert: new Queue('stock-alert', { connection }),
    paymentReminder: new Queue('payment-reminder', { connection }),
  };
}

export function getQueues(): Queues {
  if (!_queues) _queues = buildQueues();
  return _queues;
}

export const getEmailQueue = () => getQueues().email;
export const getSmsQueue = () => getQueues().sms;
export const getWhatsappQueue = () => getQueues().whatsapp;
export const getPdfQueue = () => getQueues().pdf;
export const getEinvoiceQueue = () => getQueues().einvoice;
export const getReportQueue = () => getQueues().report;
export const getRecurringInvoiceQueue = () => getQueues().recurringInvoice;
export const getStockAlertQueue = () => getQueues().stockAlert;
export const getPaymentReminderQueue = () => getQueues().paymentReminder;

export const getAllQueues = (): Queue[] => Object.values(getQueues());
