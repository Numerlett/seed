import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '../../lib/utils';

export interface SegmentOption {
  label: string;
  value: string;
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="flex-row rounded-xl bg-muted p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={cn(
              'flex-1 items-center rounded-lg py-2',
              active && 'bg-background',
            )}
          >
            <Text
              className={cn(
                'text-sm',
                active ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
