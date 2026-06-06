import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Field, Input, Screen, useToast } from '../../components/ui';
import { trpc } from '../../lib/trpc';
import { errorMessage } from '../../lib/utils';
import { useSession } from '../../providers/SessionProvider';

export default function VerifyScreen() {
  const router = useRouter();
  const toast = useToast();
  const { signIn } = useSession();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email ?? '').toString();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | undefined>();

  const verifyMutation = trpc.auth.emailVerify.useMutation({
    onSuccess: async (data) => {
      if (data?.accessToken && data?.refreshToken) {
        await signIn(data.accessToken, data.refreshToken);
        router.replace('/dashboard');
      }
    },
    onError: (e) => {
      setError(errorMessage(e));
      toast.error(errorMessage(e));
    },
  });

  const resendMutation = trpc.auth.emailLogin.useMutation({
    onSuccess: () => toast.success('New code sent'),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onSubmit = () => {
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setError(undefined);
    verifyMutation.mutate({ email, otp: otp.trim() });
  };

  return (
    <Screen>
      <Pressable
        onPress={() => router.back()}
        className="mt-2 flex-row items-center gap-1 self-start py-2"
      >
        <ArrowLeft size={18} color="#1c1917" />
        <Text className="text-sm text-foreground">Back</Text>
      </Pressable>

      <View className="flex-1 justify-center gap-8 py-8">
        <View className="gap-2">
          <Text className="text-2xl font-bold text-foreground">Enter code</Text>
          <Text className="text-sm text-muted-foreground">
            We sent a 6-digit code to{' '}
            <Text className="font-medium text-foreground">{email}</Text>
          </Text>
        </View>

        <View className="gap-4">
          <Field label="6-digit code" error={error}>
            <Input
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              error={!!error}
              className="text-center text-2xl tracking-[8px]"
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
          </Field>

          <Button
            label="Verify & Continue"
            onPress={onSubmit}
            loading={verifyMutation.isPending}
          />

          <Pressable
            onPress={() => resendMutation.mutate({ email })}
            disabled={resendMutation.isPending}
            className="py-2"
          >
            <Text className="text-center text-sm text-muted-foreground">
              Didn't get it?{' '}
              <Text className="font-semibold text-primary">Resend code</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
