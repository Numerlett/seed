import { Check, ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

import { cn } from '../../lib/utils';

export interface SelectOption {
  label: string;
  value: string;
  subtitle?: string;
}

interface SelectProps {
  value?: string | null;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  title?: string;
}

export function Select({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
  title,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          'h-11 flex-row items-center justify-between rounded-xl border bg-background px-3',
          error ? 'border-destructive' : 'border-input',
        )}
      >
        <Text
          className={cn(
            'text-base',
            selected ? 'text-foreground' : 'text-muted-foreground',
          )}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={18} color="#78716c" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setOpen(false)}
        >
          <Pressable className="max-h-[70%] rounded-t-3xl bg-background p-4">
            <View className="mb-2 h-1.5 w-10 self-center rounded-full bg-border" />
            {title ? (
              <Text className="mb-2 text-base font-semibold text-foreground">
                {title}
              </Text>
            ) : null}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              ItemSeparatorComponent={() => <View className="h-px bg-border" />}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    className="flex-row items-center justify-between py-3"
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-base text-foreground">
                        {item.label}
                      </Text>
                      {item.subtitle ? (
                        <Text className="text-xs text-muted-foreground">
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? <Check size={18} color="#16a34a" /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text className="py-6 text-center text-sm text-muted-foreground">
                  No options
                </Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
