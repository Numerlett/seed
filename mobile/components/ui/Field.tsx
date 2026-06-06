import React from 'react';
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { cn } from '../../lib/utils';

interface FieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Label + control + error wrapper so each form is just a list of fields. */
export function Field({ label, error, required, children, className }: FieldProps) {
  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <Text className="text-sm font-medium text-foreground">
          {label}
          {required ? <Text className="text-destructive"> *</Text> : null}
        </Text>
      ) : null}
      {children}
      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
    </View>
  );
}

interface InputProps extends TextInputProps {
  error?: boolean;
  className?: string;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor="#a8a29e"
      className={cn(
        'h-11 rounded-xl border bg-background px-3 text-base text-foreground',
        error ? 'border-destructive' : 'border-input',
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ error, className, ...props }: InputProps) {
  return (
    <TextInput
      placeholderTextColor="#a8a29e"
      multiline
      textAlignVertical="top"
      className={cn(
        'min-h-20 rounded-xl border bg-background px-3 py-2 text-base text-foreground',
        error ? 'border-destructive' : 'border-input',
        className,
      )}
      {...props}
    />
  );
}
