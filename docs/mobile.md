# SEED Mobile — Usage & Developer Guide

The SEED mobile app is a **React Native (Expo)** client that talks to the **same
backend** as the web app and reuses the shared `@seed/api` types and
`@seed/schemas` Zod schemas. Because the API contract is shared, backend, web,
and mobile stay type-safe together — change a router or a schema and both
clients see it.

> Source lives in [`mobile/`](../mobile). This document is the full guide; the
> [mobile/README.md](../mobile/README.md) is the short version.

## Table of contents

- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Running the app](#running-the-app)
- [Project structure](#project-structure)
- [Architecture](#architecture)
  - [Provider chain](#provider-chain)
  - [Authentication](#authentication)
  - [Multi-business context](#multi-business-context)
  - [Data fetching with tRPC](#data-fetching-with-trpc)
  - [Forms](#forms)
- [Features](#features)
- [Google sign-in setup](#google-sign-in-setup)
- [Shipping a build](#shipping-a-build)
  - [Expo Go](#option-a--expo-go-fastest-dev-only)
  - [EAS Build (cloud)](#option-b--eas-build-cloud-apk--aab)
  - [Local build](#local-build-requires-android-studio)
- [Monorepo & Metro notes](#monorepo--metro-notes)
- [Troubleshooting](#troubleshooting)
- [Working on all three apps together](#working-on-all-three-apps-together)

---

## Tech stack

| Concern        | Choice |
|----------------|--------|
| Framework      | Expo SDK 56, React 19, React Native 0.85 (New Architecture) |
| Navigation     | Expo Router (file-based) |
| Styling        | NativeWind v4 (Tailwind for RN) |
| API            | tRPC (`@trpc/react-query`) typed by the server's `AppRouter` |
| Server state   | TanStack Query (React Query) |
| Forms          | react-hook-form + Zod (`@seed/schemas`) |
| Secure storage | expo-secure-store (native) / `localStorage` (web fallback) |
| Auth (Google)  | expo-auth-session (native ID-token flow) |
| Images         | expo-image, expo-image-picker (+ S3 presigned upload) |
| Icons          | lucide-react-native |

---

## Prerequisites

- **Node** and **pnpm** (this is a pnpm monorepo — always install from the repo root).
- The **SEED backend** running and reachable from your device (`@seed/server`).
- The **Expo Go** app on your phone (for the quick path), or Android Studio / Xcode
  for a simulator/emulator, or an EAS/dev build for native features.
- For Google sign-in: Google Cloud OAuth client IDs and a **development build**
  (see [Google sign-in setup](#google-sign-in-setup)).

---

## Quick start

```bash
# 1. Install everything from the repo root (uses node-linker=hoisted)
pnpm install

# 2. Build the shared schemas package (Metro reads its dist/)
pnpm --filter @seed/schemas build

# 3. Configure the app's environment
cp mobile/.env.example mobile/.env
#   set EXPO_PUBLIC_SERVER_BASE_URL to your machine's LAN IP, e.g. http://192.168.1.10:8080

# 4. Start the backend (separate terminal)
pnpm --filter @seed/server dev

# 5. Start the app and scan the QR code with Expo Go
pnpm --filter mobile start
```

Log in with the test credentials from `server/.env` (`TEST_USER_EMAIL` /
`TEST_USER_OTP`) — in non-production the OTP is not emailed, it's the fixed test value.

---

## Environment variables

Set these in `mobile/.env` (see [mobile/.env.example](../mobile/.env.example)).
Expo only exposes variables prefixed with `EXPO_PUBLIC_` to the app bundle.

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SERVER_BASE_URL` | yes | Backend base URL, e.g. `http://192.168.1.10:8080`. **On a physical device use the host's LAN IP, not `localhost`** — the phone can't reach the host's loopback. The app appends `/api`. |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | optional | iOS OAuth client ID (Google sign-in). |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | optional | Android OAuth client ID. |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | optional | Web/Expo OAuth client ID. |

The "Continue with Google" button only appears when at least one Google client ID
is set. On the **server**, mirror those IDs in `GOOGLE_MOBILE_CLIENT_IDS`
(comma-separated) so token audiences match.

> Changing a `.env` value requires restarting Metro (and sometimes clearing the
> cache: `npx expo start -c`), because `EXPO_PUBLIC_*` vars are inlined at build time.

---

## Running the app

From the repo root:

```bash
pnpm --filter mobile start       # Metro + QR (press s/a/i/w in the prompt)
pnpm --filter mobile android     # open on Android emulator/device
pnpm --filter mobile ios         # open on iOS simulator (macOS)
pnpm --filter mobile web         # run in the browser (preview only)
pnpm --filter mobile lint        # type-check (tsc --noEmit)
```

Notes:
- **Device networking:** the device and the computer must be on the same network,
  and `EXPO_PUBLIC_SERVER_BASE_URL` must be the host LAN IP.
- **Web target** is a convenience preview. Native-only modules degrade gracefully
  (e.g. secure storage falls back to `localStorage`), but treat the device as the
  source of truth.

---

## Project structure

```
mobile/
├── app/                        # Expo Router screens (file = route)
│   ├── _layout.tsx             # Root: provider chain + auth-gate navigator
│   ├── index.tsx               # Launch redirect (→ login or dashboard)
│   ├── (auth)/
│   │   ├── login.tsx           # email entry + "Continue with Google"
│   │   └── verify.tsx          # 6-digit OTP
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Bottom tabs + business-switcher header
│   │   ├── dashboard.tsx       # KPIs + quick actions
│   │   ├── inventory.tsx       # product list
│   │   ├── sales.tsx           # invoice list
│   │   ├── purchases.tsx       # PO / GRN list (segmented)
│   │   └── more.tsx            # module grid + account + sign out
│   ├── inventory/[id].tsx, inventory/new.tsx
│   ├── parties/index.tsx, parties/new.tsx, parties/[id].tsx
│   ├── warehouses/index.tsx, warehouses/new.tsx, warehouses/[id].tsx
│   ├── sales/new.tsx, sales/[id].tsx
│   ├── purchases/new-order.tsx, purchases/new-grn.tsx,
│   │   purchases/[id].tsx, purchases/grn/[id].tsx
│   ├── account/index.tsx, account/sessions.tsx
│   └── module/[key].tsx        # generic scaffold for not-yet-built modules
├── components/
│   ├── ui/                     # Button, Input/Field, Card, Select, Badge, Toast,
│   │                           #   ListRow, Fab, Segmented, Screen, Feedback, confirm
│   ├── form/                   # ControlledInput / Select / Toggle (RHF wrappers)
│   ├── AppHeader.tsx           # business switcher + account entry
│   ├── ListScreen.tsx          # search + FlatList + FAB + empty/error states
│   ├── ProductForm.tsx, PartyForm.tsx, WarehouseForm.tsx
│   ├── LineItemsEditor.tsx     # invoice/order line items + totals
│   └── ImageUploadField.tsx    # pick + S3 upload
├── lib/
│   ├── trpc.tsx                # tRPC client + provider (Bearer + 401 refresh)
│   ├── api-types.ts            # RouterInputs / RouterOutputs helpers
│   ├── auth/tokenStore.ts      # cross-platform secure token storage
│   ├── config.ts               # SERVER_BASE_URL / API_URL
│   ├── s3.ts                   # presigned-URL upload helper
│   ├── useGoogleAuth.ts        # native Google ID-token flow
│   ├── useLineItemData.ts      # products + customers/suppliers + warehouses
│   ├── modules.ts              # module registry for the More tab
│   └── utils.ts                # cn, formatCurrency, toNum, dates, errors
└── providers/
    ├── SessionProvider.tsx     # auth state, signIn / signOut
    └── BusinessProvider.tsx    # active business, switching
```

Routing conventions:
- Route **groups** in parentheses (`(auth)`, `(tabs)`) don't appear in the URL.
- Tab screens live in `(tabs)/`; detail/form screens live in plain folders so they
  push **over** the tab bar with a native header (each sets its own title via
  `<Stack.Screen options={…} />`).

---

## Architecture

### Provider chain

[app/_layout.tsx](../mobile/app/_layout.tsx) wraps the app:

```
GestureHandlerRootView → SafeAreaProvider → TRPCProvider
  → SessionProvider → BusinessProvider → ToastProvider → <Stack/>
```

`RootNavigator` watches session status and redirects: unauthenticated users are
sent to `/login`, authenticated users away from the auth group to `/dashboard`.

### Authentication

Mobile uses **header-based auth** (the web uses HTTP-only cookies). The backend
already supports both — `auth.emailVerify` and `auth.googleSignInMobile` return
`{ accessToken, refreshToken }` in the body, and the tRPC context reads the
`Authorization: Bearer` header before the cookie.

**OTP flow**
1. `auth.emailLogin({ email })` → OTP emailed (or the fixed test OTP in dev).
2. `auth.emailVerify({ email, otp })` → returns tokens.
3. Tokens stored via [tokenStore.ts](../mobile/lib/auth/tokenStore.ts) and the
   user is signed in.

**Google flow** — see [Google sign-in setup](#google-sign-in-setup).

**Token storage & refresh**
- [tokenStore.ts](../mobile/lib/auth/tokenStore.ts) keeps the access token in
  memory (for synchronous request signing) and persists both tokens — using
  `expo-secure-store` on native and `localStorage` on web.
- [lib/trpc.tsx](../mobile/lib/trpc.tsx) attaches `Authorization: Bearer <token>`
  to every request. On a `401` it performs a **single-flight** refresh via
  `auth.getNewAccessToken` (using the stored refresh token), persists the rotated
  pair, and retries the original request once. If refresh fails, tokens are
  cleared and the app falls back to login.
- The session persists across app restarts (tokens are rehydrated on boot).

`SessionProvider` exposes `user`, `status` (`loading` | `authenticated` |
`unauthenticated`), `signIn(accessToken, refreshToken)`, `signOut()`, and `refresh()`.

### Multi-business context

Every `businessMemberProcedure` on the server requires a `businessId` in its
input. [BusinessProvider.tsx](../mobile/providers/BusinessProvider.tsx) loads the
user's memberships (`business.getBusinessesMemberships`), persists the active
selection in secure storage, and exposes:

```ts
const { activeBusiness, businessId, memberships, switchBusiness } = useBusiness();
const businessId = useBusinessId(); // shorthand
```

Pass `businessId` into each business-scoped query/mutation. The business switcher
lives in [AppHeader.tsx](../mobile/components/AppHeader.tsx) (and can create a new
business inline).

### Data fetching with tRPC

```ts
import { trpc } from '@/lib/trpc';
import { useBusinessId } from '@/providers/BusinessProvider';

function Example() {
  const businessId = useBusinessId();
  const products = trpc.inventory.getProducts.useQuery(
    { businessId, pageSize: 100 },
    { enabled: !!businessId },
  );

  const utils = trpc.useUtils();
  const addProduct = trpc.inventory.addProduct.useMutation({
    onSuccess: () => utils.inventory.getProducts.invalidate(),
  });
}
```

- Gate business-scoped queries with `enabled: !!businessId`.
- After mutations, invalidate the affected query (and `dashboard.getDashboardData`
  where counts change).
- Need a type? Use `RouterInputs` / `RouterOutputs` from
  [lib/api-types.ts](../mobile/lib/api-types.ts) rather than deriving from hooks.
- **Prisma `Decimal`** fields (prices, stock) arrive Number-coercible over
  SuperJSON — wrap them with `toNum()` from [lib/utils.ts](../mobile/lib/utils.ts)
  before doing math, exactly like the web does.

### Forms

Forms use react-hook-form with `zodResolver` and the shared schemas from
`@seed/schemas` (e.g. `productFormSchema`). The `components/form/Controlled*`
wrappers cut boilerplate:

```tsx
<ControlledInput control={control} name="name" label="Name" required />
<ControlledSelect control={control} name="categoryId" label="Category" options={…} />
<ControlledToggle control={control} name="isActive" label="Active" />
```

`LineItemsEditor` handles invoice/order line items and computes per-line and grand
totals; `ImageUploadField` picks an image and uploads it to S3 via a presigned URL
(`s3.getPresignedUrl` → PUT → store the public URL).

---

## Features

**Full CRUD on mobile**

| Area | Screens / actions |
|------|-------------------|
| Auth | OTP login + verify, Google sign-in, persistent session, silent refresh |
| Business | switch active business, create business |
| Dashboard | product/customer/supplier counts, quick actions |
| Inventory | list, search, detail, create, edit, delete, image upload, inline categories |
| Parties | list (All/Customers/Suppliers), detail, create, edit, delete |
| Warehouses | list, detail, create, edit, delete |
| Sales | invoice list, create (line items), detail, confirm, cancel, delete |
| Purchases | PO + GRN lists, create order, create receipt, detail, confirm, cancel, delete |
| Account | edit profile, list/revoke sessions, sign out |

**Scaffolded (backend wired, mobile UI pending)** — reachable from the **More**
tab via [`module/[key].tsx`](../mobile/app/module/[key].tsx): returns, stock ops,
batches, accounting, payments, tax/GST, reports, CRM, manufacturing,
communications, admin. To promote one to a real screen, build it like the existing
modules and point its entry in [lib/modules.ts](../mobile/lib/modules.ts) at the
new route.

---

## Google sign-in setup

The app uses the **native ID-token flow**: the device runs Google's OAuth flow
locally, obtains a Google ID token, and exchanges it for SEED tokens via the
`auth.googleSignInMobile` tRPC mutation. The server verifies the token signature
and audience and returns `{ accessToken, refreshToken }` in the response body
(no cookies — mobile uses `Authorization: Bearer` headers).

> ⚠️ **Expo Go limitation:** native Google sign-in requires platform OAuth client
> IDs and a **development build** (`eas build --profile development` or
> `npx expo run:android`). It does **not** work reliably in Expo Go. Use OTP login
> during Expo Go development.

---

### How it works (code path)

```
login.tsx
  → google.signIn()                          # useGoogleAuth.ts: promptAsync()
  → Google OAuth popup (expo-auth-session)
  ← id_token in response.params
  → trpc.auth.googleSignInMobile({ idToken })
  → server: verifyIdToken() checks audiences (GOOGLE_CLIENT_ID + GOOGLE_MOBILE_CLIENT_IDS)
  ← { accessToken, refreshToken }
  → signIn(accessToken, refreshToken)        # SessionProvider: stored in secure-store
  → router.replace('/dashboard')
```

The "Continue with Google" button is **conditionally rendered** — it only appears
when `googleAuthConfigured` is `true` (at least one `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`
is set). See [lib/useGoogleAuth.ts](../mobile/lib/useGoogleAuth.ts).

---

### Step 1 — Get your Android SHA-1 fingerprint

Android OAuth clients are **tied to a package name + signing certificate**. You
need the SHA-1 fingerprint of the keystore that signs the build.

The EAS-managed keystore SHA-1 for this project's **development** profile is:

```
97:59:3F:81:04:9B:42:C6:01:E4:28:EF:DE:C1:4A:50:92:F2:39:3D
```

To retrieve it again at any time:

```bash
cd mobile
eas credentials   # select Android → development → view keystore
```

> If you create a **production** build profile with a separate keystore, that
> profile will have a different SHA-1 and needs its own Android OAuth client.

---

### Step 2 — Create OAuth client IDs in Google Cloud Console

Go to **APIs & Services → Credentials → + Create Credentials → OAuth client ID**.

**Android client** (needed for device builds):
| Field | Value |
|-------|-------|
| Application type | Android |
| Package name | `com.seed.app` |
| SHA-1 fingerprint | from Step 1 above |

**Web client** (needed for Expo Go and web target):
| Field | Value |
|-------|-------|
| Application type | Web application |

> The project already has a web/server OAuth client (`GOOGLE_CLIENT_ID` in
> `server/.env`). You can reuse that client ID as the Web client ID here, or
> create a dedicated one.

---

### Step 3 — Configure environment variables

**Local dev** (`mobile/.env`):
```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios-client-id>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android-client-id>.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

**EAS builds** (`mobile/eas.json`, in each profile's `env` block):
```json
"EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID": "<android-client-id>.apps.googleusercontent.com"
```
EAS does **not** read `mobile/.env` — values must be in `eas.json` or set via
`eas secret:create --scope project` for sensitive keys.

**Server** (`server/.env`):
```
GOOGLE_MOBILE_CLIENT_IDS=<android-client-id>.apps.googleusercontent.com,<ios-client-id>.apps.googleusercontent.com
```
The server's `googleSignInMobile` handler validates the ID token audience against
`GOOGLE_CLIENT_ID` (the web/server client) plus every ID in `GOOGLE_MOBILE_CLIENT_IDS`
(comma-separated). Without this, the server will reject tokens issued to mobile clients.

---

### Current configuration (as of project setup)

| Client | ID |
|--------|----|
| Android (EAS dev/preview/production keystore) | `37157930076-1jad2k8nkiv6fp4aa4id6fh5cu4sj4vq` |
| iOS / Web | `37157930076-4fdgln3k6ve05evqrrbvdgmernkanan2` |

Implementation files:
- Client: [lib/useGoogleAuth.ts](../mobile/lib/useGoogleAuth.ts)
- Server: `googleSignInMobile` in [server/controllers/auth.ts](../server/controllers/auth.ts)

---

## Shipping a build

### Option A — Expo Go (fastest, dev only)

```bash
pnpm --filter mobile start   # scan QR with Expo Go on your phone
```

Works for OTP login and most features. Not suitable for native Google sign-in or
production distribution.

---

### Option B — EAS Build (cloud APK / AAB)

EAS Build compiles your app on Expo's servers — no Android SDK or Xcode needed
locally. The project is already configured; follow these steps once per machine.

#### One-time setup

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Log in to your Expo account (opens browser)
eas login

# 3. From inside mobile/, link the project (writes projectId to app.json)
cd mobile
eas init
```

> The `eas init` step writes `extra.eas.projectId` to `mobile/app.json` and ties
> the build to your Expo account (`owner: "jayendrabharti"`). Only needed once.

#### Build an APK (preview profile)

```bash
cd mobile
eas build -p android --profile preview
```

- Produces a **`.apk`** file downloadable from the Expo dashboard.
- Install on any Android device — no Play Store needed.
- Takes ~10 minutes on a cold build; subsequent builds are faster (cache).
- EAS generates and manages the Android keystore automatically (stored on Expo
  servers). Download and back it up from the Expo dashboard if you need it later.

#### Build a release AAB (production profile)

```bash
eas build -p android --profile production
```

Produces a **`.aab`** (Android App Bundle) for Google Play submission.

#### Build profiles

The three profiles in [`mobile/eas.json`](../mobile/eas.json):

| Profile | Output | Use for |
|---------|--------|---------|
| `development` | APK (dev client) | Internal testing with Expo dev client |
| `preview` | APK | Sharing a testable build without Play Store |
| `production` | AAB | Play Store submission |

#### Environment variables in EAS builds

EAS does **not** read your local `mobile/.env`. The `EXPO_PUBLIC_*` variables are
baked directly into each build profile's `env` block in `eas.json`:

```json
"env": {
  "EXPO_PUBLIC_SERVER_BASE_URL": "https://seed-00uw.onrender.com",
  "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "...",
  "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID": "...",
  "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "..."
}
```

To update a value, edit `eas.json` and trigger a new build. For genuinely secret
values (API keys that must not appear in the bundle), use
`eas secret:create --scope project` instead.

#### The `@seed/schemas` build hook

The EAS build server clones only what git tracks — `schemas/dist/` is gitignored
and therefore absent. The `mobile/package.json` contains an EAS-specific hook that
compiles schemas automatically after `pnpm install` completes on the build server:

```json
"eas-build-post-install": "pnpm --filter @seed/schemas build"
```

This is already wired up. Do not remove it or the Metro bundler will fail with
`Cannot resolve @seed/schemas/dist/index.js`.

#### Android package name

The app's Android package ID is `com.seed.app` (set in `mobile/app.json`
→ `android.package`). This is permanent once you publish to the Play Store —
changing it after first publish requires a new Play Store listing.

---

### Local build (requires Android Studio)

Only needed if you want full local control or offline builds.

```bash
# Generate native android/ directory
cd mobile
npx expo prebuild --platform android

# Build debug APK
cd android
./gradlew assembleDebug

# Build release APK (needs a signing config in android/app/build.gradle)
./gradlew assembleRelease
```

---

Type-check before any build: `pnpm --filter mobile lint` (and `pnpm lint` for the
whole monorepo).

---

## Monorepo & Metro notes

- The repo root [`.npmrc`](../.npmrc) sets **`node-linker=hoisted`**. Expo's Metro
  bundler and autolinking need a flat `node_modules`; pnpm's default isolated store
  hides transitive Expo deps (e.g. `@expo/metro-runtime`). **Don't remove this** —
  the mobile bundle breaks without it.
- [metro.config.js](../mobile/metro.config.js) adds the workspace root to
  `watchFolders` and lists both `node_modules` dirs in `nodeModulesPaths` so Metro
  follows the `@seed/*` symlinks.
- `@seed/schemas` is consumed as its built `dist/`. **Rebuild it after editing a
  schema** (`pnpm --filter @seed/schemas build`) or Metro won't see the change.
- Only `@seed/api`/`@seed/schemas` are shared with the app. `@seed/server` is used
  for **types only** (`import type`), so server code is never bundled.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Network request failed / can't reach backend | Use the host **LAN IP** (not `localhost`) in `EXPO_PUBLIC_SERVER_BASE_URL`; device and computer on the same network; backend running. |
| `Unable to resolve module @expo/metro-runtime` (or similar) | Ensure root `.npmrc` has `node-linker=hoisted`, then `pnpm install`. |
| Schema changes not reflected | `pnpm --filter @seed/schemas build`, then restart Metro with `npx expo start -c`. |
| Env var change ignored | Restart Metro (`-c` to clear cache); only `EXPO_PUBLIC_*` vars reach the app. |
| Prices/stock show as `0` or NaN | Wrap Prisma `Decimal` values with `toNum()` before math/formatting. |
| Google button missing | Set at least one `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`. |
| Google sign-in fails in Expo Go | Expected — use a development build; or use OTP. |
| Logged out after expiry | Normal if the refresh token is invalid/expired; sign in again. Otherwise check the 401-refresh path in `lib/trpc.tsx`. |
| EAS build fails: `Cannot resolve @seed/schemas/dist/index.js` | The `eas-build-post-install` hook in `mobile/package.json` is missing or was removed. Restore it: `"eas-build-post-install": "pnpm --filter @seed/schemas build"`. |
| EAS build: env vars not taking effect | EAS ignores local `.env` files. Update the `env` block in the relevant build profile in `mobile/eas.json` and trigger a new build. |

---

## Working on all three apps together

Backend, web, and mobile evolve in the same monorepo and share contracts:

- Add/modify a Zod schema in [`@seed/schemas`](../schemas) → both web and mobile
  forms get it (rebuild the package for mobile).
- Add/modify a tRPC procedure in `@seed/server` → `AppRouter` updates flow to both
  clients via `@seed/api` types; mobile reads them through
  [lib/api-types.ts](../mobile/lib/api-types.ts).
- New business-scoped procedures should take `businessId` (see existing
  `businessMemberProcedure` usage) so mobile can pass it from `useBusinessId()`.
- Anything that would normally be cookie-only on the backend must also work with a
  Bearer header / return tokens in the body for mobile (as `emailVerify`,
  `getNewAccessToken`, and `googleSignInMobile` do).

See also: [ARCHITECTURE.md](ARCHITECTURE.md), [API_REFERENCE.md](API_REFERENCE.md),
[DEPLOYMENT.md](DEPLOYMENT.md).
