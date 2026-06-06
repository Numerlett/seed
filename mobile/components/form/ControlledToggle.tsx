import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import { Toggle } from '../ui';

interface ControlledToggleProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
}

export function ControlledToggle<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: ControlledToggleProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <Toggle
          label={label}
          description={description}
          value={!!value}
          onValueChange={onChange}
        />
      )}
    />
  );
}
