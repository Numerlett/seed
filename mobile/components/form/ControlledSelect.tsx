import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import { Field, Select, type SelectOption } from '../ui';

interface ControlledSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options: SelectOption[];
  title?: string;
}

export function ControlledSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  required,
  options,
  title,
}: ControlledSelectProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState }) => (
        <Field label={label} required={required} error={fieldState.error?.message}>
          <Select
            value={value as string | undefined}
            options={options}
            onChange={onChange}
            placeholder={placeholder}
            title={title}
            error={!!fieldState.error}
          />
        </Field>
      )}
    />
  );
}
