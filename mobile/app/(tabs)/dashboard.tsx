import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Package,
  Plus,
  Users,
  Warehouse,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, Screen, Spinner } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { useBusiness } from '../../providers/BusinessProvider';

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="flex-1">
      <View className="mb-2 h-9 w-9 items-center justify-center rounded-xl bg-muted">
        {icon}
      </View>
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </Card>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[31%] items-center gap-2 rounded-2xl border border-border bg-card py-4 active:opacity-70"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
        {icon}
      </View>
      <Text className="text-center text-xs font-medium text-foreground">
        {label}
      </Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { businessId, isLoading: bizLoading, activeBusiness } = useBusiness();

  const dashboardQuery = trpc.dashboard.getDashboardData.useQuery(
    { businessId: businessId ?? '' },
    { enabled: !!businessId },
  );

  if (bizLoading || (!!businessId && dashboardQuery.isLoading)) {
    return (
      <Screen>
        <Spinner />
      </Screen>
    );
  }

  const data = dashboardQuery.data;

  return (
    <Screen
      refreshing={dashboardQuery.isRefetching}
      onRefresh={() => dashboardQuery.refetch()}
    >
      <Text className="mb-1 text-2xl font-bold text-foreground">
        {activeBusiness?.name ?? 'Dashboard'}
      </Text>
      <Text className="mb-5 text-sm text-muted-foreground">
        Here's what's happening in your business
      </Text>

      <View className="mb-3 flex-row gap-3">
        <StatCard
          label="Products"
          value={data?.productCount ?? 0}
          icon={<Package size={18} color="#1c1917" />}
        />
        <StatCard
          label="Customers"
          value={data?.customerCount ?? 0}
          icon={<Users size={18} color="#1c1917" />}
        />
      </View>
      <View className="mb-6 flex-row gap-3">
        <StatCard
          label="Suppliers"
          value={data?.supplierCount ?? 0}
          icon={<Boxes size={18} color="#1c1917" />}
        />
        <View className="flex-1" />
      </View>

      <Text className="mb-3 text-base font-semibold text-foreground">
        Quick actions
      </Text>
      <View className="flex-row flex-wrap gap-[3.5%] gap-y-3">
        <QuickAction
          label="New Product"
          icon={<Package size={20} color="#1c1917" />}
          onPress={() => router.push('/inventory/new')}
        />
        <QuickAction
          label="New Sale"
          icon={<ArrowUpRight size={20} color="#1c1917" />}
          onPress={() => router.push('/sales/new')}
        />
        <QuickAction
          label="New Purchase"
          icon={<ArrowDownLeft size={20} color="#1c1917" />}
          onPress={() => router.push('/purchases/new-order')}
        />
        <QuickAction
          label="Add Party"
          icon={<Users size={20} color="#1c1917" />}
          onPress={() => router.push('/parties/new')}
        />
        <QuickAction
          label="Warehouse"
          icon={<Warehouse size={20} color="#1c1917" />}
          onPress={() => router.push('/warehouses/new')}
        />
        <QuickAction
          label="More"
          icon={<Plus size={20} color="#1c1917" />}
          onPress={() => router.push('/more')}
        />
      </View>
    </Screen>
  );
}
