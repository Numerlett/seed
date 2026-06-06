import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '../components/ui';
import { TRPCProvider } from '../lib/trpc';
import { BusinessProvider } from '../providers/BusinessProvider';
import { SessionProvider, useSession } from '../providers/SessionProvider';

function RootNavigator() {
  const { status } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const inAuth = segments[0] === '(auth)';
    const inApp = segments[0] === '(tabs)' || segments[0] === undefined;

    if (status === 'authenticated' && inAuth) {
      router.replace('/dashboard');
    } else if (status === 'unauthenticated' && !inAuth) {
      router.replace('/login');
    }
  }, [status, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TRPCProvider>
          <SessionProvider>
            <BusinessProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <RootNavigator />
              </ToastProvider>
            </BusinessProvider>
          </SessionProvider>
        </TRPCProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
