import { Stack, useLocalSearchParams } from 'expo-router';
import { Hammer } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { Card, Screen } from '../../components/ui';
import { findModule } from '../../lib/modules';

export default function ModuleScaffoldScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const module = findModule(key ?? '');
  const Icon = module?.icon ?? Hammer;
  const title = module?.title ?? 'Module';

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title }} />
      <View className="items-center gap-4 py-12">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Icon size={30} color="#1c1917" />
        </View>
        <Text className="text-xl font-bold text-foreground">{title}</Text>
        <Text className="px-6 text-center text-sm text-muted-foreground">
          {module?.description}
        </Text>

        <Card className="mt-4 gap-2">
          <Text className="text-base font-semibold text-foreground">
            Coming to mobile
          </Text>
          <Text className="text-sm text-muted-foreground">
            This module's screens are on the way. The same backend powers it today
            on the web app — your data is ready and will appear here once the mobile
            UI ships.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
