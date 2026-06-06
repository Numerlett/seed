import { Stack, useRouter } from 'expo-router';
import { LogOut, ShieldCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import {
  Button,
  Card,
  CardLabel,
  CardTitle,
  Field,
  Input,
  ListRow,
  Screen,
  confirm,
  useToast,
} from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage } from '../../lib/utils';
import { useSession } from '../../providers/SessionProvider';

export default function AccountScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, signOut, refresh } = useSession();
  const [name, setName] = useState(user?.name ?? '');

  const updateUser = trpc.auth.updateUser.useMutation({
    onSuccess: () => {
      toast.success('Profile updated');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Account' }} />
      <View className="gap-4">
        <Card className="gap-3">
          <CardTitle>Profile</CardTitle>
          <View>
            <CardLabel>Email</CardLabel>
            <Text className="text-base text-foreground">{user?.email}</Text>
          </View>
          <Field label="Name">
            <Input value={name} onChangeText={setName} placeholder="Your name" />
          </Field>
          <Button
            label="Save"
            loading={updateUser.isPending}
            onPress={() => name.trim() && updateUser.mutate({ name: name.trim() })}
          />
        </Card>

        <ListRow
          title="Active sessions"
          subtitle="Manage signed-in devices"
          left={
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <ShieldCheck size={18} color="#1c1917" />
            </View>
          }
          onPress={() => router.push('/account/sessions')}
        />

        <Button
          label="Sign out"
          variant="destructive"
          icon={<LogOut size={18} color="#fff" />}
          onPress={() =>
            confirm({
              title: 'Sign out?',
              confirmLabel: 'Sign out',
              destructive: true,
              onConfirm: () => signOut(),
            })
          }
        />
      </View>
    </Screen>
  );
}
