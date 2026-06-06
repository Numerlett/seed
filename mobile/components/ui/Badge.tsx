import React from 'react';
import { Text, View } from 'react-native';

import { cn } from '../../lib/utils';

type Tone = 'neutral' | 'success' | 'warning' | 'destructive' | 'info';

const toneStyles: Record<Tone, { bg: string; text: string }> = {
  neutral: { bg: 'bg-muted', text: 'text-muted-foreground' },
  success: { bg: 'bg-green-100', text: 'text-green-700' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700' },
  destructive: { bg: 'bg-red-100', text: 'text-red-700' },
  info: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

export function Badge({
  label,
  tone = 'neutral',
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  const s = toneStyles[tone];
  return (
    <View className={cn('self-start rounded-full px-2.5 py-0.5', s.bg, className)}>
      <Text className={cn('text-xs font-medium', s.text)}>{label}</Text>
    </View>
  );
}

/** Maps common status strings to a tone. */
export function statusTone(status?: string | null): Tone {
  switch ((status ?? '').toUpperCase()) {
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'PAID':
    case 'ACTIVE':
    case 'RECEIVED':
      return 'success';
    case 'DRAFT':
    case 'PENDING':
    case 'PARTIAL':
      return 'warning';
    case 'CANCELLED':
    case 'CANCELED':
    case 'EXPIRED':
    case 'OVERDUE':
      return 'destructive';
    default:
      return 'neutral';
  }
}
