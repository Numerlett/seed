# SEED Test Suite Summary

## Coverage by Package

| Package        | Test Files | Tests | Pass | Coverage (Stmts) |
|----------------|------------|-------|------|-----------------|
| @seed/schemas  | 5          | 69    | 69   | 100% (schemas)  |
| @seed/server   | 4          | 19    | 19   | ~47% (helpers)  |
| web (E2E)      | 4          | 13+   | —    | — (Playwright)  |

**Total unit tests: 88 passing, 0 failing**

## Test Locations

```
schemas/tests/
  sales.test.ts        — saleInvoiceItemSchema, saleInvoiceSchema, saleInvoiceUpdateSchema, salesReturnSchema
  inventory.test.ts    — productSchema
  purchase.test.ts     — purchaseOrderSchema, grnSchema, purchaseReturnSchema
  warehouse.test.ts    — warehouseSchema, shelfSchema, productBatchSchema
  stockops.test.ts     — stockAdjustmentSchema, stockTransferSchema, damageReportSchema

server/tests/unit/
  authCrypto.test.ts        — hashOtp (SHA-256 consistency)
  handlePrismaError.test.ts — Prisma error → TRPCError mapping
  documentNumber.test.ts    — document number generation & sequencing
  inventoryLedger.test.ts   — validateStockAvailability guard

web/tests/e2e/            — Playwright (run separately with `pnpm test:e2e`)
  auth.spec.ts              — login flow, OTP, logout
  business.spec.ts          — business CRUD, selector
  dashboard.spec.ts         — page load, metric cards
  admin.spec.ts             — access control
```

## How to Run Tests

```bash
# Run all unit tests (schemas + server helpers)
pnpm test

# Run with coverage
pnpm test:coverage

# Run per-package
pnpm --filter @seed/schemas test
pnpm --filter @seed/server test

# Run E2E tests (requires running server + web dev servers)
cd web && pnpm test:e2e
```

## Known Gaps

| Area | Gap | Reason |
|------|-----|--------|
| Server routers | No integration tests hitting a real DB | Requires `TEST_DATABASE_URL` + running PostgreSQL; skipped to avoid environment coupling in CI |
| Server controllers | Partially covered via helper tests | Full controller tests require DB setup |
| Admin schemas | Not tested separately | Covered indirectly through router tests |
| E2E | Not run in CI by default | Requires both server + Next.js dev servers; add to CI when environment is stable |
| jobs / tax / accounting | No tests | Packages are scaffolds; tests should be added as each module gains real logic |

## Notes

- Unit tests mock `@seed/database` — they never hit a real database.
- Playwright E2E tests require `TEST_MAIL` + `TEST_OTP` environment variables set on the server.
- The workspace config (`vitest.workspace.ts`) runs schemas and server tests; E2E tests are excluded (run via Playwright CLI).
