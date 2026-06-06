import { Alert } from 'react-native';

/** Native confirm dialog. Resolves via the onConfirm callback. */
export function confirm({
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
