import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

const containerVariant: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary border border-border',
  outline: 'bg-transparent border border-border',
  ghost: 'bg-transparent',
  destructive: 'bg-destructive',
};

const textVariant: Record<Variant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-destructive-foreground',
};

const sizeContainer: Record<Size, string> = {
  sm: 'h-9 px-3',
  md: 'h-11 px-4',
  lg: 'h-12 px-5',
};

const sizeText: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-xl active:opacity-80',
        sizeContainer[size],
        containerVariant[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? '#fff' : '#1c1917'}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={cn('font-semibold', sizeText[size], textVariant[variant])}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
