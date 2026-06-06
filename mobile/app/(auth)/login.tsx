import { useRouter } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Field, Input, Screen, useToast } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage } from '../../lib/utils';

export default function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();

  const loginMutation = trpc.auth.emailLogin.useMutation({
    onSuccess: () => {
      router.push({ pathname: '/verify', params: { email } });
    },
    onError: (e) => {
      setError(errorMessage(e));
      toast.error(errorMessage(e));
    },
  });

  const onSubmit = () => {
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError('Enter a valid email address');
      return;
    }
    setError(undefined);
    loginMutation.mutate({ email: value });
  };

  return (
    <Screen>
      <View className="flex-1 justify-center gap-8 py-12">
        <View className="items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Sprout size={32} color="#fff" />
          </View>
          <Text className="text-2xl font-bold text-foreground">SEED</Text>
          <Text className="text-center text-sm text-muted-foreground">
            Sign in to your business workspace
          </Text>
        </View>

        <View className="gap-4">
          <Field label="Email" error={error}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="you@business.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              error={!!error}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
          </Field>

          <Button
            label="Send OTP"
            onPress={onSubmit}
            loading={loginMutation.isPending}
          />

          <Text className="text-center text-xs text-muted-foreground">
            We'll email you a 6-digit code. No password needed.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
