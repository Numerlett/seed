import React from 'react';
import { Text, View } from 'react-native';

import { cn } from '../../lib/utils';

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={cn(
        'rounded-2xl border border-border bg-card p-4',
        className,
      )}
    >
      {children}
    </View>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text className={cn('text-base font-semibold text-foreground', className)}>
      {children}
    </Text>
  );
}

export function CardLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text className={cn('text-xs text-muted-foreground', className)}>
      {children}
    </Text>
  );
}
