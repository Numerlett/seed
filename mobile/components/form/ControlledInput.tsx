import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { type KeyboardTypeOptions } from 'react-native';

import { Field, Input, TextArea } from '../ui';

interface ControlledInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required,
  keyboardType,
  autoCapitalize,
  multiline,
}: ControlledInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState }) => (
        <Field label={label} required={required} error={fieldState.error?.message}>
          {multiline ? (
            <TextArea
              value={(value as string) ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              error={!!fieldState.error}
            />
          ) : (
            <Input
              value={value === undefined || value === null ? '' : String(value)}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              error={!!fieldState.error}
            />
          )}
        </Field>
      )}
    />
  );
}
