# SEED Mobile

React Native app for the SEED business management platform.

## Stack

- **React Native** with Expo
- **tRPC** client (shared config from `@seed/api`)
- **Zod** schemas from `@seed/schemas`

## Structure (planned)

```
mobile/
├── app/          # Expo Router screens
├── components/   # Shared UI components
├── providers/    # Context providers (auth, business, trpc)
└── lib/          # Utilities and hooks
```

## Getting Started

```bash
# From monorepo root
pnpm --filter mobile dev

# Or inside this directory
npx expo start
```

## Notes

- Shares `@seed/schemas` and `@seed/api` with the web app
- Connects to the same backend at `server/` — point `EXPO_PUBLIC_SERVER_BASE_URL` to your server
- Auth uses the same OTP flow as the web app
