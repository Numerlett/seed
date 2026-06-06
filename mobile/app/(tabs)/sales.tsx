import { useRouter } from 'expo-router';
import { Receipt } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { ListScreen } from '../../components/ListScreen';
import { Badge, ListRow, statusTone } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

export default function SalesListScreen() {
  const router = useRouter();
  const { businessId } = useBusiness();
  const [search, setSearch] = useState('');

  const query = trpc.sales.getSaleInvoices.useQuery(
    { businessId: businessId ?? '', search: search || undefined, pageSize: 50 },
    { enabled: !!businessId },
  );

  const invoices = query.data?.data ?? [];

  return (
    <ListScreen
      data={invoices}
      keyExtractor={(i) => i.id}
      loading={query.isLoading}
      refetching={query.isRefetching}
      onRefresh={() => query.refetch()}
      errorMessage={query.isError ? 'Could not load invoices' : undefined}
      onRetry={() => query.refetch()}
      search={{ value: search, onChange: setSearch, placeholder: 'Search invoices…' }}
      emptyTitle="No invoices yet"
      emptyDescription="Create your first sales invoice."
      emptyIcon={<Receipt size={26} color="#78716c" />}
      onAdd={() => router.push('/sales/new')}
      renderItem={(i) => (
        <ListRow
          title={i.documentNumber}
          subtitle={`${i.customer?.name ?? 'Customer'} · ${formatDate(i.invoiceDate)}`}
          onPress={() => router.push(`/sales/${i.id}`)}
          right={
            <View className="items-end gap-1">
              <Text className="text-sm font-semibold text-foreground">
                {formatCurrency(i.grandTotal)}
              </Text>
              <Badge label={i.status} tone={statusTone(i.status)} />
            </View>
          }
        />
      )}
    />
  );
}
