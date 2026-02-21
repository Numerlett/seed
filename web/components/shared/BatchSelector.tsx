'use client';

import { clientTrpc } from '@seed/api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BatchSelectorProps {
  productId: string;
  businessId: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function BatchSelector({
  productId,
  businessId,
  value,
  onValueChange,
  disabled = false,
  className = 'w-50',
}: BatchSelectorProps) {
  const { data: batches } = clientTrpc.batch.getBatchesByProduct.useQuery(
    { businessId, productId },
    { enabled: !!productId && !!businessId },
  );

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled || !productId}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select batch" />
      </SelectTrigger>
      <SelectContent>
        {batches?.map((batch) => (
          <SelectItem key={batch.id} value={batch.id}>
            {batch.batchNumber}
            {batch.expiryDate
              ? ` (Exp: ${new Date(batch.expiryDate).toLocaleDateString()})`
              : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
