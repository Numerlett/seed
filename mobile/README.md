# SEED Mobile

React Native (Expo) app for the SEED business management platform. It talks to the
**same backend** as the web app and reuses the shared `@seed/api` types and
`@seed/schemas` Zod schemas, so the API contract stays type-safe across web and mobile.

## Stack

- **Expo SDK 56** + **Expo Router** (file-based navigation)
- **React 19 / React Native 0.85** (New Architecture)
- **NativeWind v4** (Tailwind for React Native) for styling
- **tRPC** (`@trpc/react-query`) typed by the server's `AppRouter`
- **expo-secure-store** for token storage
- **react-hook-form** + **Zod** (`@seed/schemas`) for forms

## Getting started

```bash
# From the monorepo root – install once (uses node-linker=hoisted, see below)
pnpm install

# Point the app at your backend. On a PHYSICAL device you must use your computer's
# LAN IP (run `ipconfig`), not localhost — the phone can't reach the host's localhost.
cp mobile/.env.example mobile/.env
#   EXPO_PUBLIC_SERVER_BASE_URL=http://192.168.1.10:8080

# Start the backend (separate terminal)
pnpm --filter @seed/server dev

# Start the app and scan the QR with the Expo Go app
pnpm --filter mobile start
```

> **Schemas note:** `@seed/schemas` is consumed as its built `dist/`. If you change a
> schema, rebuild it: `pnpm --filter @seed/schemas build`.

## Authentication

Mobile uses **header-based auth** (the web uses HTTP-only cookies):

1. `auth.emailLogin` → OTP emailed; `auth.emailVerify` returns `{ accessToken, refreshToken }`
   in the response body (no backend change required).
2. Tokens are stored in `expo-secure-store`; the access token is sent as
   `Authorization: Bearer <token>` on every request.
3. On a `401`, the tRPC fetch wrapper transparently calls `auth.getNewAccessToken`
   (single-flight) with the stored refresh token, then retries. See
   [lib/trpc.tsx](lib/trpc.tsx) and [lib/auth/tokenStore.ts](lib/auth/tokenStore.ts).

## Multi-business

Every `businessMemberProcedure` call takes a `businessId`. The active business is held
in [providers/BusinessProvider.tsx](providers/BusinessProvider.tsx) (persisted in
SecureStore) and injected at each call site via `useBusiness()` / `useBusinessId()`.

## Structure

```
mobile/
├── app/                      # Expo Router screens
│   ├── (auth)/               # login, verify (OTP)
│   ├── (tabs)/               # dashboard, inventory, sales, purchases, more
│   ├── inventory/            # new, [id] (detail/edit)
│   ├── parties/              # index, new, [id]
│   ├── warehouses/           # index, new, [id]
│   ├── sales/                # new, [id]
│   ├── purchases/            # new-order, new-grn, [id], grn/[id]
│   ├── account/              # profile, sessions
│   └── module/[key].tsx      # generic scaffold for modules pending a mobile UI
├── components/               # ProductForm, PartyForm, LineItemsEditor, AppHeader, ui/ kit
├── lib/                      # trpc, tokenStore, s3, utils, api-types, modules
└── providers/                # SessionProvider, BusinessProvider
```

## Feature status

**Full CRUD on mobile:** auth, business switching, dashboard, inventory (incl. image
upload), parties, warehouses, sales invoices, purchase orders, goods receipts (GRN),
account & session management.

**Scaffolded (backend wired, mobile UI next):** returns, stock ops, batches, accounting,
payments, tax/GST, reports, CRM, manufacturing, communications, admin — reachable from
the **More** tab.

## Monorepo / Metro note

The repo root `.npmrc` sets `node-linker=hoisted`. Expo's Metro bundler and autolinking
need a flat `node_modules`; pnpm's default isolated store hides transitive Expo deps
(e.g. `@expo/metro-runtime`) from Metro. This is Expo's documented setup for pnpm
monorepos. [metro.config.js](metro.config.js) also adds the workspace root to
`watchFolders` so Metro follows the `@seed/*` symlinks.
