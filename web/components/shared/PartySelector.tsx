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

interface PartySelectorProps {
  partyType: 'SUPPLIER' | 'CUSTOMER';
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function PartySelector({
  partyType,
  value,
  onValueChange,
  disabled = false,
  className = 'w-full',
  placeholder,
}: PartySelectorProps) {
  const { activeBusiness } = useBusiness();

  const { data } = clientTrpc.party.getPartiesByBusinessId.useQuery(
    {
      businessId: activeBusiness?.id || '',
      pageSize: 200,
      pageNumber: 1,
      partyType,
    },
    { enabled: !!activeBusiness?.id },
  );

  const parties = data?.parties || [];
  const defaultPlaceholder =
    partyType === 'SUPPLIER' ? 'Select supplier' : 'Select customer';

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder || defaultPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {parties.map((party) => (
          <SelectItem key={party.id} value={party.id}>
            {party.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
