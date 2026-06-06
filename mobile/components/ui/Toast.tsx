import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  tone: ToastTone;
  id: number;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneConfig: Record<ToastTone, { bg: string; icon: React.ReactNode }> = {
  success: { bg: 'bg-foreground', icon: <CheckCircle2 size={18} color="#4ade80" /> },
  error: { bg: 'bg-destructive', icon: <AlertCircle size={18} color="#fff" /> },
  info: { bg: 'bg-foreground', icon: <Info size={18} color="#93c5fd" /> },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone, id: Date.now() });
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, 2600);
    },
    [opacity],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{ opacity, top: insets.top + 8 }}
          className="absolute left-4 right-4 z-50"
        >
          <View
            className={`flex-row items-center gap-2 rounded-xl px-4 py-3 ${toneConfig[toast.tone].bg}`}
          >
            {toneConfig[toast.tone].icon}
            <Text className="flex-1 text-sm font-medium text-white">
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
