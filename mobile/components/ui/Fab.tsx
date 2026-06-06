import { Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Fab({
  onPress,
  icon,
}: {
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      style={{ bottom: insets.bottom + 20 }}
      className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
    >
      {icon ?? <Plus size={26} color="#fff" />}
    </Pressable>
  );
}
