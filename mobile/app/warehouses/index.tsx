import { Stack, useRouter } from 'expo-router';
import { Warehouse } from 'lucide-react-native';
import React, { useState } from 'react';

import { ListScreen } from '../../components/ListScreen';
import { Badge, ListRow } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { useBusiness } from '../../providers/BusinessProvider';

export default function WarehousesListScreen() {
  const router = useRouter();
  const { businessId } = useBusiness();
  const [search, setSearch] = useState('');

  const query = trpc.warehouse.getWarehouses.useQuery(
    { businessId: businessId ?? '', search: search || undefined },
    { enabled: !!businessId },
  );

  const warehouses = query.data ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Warehouses' }} />
      <ListScreen
        data={warehouses}
        keyExtractor={(w) => w.id}
        loading={query.isLoading}
        refetching={query.isRefetching}
        onRefresh={() => query.refetch()}
        errorMessage={query.isError ? 'Could not load warehouses' : undefined}
        onRetry={() => query.refetch()}
        search={{ value: search, onChange: setSearch, placeholder: 'Search warehouses…' }}
        emptyTitle="No warehouses yet"
        emptyDescription="Create a warehouse to organise stock by location."
        emptyIcon={<Warehouse size={26} color="#78716c" />}
        onAdd={() => router.push('/warehouses/new')}
        renderItem={(w) => (
          <ListRow
            title={w.name}
            subtitle={w.location || 'No location'}
            onPress={() => router.push(`/warehouses/${w.id}`)}
            right={
              <Badge
                label={w.isActive ? 'Active' : 'Inactive'}
                tone={w.isActive ? 'success' : 'neutral'}
              />
            }
          />
        )}
      />
    </>
  );
}
