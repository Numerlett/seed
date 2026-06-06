/** @type {import('tailwindcss').Config} */
// NativeWind v4 requires Tailwind v3. Tokens mirror the web app's shadcn (stone) palette.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#1c1917', // stone-900
        muted: '#f5f5f4', // stone-100
        'muted-foreground': '#78716c', // stone-500
        border: '#e7e5e4', // stone-200
        input: '#e7e5e4',
        primary: '#1c1917', // stone-900
        'primary-foreground': '#fafaf9',
        secondary: '#f5f5f4',
        'secondary-foreground': '#1c1917',
        destructive: '#dc2626', // red-600
        'destructive-foreground': '#fafaf9',
        success: '#16a34a', // green-600
        warning: '#d97706', // amber-600
        accent: '#f5f5f4',
        card: '#ffffff',
      },
    },
  },
  plugins: [],
};
