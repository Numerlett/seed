# SEED Audit Log

## Dependency Graph (re-verified 2026-11-23 by script over every package.json)

```
web          → api, schemas
mobile       → api, schemas (and server, type-only, as a devDependency)
api          → server (type-only import for AppRouter via devDependency)
server       → accounting, database, integrations, jobs, pdf, schemas, tax
database     → (nothing internal)
schemas      → (nothing internal)
jobs         → database
pdf          → schemas
tax          → database
accounting   → database
integrations → (nothing internal — axios, dotenv)
```

No circular dependencies detected. The `api` package imports `AppRouter` from `@seed/server` only as a `devDependency`, and the imports in `client.ts` and `server.ts` are `import type { AppRouter }` (type-only). ✓

---

## Issues Found & Fixed

### [security] — `server/helpers/validateENV.ts`
**Issue:** JWT secrets (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`) were validated with `.min(1)` — accepting a single-character secret. A minimum of 32 characters is required for any production-grade HMAC-SHA256 signing key.
**Fix:** Changed both to `.min(32, '... must be at least 32 characters')`. Also removed `console.log` startup noise.
**Status:** Fixed ✓

---

### [security] — `server/controllers/auth.ts` + `server/helpers/authCrypto.ts`
**Issue:** OTPs were stored as **plaintext** in the `otps` table. An attacker with database read access could impersonate any user.
**Fix:**
- Created `server/helpers/authCrypto.ts` with `hashOtp(otp: string): string` using `crypto.createHash('sha256').update(otp).digest('hex')`.
- `emailLogin`: OTP is hashed before `prisma.otp.create()`.
- `emailVerify`: Incoming OTP is hashed before comparison (`otpRecord.otp !== hashOtp(otp)`).
**Status:** Fixed ✓

---

### [security] — `server/controllers/auth.ts` (OTP deletion on verify)
**Issue:** OTP records were marked `verifiedAt: new Date()` on success but kept in the database, enabling potential replay attacks.
**Fix:** Replaced the `prisma.otp.update({ data: { verifiedAt } })` with `prisma.otp.delete({ where: { id } })` after successful verification.
**Status:** Fixed ✓

---

### [security] — `server/helpers/inventoryLedger.ts`
**Issue:** `validateStockAvailability` threw a plain `new Error(...)` when stock was insufficient. This would be caught and re-wrapped as a generic `INTERNAL_SERVER_ERROR` instead of `BAD_REQUEST`.
**Fix:** Changed to `throw new TRPCError({ code: 'BAD_REQUEST', message: ... })`.
**Status:** Fixed ✓

---

### [security] — `server/controllers/dashboard.ts`
**Issue:** `getDashboardData` used `protectedProcedure` (auth-only) and accepted a raw `businessId` without verifying the requesting user is a member of that business. Any authenticated user could query any business's dashboard metrics.
**Fix:** Switched to `businessMemberProcedure` which enforces membership via the existing `isBusinessMember` middleware.
**Status:** Fixed ✓

---

### [security] — `server/index.ts` (Rate Limiting)
**Issue:** The OTP verify endpoint and token refresh endpoint had no HTTP-level rate limiting. Only OTP send had application-level throttling.
**Fix:** Installed `express-rate-limit` and added:
- `otpVerifyLimiter` — 10 req / 15 min per IP on `/api/auth.emailVerify`
- `tokenRefreshLimiter` — 30 req / 15 min per IP on `/api/auth.getNewAccessToken`
**Status:** Fixed ✓

---

### [typescript] — `server/controllers/sales.ts`
**Issue:** `where: any` and `updateData: any` violated strict TypeScript.
**Fix:**
- Replaced `where: any` with a spread object typed as `Prisma.SaleInvoiceWhereInput`.
- Replaced `updateData: any` with a destructured approach using `Prisma.SaleInvoiceUpdateInput`.
**Status:** Fixed ✓

---

### [typescript] — `server/trpc/middlewares.ts`
**Issue:** `(ctx as any).userId`, `(ctx as any).isSuperAdmin` used in middleware chain.
**Fix:** Replaced with narrowed destructuring: `const { userId } = ctx as { userId?: string }`.
**Status:** Fixed ✓

---

### [logging] — server package (console → pino)
**Issue:** `console.log`, `console.error`, `console.warn` scattered throughout `controllerErrorHandler.ts`, `tokenManagement.ts`, `validateENV.ts`, `auth.ts` helpers. The project already had pino (`server/helpers/logger.ts`) but few files used it.
**Fix:** Replaced all `console.*` calls in server code with `logger.*` from pino. Removed startup `console.log` from `validateENV.ts`.
**Status:** Fixed ✓

---

### [database] — `database/models/user.prisma`
**Issue:** The `otps` table had no index on `email` (used in every OTP lookup) or `expiresAt` (used in cleanup). Also removed unused `verifiedAt` column since OTPs are now deleted on verify.
**Fix:** Added `@@index([email])` and `@@index([expiresAt])`. Removed `verifiedAt` field (replaced with delete-on-success pattern).
**Status:** Fixed ✓

---

### [database] — `database/models/business.prisma`
**Issue:** `BusinessMembership` table was missing indexes on `businessId` and `userId`. The middleware does heavy membership lookups.
**Fix:** Added `@@index([businessId])` and `@@index([userId])`.
**Status:** Fixed ✓

---

### [scaffolding] — `jobs/src/jobs/cleanupExpiredOtps.ts`
**Issue:** No cleanup job for expired OTPs existed.
**Fix:** Created `jobs/src/jobs/cleanupExpiredOtps.ts` — deletes `otp` records where `expiresAt < new Date()`.
**Status:** Fixed ✓

---

## Phase 2 — Test Suite

### Vitest workspace
**Created:** `vitest.workspace.ts`, `vitest.config.ts` (global exclude for e2e), per-package `vitest.config.ts`.
**Status:** ✓

### `@seed/schemas` unit tests — 69 tests, 100% pass
`schemas/tests/sales.test.ts`, `inventory.test.ts`, `purchase.test.ts`, `warehouse.test.ts`, `stockops.test.ts`
**Status:** ✓

### `@seed/server` unit tests — 19 tests, 100% pass
`server/tests/unit/authCrypto.test.ts`, `handlePrismaError.test.ts`, `documentNumber.test.ts`, `inventoryLedger.test.ts`
**Status:** ✓

### `web` E2E tests (Playwright) — 4 spec files
`web/tests/e2e/auth.spec.ts`, `business.spec.ts`, `dashboard.spec.ts`, `admin.spec.ts`
Run with: `cd web && pnpm test:e2e`
**Status:** ✓ (created; run separately from vitest)

---

## Total: 88 unit tests, 0 failures

(Historical: the totals above are from that pass. Current figures are in the next section.)

---

## 2026-11-23 — Pre-handover pass

Everything here was verified by running it, against Postgres 17.

### State
- `pnpm build`, `pnpm lint` (tsc on every package, ESLint on web with no warnings) and `pnpm test` pass: **28 test files, 287 tests**, including the 9 integration suites that run the real tRPC procedures against a database.
- All 10 migrations apply to an empty database and the Prisma schema matches what they build (`db:drift`, now enforced in CI). The drift check was also run against a deliberately altered database and failed as intended.
- Dependency graph above re-checked; no runtime cycles.

### [accounting] — `server/controllers/returns.ts`: purchase returns left Inventory overstated
**Issue:** `confirmPurchaseReturn` posted only the supplier leg (Dr Payables, Cr GR/IR, Cr Input GST). The stock subledger dropped but the Inventory account kept carrying the goods, and GR/IR was left with an unmatched credit.
**Fix:** added `purchaseReturnStockPosting` (Dr GR/IR, Cr Inventory) and post it in the same entry.
**Status:** Fixed ✓ — `server/tests/integration/inventoryReconciliation.test.ts`

### [accounting] — `server/controllers/stockops.ts`: stock adjustments and damage reports never posted
**Issue:** the `STOCK_ADJUSTMENT` and `DAMAGE_REPORT` journal sources, the Stock Loss account (5200) and `stockWriteOffPosting` all existed, and nothing called them. Write-offs reduced stock and left the balance sheet unchanged.
**Fix:** adjustments post a loss (Dr Stock Loss, Cr Inventory) or a gain (Dr Inventory, Cr Stock Loss, new `stockGainPosting`); damage reports post a write-off. Transfers correctly post nothing.
**Status:** Fixed ✓ — `inventoryReconciliation.test.ts`, `accounting/tests/postings.test.ts`

### [ci] — `.github/workflows/ci.yml`: migrations were never applied before the integration suites
**Issue:** CI started an empty Postgres and ran `pnpm test`, so the integration suites would have met a database with no tables. CI had never run on this work.
**Fix:** CI runs `db:deploy` and the new `db:drift` script before the tests.
**Status:** Fixed ✓ (first CI run is the PR)

### [docs] — setup instructions would not have produced a booting server
**Issue:** README asked for Node 20 / pnpm 8 (the repo needs 24 / 11) and listed environment variables that do not exist; `server/.env.example` defaulted to `DEPLOYMENT_MODE=long-running`, which refuses to boot, and omitted every GSP, Razorpay, SMS and WhatsApp variable; the project tree omitted five packages.
**Fix:** rewritten from the code; `docs/HANDOVER.md` added; `docs/MOBILE.md` and `docs/INVENTORY_MODULE.md` renamed to match the other docs.
**Status:** Fixed ✓

### [lint] — communications template pages
**Issue:** `form.watch()` cannot be memoised, so the React Compiler skipped both pages.
**Fix:** `useWatch`.
**Status:** Fixed ✓

### Known and not fixed
See [docs/HANDOVER.md](docs/HANDOVER.md#known-gaps-and-risks).
