# SEED Audit Log

## Dependency Graph (verified)

```
web          → api, schemas
api          → server (type-only import for AppRouter via devDependency)
server       → database, schemas, jobs, tax, accounting
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
