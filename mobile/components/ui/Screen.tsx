import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '../../lib/utils';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
  contentClassName?: string;
  /** Adds bottom padding for floating action buttons / safe area. */
  padded?: boolean;
}

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  className,
  contentClassName,
  padded = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      className={cn(padded && 'px-4 pt-4', contentClassName)}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1', padded && 'px-4 pt-4', contentClassName)}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className={cn('flex-1 bg-background', className)}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
