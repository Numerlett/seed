import { Stack, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { View } from 'react-native';

import { ListScreen } from '../../components/ListScreen';
import { Badge, ListRow, Segmented } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { useBusiness } from '../../providers/BusinessProvider';

type Filter = 'ALL' | 'CUSTOMER' | 'SUPPLIER';

export default function PartiesListScreen() {
  const router = useRouter();
  const { businessId } = useBusiness();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const query = trpc.party.getPartiesByBusinessId.useQuery(
    {
      businessId: businessId ?? '',
      search: search || undefined,
      partyType: filter === 'ALL' ? undefined : filter,
      pageSize: 100,
    },
    { enabled: !!businessId },
  );

  const parties = query.data?.parties ?? [];

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Parties' }} />
      <ListScreen
        data={parties}
        keyExtractor={(p) => p.id}
        loading={query.isLoading}
        refetching={query.isRefetching}
        onRefresh={() => query.refetch()}
        errorMessage={query.isError ? 'Could not load parties' : undefined}
        onRetry={() => query.refetch()}
        search={{ value: search, onChange: setSearch, placeholder: 'Search parties…' }}
        header={
          <Segmented
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            options={[
              { label: 'All', value: 'ALL' },
              { label: 'Customers', value: 'CUSTOMER' },
              { label: 'Suppliers', value: 'SUPPLIER' },
            ]}
          />
        }
        emptyTitle="No parties yet"
        emptyDescription="Add customers and suppliers to start transacting."
        emptyIcon={<Users size={26} color="#78716c" />}
        onAdd={() => router.push('/parties/new')}
        renderItem={(p) => (
          <ListRow
            title={p.name}
            subtitle={p.phone || p.email || 'No contact info'}
            onPress={() => router.push(`/parties/${p.id}`)}
            right={
              <View>
                <Badge
                  label={p.partyType === 'BOTH' ? 'Both' : p.partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'}
                  tone={p.partyType === 'SUPPLIER' ? 'warning' : 'info'}
                />
              </View>
            }
          />
        )}
      />
    </>
  );
}
