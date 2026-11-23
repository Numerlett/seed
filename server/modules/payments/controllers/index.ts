import {
  prisma,
  Prisma,
  PaymentType,
  PaymentMethod,
  PaymentTxStatus,
} from '@seed/database';
import { TRPCError } from '@trpc/server';
import { paymentMadePosting, paymentReceivedPosting } from '@seed/accounting';
import {
  ensureChartOfAccounts,
  postJournalEntry,
} from '../../../lib/accounting/post';
import {
  DOC_PREFIXES,
  withDocumentNumber,
} from '../../../helpers/documentNumber';
import { createPaymentLink } from '../../../lib/dispatch';

export async function getBankAccounts(businessId: string) {
  return prisma.bankAccount.findMany({
    where: { businessId, isActive: true },
    orderBy: { accountName: 'asc' },
  });
}

export async function createBankAccount(
  businessId: string,
  input: {
    accountName: string;
    accountNo: string;
    ifsc: string;
    bankName: string;
    branch?: string;
    openingBalance?: number;
  },
) {
  return prisma.bankAccount.create({
    data: {
      businessId,
      accountName: input.accountName,
      accountNo: input.accountNo,
      ifsc: input.ifsc,
      bankName: input.bankName,
      branch: input.branch,
      openingBalance: input.openingBalance ?? 0,
      currentBalance: input.openingBalance ?? 0,
    },
  });
}

