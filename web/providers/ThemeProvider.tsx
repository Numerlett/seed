'use client';

import useLocalState from '@/hooks/useLocalState';
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import { createContext, useContext, useEffect } from 'react';

export interface ThemePresetContextType {
  themePreset: string;
  changeThemePreset: (preset: string) => void;
}

const ThemePresetContext = createContext<ThemePresetContextType>({
  themePreset: 'theme-default',
  changeThemePreset: () => {},
});

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
}: Readonly<{
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark';
}>) {
  const [themePreset, setThemePreset] = useLocalState<string>(
    'theme-preset',
    'theme-default',
  );

  useEffect(() => {
    document.documentElement.classList.add(themePreset);
  }, [themePreset]);

  const changeThemePreset = (preset: string) => {
    document.documentElement.classList.remove(themePreset);
    document.documentElement.classList.add(preset);
    setThemePreset(preset);
  };

  return (
    <NextThemeProvider
      attribute="class"
      storageKey="theme"
      defaultTheme={defaultTheme}
    >
      <ThemePresetContext.Provider
        value={{
          themePreset,
          changeThemePreset,
        }}
      >
        {children}
      </ThemePresetContext.Provider>
    </NextThemeProvider>
  );
}

export function useThemePreset() {
  const context = useContext(ThemePresetContext);
  if (!context) {
    throw new Error('useThemePreset must be used within a ThemeProvider');
  }
  return context;
}
