import { Stack } from 'expo-router';
import { Smartphone, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  Badge,
  Card,
  Empty,
  Screen,
  Spinner,
  confirm,
  useToast,
} from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage, formatDate } from '../../lib/utils';

export default function SessionsScreen() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const query = trpc.auth.getActiveSessions.useQuery();

  const revoke = trpc.auth.revokeSessionById.useMutation({
    onSuccess: () => {
      toast.success('Session revoked');
      utils.auth.getActiveSessions.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const sessions = query.data?.sessions ?? [];
  const currentId = query.data?.currentSessionId;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Active sessions' }} />
      {query.isLoading ? (
        <Spinner />
      ) : sessions.length === 0 ? (
        <Empty title="No active sessions" />
      ) : (
        <View className="gap-3">
          {sessions.map((s) => {
            const title =
              s.deviceName ||
              [s.browser, s.os].filter(Boolean).join(' · ') ||
              s.deviceType ||
              'Unknown device';
            const isCurrent = currentId === s.id;
            return (
              <Card key={s.id} className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
                  <Smartphone size={18} color="#1c1917" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-medium text-foreground" numberOfLines={1}>
                      {title}
                    </Text>
                    {isCurrent ? <Badge label="This device" tone="success" /> : null}
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {[s.loginMethod, s.ipAddress].filter(Boolean).join(' · ')}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Active {formatDate(s.lastActiveAt)}
                  </Text>
                </View>
                {!isCurrent ? (
                  <Pressable
                    onPress={() =>
                      confirm({
                        title: 'Revoke session?',
                        message: 'This device will be signed out.',
                        confirmLabel: 'Revoke',
                        destructive: true,
                        onConfirm: () => revoke.mutate({ sessionId: s.id }),
                      })
                    }
                    className="p-2"
                  >
                    <Trash2 size={18} color="#dc2626" />
                  </Pressable>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