export async function getPayments(
  businessId: string,
  input: { page: number; limit: number; type?: string; partyId?: string },
) {
  const skip = (input.page - 1) * input.limit;
  const where = {
    businessId,
    ...(input.type ? { type: input.type as PaymentType } : {}),
    ...(input.partyId ? { partyId: input.partyId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { date: 'desc' },
      include: {
        party: { select: { name: true } },
        bankAccount: { select: { accountName: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return { items, total, page: input.page };
}

export async function recordPayment(
  businessId: string,
  input: {
    date: Date;
    type: 'RECEIVED' | 'MADE';
    amount: number | string | Prisma.Decimal;
    method: string;
    partyId?: string;
    bankAccountId?: string;
    reference?: string;
    notes?: string;
    allocations?: Array<{
      invoiceId?: string;
      billId?: string;
      amount: number | string | Prisma.Decimal;
    }>;
  },
) {
  const amount = new Prisma.Decimal(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'A payment must be for a positive amount.',
    });
  }

  const allocations = (input.allocations ?? []).map((allocation) => ({
    ...allocation,
    amount: new Prisma.Decimal(allocation.amount),
  }));

  // Over-allocating would mark more invoices settled than money received.
  const allocated = allocations.reduce(
    (sum, allocation) => sum.plus(allocation.amount),
    new Prisma.Decimal(0),
  );
  if (allocated.greaterThan(amount)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Allocations total ${allocated.toFixed(2)}, which is more than the payment of ${amount.toFixed(2)}.`,
    });
  }

  if (allocations.length > 0 && !input.partyId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Allocating a payment to invoices requires a party.',
    });
  }

  const prefix =
    input.type === 'RECEIVED'
      ? DOC_PREFIXES.PAYMENT_RECEIVED
      : DOC_PREFIXES.PAYMENT_MADE;

  // The whole transaction sits inside the retry: if another receipt claims
  // this number first, the transaction rolls back and the next attempt takes
  // a fresh one, rather than the user losing a recorded payment to a conflict.
  return withDocumentNumber(businessId, prefix, undefined, (documentNumber) =>
    prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          businessId,
          documentNumber,
          date: input.date,
          type: input.type as PaymentType,
          amount: amount.toFixed(2),
          method: input.method as PaymentMethod,
          partyId: input.partyId,
          bankAccountId: input.bankAccountId,
          reference: input.reference,
          notes: input.notes,
          status: 'CLEARED' as PaymentTxStatus,
        },
      });

      if (allocations.length > 0) {
        await tx.paymentAllocation.createMany({
          data: allocations.map((allocation) => ({
            paymentId: payment.id,
            invoiceId: allocation.invoiceId,
            billId: allocation.billId,
            amount: allocation.amount.toFixed(2),
          })),
        });

        await applyAllocations(tx, businessId, input.type, allocations);
      }

      if (input.bankAccountId) {
        const delta =
          input.type === 'RECEIVED'
            ? amount.toFixed(2)
            : amount.negated().toFixed(2);
        await tx.bankAccount.update({
          where: { id: input.bankAccountId },
          data: { currentBalance: { increment: delta } },
        });
      }

      // Money moving is a bookkeeping event. Without this the trial balance shows
      // receivables that were collected weeks ago and a bank balance that never
      // moves — every other document type already posts, payments did not.
      if (input.partyId) {
        await ensureChartOfAccounts(tx, businessId);
        const lines =
          input.type === 'RECEIVED'
            ? paymentReceivedPosting({
                partyId: input.partyId,
                amount: amount.toFixed(2),
              })
            : paymentMadePosting({
                partyId: input.partyId,
                amount: amount.toFixed(2),
              });

        await postJournalEntry(tx, {
          businessId,
          source:
            input.type === 'RECEIVED' ? 'PAYMENT_RECEIVED' : 'PAYMENT_MADE',
          sourceId: payment.id,
          date: input.date,
          narration: `${documentNumber} — ${input.method}${input.reference ? ` (${input.reference})` : ''}`,
          lines,
        });
      }

      return payment;
    }),
  );
}

/**
 * Settles the documents a payment was allocated to.
 *
 * `amountPaid`, `amountDue` and `paymentStatus` on a sale invoice were never
 * written by any code path: recording a receipt left the invoice showing the
 * full amount outstanding, and the only way to mark it paid was to edit the
 * status by hand. Allocation now drives the invoice's own figures.
 */
async function applyAllocations(
  tx: Prisma.TransactionClient,
  businessId: string,
  type: 'RECEIVED' | 'MADE',
  allocations: Array<{
    invoiceId?: string;
    billId?: string;
    amount: Prisma.Decimal;
  }>,
) {
  for (const allocation of allocations) {
    if (type === 'RECEIVED' && allocation.invoiceId) {
      const invoice = await tx.saleInvoice.findFirst({
        where: { id: allocation.invoiceId, businessId },
        select: { id: true, grandTotal: true },
      });
      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Invoice ${allocation.invoiceId} does not belong to this business.`,
        });
      }

      // Summed from the allocations rather than incremented onto the stored
      // figure. `amountPaid` was never maintained, so an invoice that already
      // had allocations still reads 0 — deriving the total repairs those rows
      // the first time a payment touches them instead of compounding the gap.
      const settled = await tx.paymentAllocation.aggregate({
        where: { invoiceId: invoice.id },
        _sum: { amount: true },
      });
      const paid = settled._sum.amount ?? new Prisma.Decimal(0);
      const due = invoice.grandTotal.minus(paid);

      await tx.saleInvoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: paid.toFixed(2),
          // An overpayment leaves nothing due rather than a negative balance.
          amountDue: (due.isNegative() ? new Prisma.Decimal(0) : due).toFixed(
            2,
          ),
          paymentStatus: due.lessThanOrEqualTo(0)
            ? 'PAID'
            : paid.greaterThan(0)
              ? 'PARTIAL'
              : 'UNPAID',
        },
      });
      continue;
    }

    if (type === 'MADE' && allocation.billId) {
      const order = await tx.purchaseOrder.findFirst({
        where: { id: allocation.billId, businessId },
        select: { id: true, grandTotal: true },
      });
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Bill ${allocation.billId} does not belong to this business.`,
        });
      }

      // PurchaseOrder tracks no paid-to-date column, so settlement is derived
      // from every allocation raised against it.
      const settled = await tx.paymentAllocation.aggregate({
        where: { billId: order.id },
        _sum: { amount: true },
      });
      const paid = settled._sum.amount ?? new Prisma.Decimal(0);

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: paid.greaterThanOrEqualTo(order.grandTotal)
            ? 'PAID'
            : paid.greaterThan(0)
              ? 'PARTIAL'
              : 'UNPAID',
        },
      });
    }
  }
}

export async function getCheques(
  businessId: string,
  input: { page: number; limit: number },
) {
  const skip = (input.page - 1) * input.limit;
  const [items, total] = await Promise.all([
    prisma.cheque.findMany({
      where: { businessId },
      skip,
      take: input.limit,
      orderBy: { dueDate: 'asc' },
    }),
    prisma.cheque.count({ where: { businessId } }),
  ]);
  return { items, total };
}

export async function getBankTransactions(
  businessId: string,
  bankAccountId: string,
  input: { page: number; limit: number; reconciled?: boolean },
) {
  const skip = (input.page - 1) * input.limit;
  const where = {
    bankAccountId,
    bankAccount: { businessId },
    ...(input.reconciled !== undefined ? { reconciled: input.reconciled } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.bankTransaction.findMany({
      where,
      skip,
      take: input.limit,
      orderBy: { date: 'desc' },
    }),
    prisma.bankTransaction.count({ where }),
  ]);
  return { items, total };
}

// ---------- Hosted payment links ----------

/**
 * Raises a hosted payment link for an unpaid sale invoice.
 *
 * The link is recorded before it is handed out, so the webhook that reports it
 * paid has something to match against. Nothing is posted to the books here —
 * a link is an invitation to pay, not a payment. The money is recorded when
 * the provider confirms it.
 */
export async function createInvoicePaymentLink(
  businessId: string,
  invoiceId: string,
) {
  const invoice = await prisma.saleInvoice.findFirst({
    where: { id: invoiceId, businessId },
    include: { customer: true },
  });

  if (!invoice) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
  }
  if (invoice.status !== 'CONFIRMED') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Only a confirmed invoice can be collected against.',
    });
  }
  if (invoice.paymentStatus === 'PAID') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This invoice is already paid.',
    });
  }

  const existing = await prisma.paymentLink.findFirst({
    where: { invoiceId, status: 'CREATED' },
  });
  if (existing) return existing;

  // What is still owed, not the invoice total — a partly settled invoice must
  // not ask the customer for the whole amount again.
  const settled = await prisma.paymentAllocation.aggregate({
    where: { invoiceId },
    _sum: { amount: true },
  });
  const outstanding = invoice.grandTotal.minus(
    settled._sum.amount ?? new Prisma.Decimal(0),
  );
  if (outstanding.lessThanOrEqualTo(0)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This invoice has nothing outstanding.',
    });
  }

  const link = await createPaymentLink({
    // Razorpay works in paise; rounding here keeps the request an integer.
    amount: Number(outstanding.times(100).toFixed(0)),
    description: `Invoice ${invoice.documentNumber}`,
    customerName: invoice.customer.name,
    customerEmail: invoice.customer.email ?? undefined,
    customerPhone: invoice.customer.phone ?? undefined,
    referenceId: invoice.id,
  });

  return prisma.paymentLink.create({
    data: {
      businessId,
      invoiceId,
      provider: 'RAZORPAY',
      providerLinkId: link.id,
      shortUrl: link.short_url,
      amount: outstanding.toFixed(2),
      status: 'CREATED',
    },
  });
}

export async function getInvoicePaymentLinks(
  businessId: string,
  invoiceId: string,
) {
  return prisma.paymentLink.findMany({
    where: { businessId, invoiceId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Records a payment link the provider has reported as paid.
 *
 * Called from the webhook, which is unauthenticated and retried by the
 * provider, so this has to be safe to run repeatedly: `providerPaymentId` is
 * unique, and a link already marked PAID is left alone. Returns whether it did
 * anything, so the caller can log a replay distinctly from a first delivery.
 */
export async function settlePaymentLink(input: {
  providerLinkId: string;
  providerPaymentId: string;
  method?: string;
  paidAt: Date;
}): Promise<{ applied: boolean; reason?: string }> {
  const link = await prisma.paymentLink.findUnique({
    where: { providerLinkId: input.providerLinkId },
    include: { invoice: { select: { id: true, customerId: true } } },
  });

  if (!link) return { applied: false, reason: 'unknown link' };
  if (link.status === 'PAID')
    return { applied: false, reason: 'already settled' };

  const alreadyRecorded = await prisma.paymentLink.findFirst({
    where: { providerPaymentId: input.providerPaymentId },
  });
  if (alreadyRecorded)
    return { applied: false, reason: 'duplicate payment id' };

  const payment = await recordPayment(link.businessId, {
    date: input.paidAt,
    type: 'RECEIVED',
    amount: link.amount,
    method: mapProviderMethod(input.method),
    partyId: link.invoice.customerId,
    reference: input.providerPaymentId,
    notes: `Collected online via ${link.provider}`,
    allocations: [{ invoiceId: link.invoiceId, amount: link.amount }],
  });

  await prisma.paymentLink.update({
    where: { id: link.id },
    data: {
      status: 'PAID',
      providerPaymentId: input.providerPaymentId,
      paidAt: input.paidAt,
      paymentId: payment.id,
    },
  });

  return { applied: true };
}

/** Razorpay's method names onto the PaymentMethod enum. */
function mapProviderMethod(method?: string): string {
  switch (method) {
    case 'upi':
      return 'UPI';
    case 'card':
      return 'CARD';
    case 'netbanking':
      return 'BANK_TRANSFER';
    case 'wallet':
      return 'WALLET';
    default:
      return 'OTHER';
  }
}
