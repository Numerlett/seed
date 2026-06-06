import { useRouter } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { ListScreen } from '../../components/ListScreen';
import { Badge, ListRow, Segmented, statusTone } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

type Mode = 'PO' | 'GRN';

export default function PurchasesListScreen() {
  const router = useRouter();
  const { businessId } = useBusiness();
  const [mode, setMode] = useState<Mode>('PO');
  const [search, setSearch] = useState('');

  const poQuery = trpc.purchase.getPurchaseOrders.useQuery(
    { businessId: businessId ?? '', search: search || undefined, pageSize: 50 },
    { enabled: !!businessId && mode === 'PO' },
  );
  const grnQuery = trpc.purchase.getGRNs.useQuery(
    { businessId: businessId ?? '', search: search || undefined, pageSize: 50 },
    { enabled: !!businessId && mode === 'GRN' },
  );

  const segment = (
    <Segmented
      value={mode}
      onChange={(v) => setMode(v as Mode)}
      options={[
        { label: 'Orders', value: 'PO' },
        { label: 'Receipts (GRN)', value: 'GRN' },
      ]}
    />
  );

  if (mode === 'PO') {
    const orders = poQuery.data?.data ?? [];
    return (
      <ListScreen
        data={orders}
        keyExtractor={(o) => o.id}
        loading={poQuery.isLoading}
        refetching={poQuery.isRefetching}
        onRefresh={() => poQuery.refetch()}
        errorMessage={poQuery.isError ? 'Could not load orders' : undefined}
        onRetry={() => poQuery.refetch()}
        search={{ value: search, onChange: setSearch, placeholder: 'Search orders…' }}
        header={segment}
        emptyTitle="No purchase orders"
        emptyDescription="Create a purchase order for a supplier."
        emptyIcon={<ShoppingBag size={26} color="#78716c" />}
        onAdd={() => router.push('/purchases/new-order')}
        renderItem={(o) => (
          <ListRow
            title={o.documentNumber}
            subtitle={`${o.supplier?.name ?? 'Supplier'} · ${formatDate(o.orderDate)}`}
            onPress={() => router.push(`/purchases/${o.id}`)}
            right={
              <View className="items-end gap-1">
                <Text className="text-sm font-semibold text-foreground">
                  {formatCurrency(o.grandTotal)}
                </Text>
                <Badge label={o.status} tone={statusTone(o.status)} />
              </View>
            }
          />
        )}
      />
    );
  }

  const grns = grnQuery.data?.data ?? [];
  return (
    <ListScreen
      data={grns}
      keyExtractor={(g) => g.id}
      loading={grnQuery.isLoading}
      refetching={grnQuery.isRefetching}
      onRefresh={() => grnQuery.refetch()}
      errorMessage={grnQuery.isError ? 'Could not load receipts' : undefined}
      onRetry={() => grnQuery.refetch()}
      search={{ value: search, onChange: setSearch, placeholder: 'Search receipts…' }}
      header={segment}
      emptyTitle="No goods receipts"
      emptyDescription="Receive stock against a supplier or purchase order."
      emptyIcon={<ShoppingBag size={26} color="#78716c" />}
      onAdd={() => router.push('/purchases/new-grn')}
      renderItem={(g) => (
        <ListRow
          title={g.documentNumber}
          subtitle={`${g.supplier?.name ?? 'Supplier'} · ${formatDate(g.receivedDate)}`}
          onPress={() => router.push(`/purchases/grn/${g.id}`)}
          right={<Badge label={g.status} tone={statusTone(g.status)} />}
        />
      )}
    />
  );
}
