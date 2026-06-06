import { Inbox } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { cn } from '../../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <View className={cn('flex-1 items-center justify-center py-12', className)}>
      <ActivityIndicator color="#1c1917" />
    </View>
  );
}

export function Empty({
  title = 'Nothing here yet',
  description,
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View className="items-center justify-center gap-3 px-6 py-16">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
        {icon ?? <Inbox size={26} color="#78716c" />}
      </View>
      <Text className="text-center text-base font-semibold text-foreground">
        {title}
      </Text>
      {description ? (
        <Text className="text-center text-sm text-muted-foreground">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-2">{action}</View> : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center justify-center gap-2 px-6 py-16">
      <Text className="text-center text-base font-semibold text-destructive">
        Couldn't load data
      </Text>
      {message ? (
        <Text className="text-center text-sm text-muted-foreground">
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Text onPress={onRetry} className="mt-2 text-sm font-semibold text-primary">
          Tap to retry
        </Text>
      ) : null}
    </View>
  );
}
