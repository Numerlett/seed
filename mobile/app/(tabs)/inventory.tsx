import { useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { ListScreen } from '../../components/ListScreen';
import { Badge, ListRow } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { formatCurrency, toNum } from '../../lib/utils';
import { useBusiness } from '../../providers/BusinessProvider';

export default function InventoryListScreen() {
  const router = useRouter();
  const { businessId } = useBusiness();
  const [search, setSearch] = useState('');

  const query = trpc.inventory.getProducts.useQuery(
    { businessId: businessId ?? '', search: search || undefined, pageSize: 100 },
    { enabled: !!businessId },
  );

  const products = query.data?.products ?? [];

  return (
    <ListScreen
      data={products}
      keyExtractor={(p) => p.id}
      loading={query.isLoading}
      refetching={query.isRefetching}
      onRefresh={() => query.refetch()}
      errorMessage={query.isError ? 'Could not load products' : undefined}
      onRetry={() => query.refetch()}
      search={{ value: search, onChange: setSearch, placeholder: 'Search products…' }}
      emptyTitle="No products yet"
      emptyDescription="Add your first product to start tracking inventory."
      emptyIcon={<Package size={26} color="#78716c" />}
      onAdd={() => router.push('/inventory/new')}
      renderItem={(p) => (
        <ListRow
          title={p.name}
          subtitle={`${p.sku}${p.category?.name ? ` · ${p.category.name}` : ''}`}
          onPress={() => router.push(`/inventory/${p.id}`)}
          right={
            <View className="items-end gap-1">
              <Text className="text-sm font-semibold text-foreground">
                {formatCurrency(p.sellingPrice)}
              </Text>
              <Badge
                label={`${toNum(p.currentStockLevel)} ${p.unit}`}
                tone={toNum(p.currentStockLevel) <= 0 ? 'destructive' : 'neutral'}
              />
            </View>
          }
        />
      )}
    />
  );
}
