import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '../providers/SessionProvider';

export default function Index() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#1c1917" />
      </View>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/dashboard' : '/login'} />;
}
