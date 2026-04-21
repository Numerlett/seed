import { prisma, PaymentType, PaymentMethod, PaymentTxStatus } from '@seed/database';
import { TRPCError } from '@trpc/server';

async function nextPaymentNumber(businessId: string, prefix: string): Promise<string> {
  const count = await prisma.payment.count({ where: { businessId, type: prefix === 'RCP' ? 'RECEIVED' : 'MADE' } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

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
    amount: number;
    method: string;
    partyId?: string;
    bankAccountId?: string;
    reference?: string;
    notes?: string;
    allocations?: Array<{ invoiceId?: string; billId?: string; amount: number }>;
  },
) {
  const documentNumber = await nextPaymentNumber(businessId, input.type === 'RECEIVED' ? 'RCP' : 'PAY');

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        businessId,
        documentNumber,
        date: input.date,
        type: input.type as PaymentType,
        amount: input.amount,
        method: input.method as PaymentMethod,
        partyId: input.partyId,
        bankAccountId: input.bankAccountId,
        reference: input.reference,
        notes: input.notes,
        status: 'CLEARED' as PaymentTxStatus,
      },
    });

    if (input.allocations?.length) {
      await tx.paymentAllocation.createMany({
        data: input.allocations.map((a) => ({
          paymentId: payment.id,
          invoiceId: a.invoiceId,
          billId: a.billId,
          amount: a.amount,
        })),
      });
    }

    if (input.bankAccountId) {
      const delta = input.type === 'RECEIVED' ? input.amount : -input.amount;
      await tx.bankAccount.update({
        where: { id: input.bankAccountId },
        data: { currentBalance: { increment: delta } },
      });
    }

    return payment;
  });
}

export async function getCheques(businessId: string, input: { page: number; limit: number }) {
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
    prisma.bankTransaction.findMany({ where, skip, take: input.limit, orderBy: { date: 'desc' } }),
    prisma.bankTransaction.count({ where }),
  ]);
  return { items, total };
}
