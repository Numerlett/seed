'use client';

import { clientTrpc } from '@seed/api/client';
import { useBusiness } from '@/providers/BusinessProvider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WarehouseSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  includeAll?: boolean;
}

export function WarehouseSelector({
  value,
  onValueChange,
  placeholder = 'Select warehouse',
  disabled = false,
  className = 'w-50',
  includeAll = false,
}: WarehouseSelectorProps) {
  const { activeBusiness } = useBusiness();

  const { data: warehouses } = clientTrpc.warehouse.getWarehouses.useQuery(
    { businessId: activeBusiness?.id || '', isActive: true },
    { enabled: !!activeBusiness?.id },
  );

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">All Warehouses</SelectItem>}
        {warehouses?.map((wh) => (
          <SelectItem key={wh.id} value={wh.id}>
            {wh.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
