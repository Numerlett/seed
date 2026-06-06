import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '../../lib/utils';

interface ListRowProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  className?: string;
}

export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  showChevron = true,
  className,
}: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 active:opacity-70',
        className,
      )}
    >
      {left}
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress && showChevron ? (
        <ChevronRight size={18} color="#a8a29e" />
      ) : null}
    </Pressable>
  );
}
