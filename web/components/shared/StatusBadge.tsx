'use client';

import { Badge } from '@/components/ui/badge';

type DocumentStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

const documentStatusConfig: Record<
  DocumentStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  CONFIRMED: { label: 'Confirmed', variant: 'default' },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' },
};

const paymentStatusConfig: Record<
  PaymentStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
  }
> = {
  UNPAID: { label: 'Unpaid', variant: 'destructive' },
  PARTIAL: { label: 'Partial', variant: 'secondary' },
  PAID: { label: 'Paid', variant: 'default' },
};

export function StatusBadge({ status }: { status: string }) {
  const config =
    documentStatusConfig[status as DocumentStatus] ??
    paymentStatusConfig[status as PaymentStatus];

  if (!config) {
    return <Badge variant="outline">{status}</Badge>;
  }

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
