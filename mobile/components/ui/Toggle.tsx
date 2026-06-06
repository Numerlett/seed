import React from 'react';
import { Switch, Text, View } from 'react-native';

export function Toggle({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <View className="flex-1">
        <Text className="text-sm font-medium text-foreground">{label}</Text>
        {description ? (
          <Text className="text-xs text-muted-foreground">{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: '#1c1917', false: '#e7e5e4' }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
