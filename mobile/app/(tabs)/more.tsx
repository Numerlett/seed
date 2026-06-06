import { useRouter } from 'expo-router';
import { ChevronRight, LogOut, UserCircle2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, Screen, confirm } from '../../components/ui';
import { MODULES } from '../../lib/modules';
import { useSession } from '../../providers/SessionProvider';

export default function MoreScreen() {
  const router = useRouter();
  const { user, signOut } = useSession();

  return (
    <Screen>
      <Pressable
        onPress={() => router.push('/account')}
        className="mb-5 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-70"
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-muted">
          <UserCircle2 size={28} color="#1c1917" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            {user?.name || 'My Account'}
          </Text>
          <Text className="text-sm text-muted-foreground">{user?.email}</Text>
        </View>
        <ChevronRight size={18} color="#a8a29e" />
      </Pressable>

      <Text className="mb-3 text-base font-semibold text-foreground">Modules</Text>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Pressable
              key={m.key}
              onPress={() =>
                router.push(m.route ? (m.route as never) : (`/module/${m.key}` as never))
              }
              className="w-[48%]"
            >
              <Card className="gap-2">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Icon size={20} color="#1c1917" />
                </View>
                <Text className="text-sm font-semibold text-foreground">{m.title}</Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {m.description}
                </Text>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() =>
          confirm({
            title: 'Sign out?',
            confirmLabel: 'Sign out',
            destructive: true,
            onConfirm: () => signOut(),
          })
        }
        className="mt-6 flex-row items-center justify-center gap-2 rounded-2xl border border-border py-3 active:opacity-70"
      >
        <LogOut size={18} color="#dc2626" />
        <Text className="font-medium text-destructive">Sign out</Text>
      </Pressable>
    </Screen>
  );
}
