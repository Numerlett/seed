# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev                          # Start all packages in parallel (server :8080, web :3000)
pnpm --filter @seed/server dev    # Server only (tsx watch)
pnpm --filter web dev             # Web only (Next.js)
```

### Build & Production
```bash
pnpm build                        # Build all packages
pnpm start                        # Start all in production mode
pnpm --filter @seed/server build  # Compile server TypeScript
pnpm --filter web build           # Build Next.js app
```

### Database
```bash
pnpm --filter @seed/database db:generate  # Regenerate Prisma Client (run after schema changes)
pnpm --filter @seed/database db:migrate   # Create and apply migration (dev)
pnpm --filter @seed/database db:deploy    # Apply migrations (production; also what CI and Fly's release_command run)
pnpm --filter @seed/database db:drift     # Fail if the Prisma schema differs from what the migrations build (CI runs it)
pnpm --filter @seed/database db:studio    # Prisma Studio GUI
pnpm --filter @seed/database db:format    # Format Prisma schema files
```

### Code Quality
```bash
pnpm lint      # tsc --noEmit on every package; ESLint on web (web's types are checked by pnpm build)
pnpm format    # Prettier with Tailwind plugin
pnpm test      # Vitest across server, schemas, tax, accounting
```

### Tests

Unit suites (`server`, `schemas`, `tax`, `accounting`) mock the database and run anywhere.

Integration suites under `server/tests/integration/` run the real tRPC procedures against a real Postgres. They **skip themselves** when no database is configured, so `pnpm test` stays green without one. To run them, point `TEST_DATABASE_URL` at a scratch database — never your dev database, since the fixtures create and delete rows:

```bash
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/seed_test" \
  pnpm --filter @seed/database db:deploy   # apply migrations once
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/seed_test" pnpm test
```

CI provides a Postgres service, applies every migration to it (`db:deploy`) and runs `db:drift` before `pnpm test`, so they always run there against the real schema. The integration setup falls back to `DATABASE_URL` when `TEST_DATABASE_URL` is unset (that is how CI wires it), so never export a dev `DATABASE_URL` in the shell you run tests from. [inventoryReconciliation.test.ts](server/tests/integration/inventoryReconciliation.test.ts) is the one to extend whenever you add a stock-moving path.

### Docker
```bash
docker build -t seed-server -f Dockerfile.server .
docker run -d -p 8080:8080 --name seed-server --env-file server/.env seed-server
```

## Architecture

SEED is a **pnpm monorepo** with eleven workspace packages:

| Package | Name | Purpose |
|---------|------|---------|
| `database/` | `@seed/database` | Prisma ORM, client, migrations |
| `schemas/` | `@seed/schemas` | Shared Zod validation schemas |
| `api/` | `@seed/api` | tRPC client config and React Query provider |
| `server/` | `@seed/server` | Express + tRPC backend |
| `web/` | `@seed/web` | Next.js 16 frontend |
| `mobile/` | `mobile` | Expo / React Native app |
| `tax/` | `@seed/tax` | GST engine — the single source of truth for tax math |
| `accounting/` | `@seed/accounting` | Double-entry postings and journal validation |
| `jobs/` | `@seed/jobs` | BullMQ queue definitions (no workers yet — see below) |
| `pdf/` | `@seed/pdf` | Invoice PDF templates |
| `integrations/` | `@seed/integrations` | Outbound adapters (email, sms, whatsapp, e-invoice, Razorpay) and `config.ts`, which detects credentials |

### Request Lifecycle

```
Next.js Component
  → tRPC client (api/client.ts, uses SuperJSON transformer)
  → HTTP POST to Express server (:8080)
  → tRPC router (server/routers/index.ts)
  → Procedure middleware chain (auth → business membership check)
  → Controller function
  → Prisma → PostgreSQL
```

### tRPC Procedure Tiers

Defined in [server/trpc/procedures.ts](server/trpc/procedures.ts):

- `publicProcedure` — no auth
- `protectedProcedure` — JWT required (`isAuthed` middleware)
- `businessMemberProcedure` — auth + business membership; **input must include `businessId: string`**; adds `businessId` and `memberRole` to context
- `adminProcedure` — auth + admin role; adds `adminId` and `isSuperAdmin` to context
- `superAdminProcedure` — auth + super admin only
- `longRunningOnlyProcedure` — throws `NOT_IMPLEMENTED` when `DEPLOYMENT_MODE=serverless`. Use for features that require BullMQ workers or scheduled jobs (recurring invoices, stock alerts, payment reminders, large reports).

### Deployment Modes

The backend runs in one of two modes selected by the `DEPLOYMENT_MODE` env var (`serverless` or `long-running`; the schema default is `long-running`, which does not boot yet, so `server/.env.example` ships `serverless`). Long-running uses Redis-backed BullMQ queues plus a separate worker process; serverless runs queueable work inline and gates scheduled features behind `longRunningOnlyProcedure`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full details.

> **`long-running` mode currently refuses to boot.** `jobs/queues.ts` defines nine queues but no `Worker` consumes them, so queued work would be accepted and silently never run. [server/index.ts](server/index.ts) exits with an explanatory error rather than dropping mail and e-invoices. Remove that guard only when a worker process exists. Production runs `serverless`.

**When adding a feature that would normally be queued** (email, sms, whatsapp, einvoice, async PDF, payment links):
- Import from [server/lib/dispatch/](server/lib/dispatch/) — never call BullMQ queues or `@seed/integrations` adapters directly from controllers/routers.
- The wrapper in `dispatch/` branches on `process.env.DEPLOYMENT_MODE`. Keep both paths working.
- Every dispatch wrapper calls `assertIntegrationConfigured` first, so a feature whose credentials are absent fails immediately with `IntegrationNotConfiguredError` instead of firing a request with empty credentials. `handleControllerError` maps that to `PRECONDITION_FAILED`.

### Unconfigured integrations must fail, not pretend

An integration with no credentials must refuse before it writes anything. The rule exists because `generateIrn` used to create an `EInvoice` row with `status: PENDING` and return without ever calling the IRP — the UI reported success for an invoice that was never filed, and no code path could advance it. Likewise `renderAndLog` wrote a `MessageLog` and sent nothing.

- Ask [integrations/config.ts](integrations/config.ts) whether credentials exist. Add a new integration's requirements there.
- Never persist a row whose only route to a terminal state is a call that cannot be made.
- The frontend reads `system.getIntegrationStatus` and disables the control (`IntegrationGate` in [web/components/main/IntegrationGate.tsx](web/components/main/IntegrationGate.tsx)) rather than letting the user press a button that can only fail.

**For scheduled / heavy features**: use `longRunningOnlyProcedure` from [server/trpc/procedures.ts](server/trpc/procedures.ts).

**Hard rule**: `@seed/jobs` must never be statically imported from `server/`. Only [server/lib/dispatch/](server/lib/dispatch/) wrappers may dynamically `await import('@seed/jobs')`, and only inside the long-running branch. This is what keeps serverless deploys from initialising Redis.

### Tax and money

- **[@seed/tax](tax/engine.ts) is the only place GST is calculated.** Controllers must not compute tax inline — a second implementation in the sales controller is what left every GSTR filing reporting zero. Call [server/lib/tax/](server/lib/tax/), which resolves both parties' state codes and persists the breakup on both sales and purchases.
- **Money is `Decimal`, never `number`.** The tax and accounting engines take `number | string | Decimal` and return `Decimal`; convert with `.toFixed(2)` when writing to Prisma and only convert to `number` at the API boundary. `Number()` on a money value in a controller is a bug.
- **Money is never summed in JavaScript floats.** Use `sumBy` / `sumMoney` / `toMoneyNumber` from [@seed/accounting](accounting/money.ts) and convert once, at the return statement. Reports and GST returns used to accumulate with `Number(x) + Number(y)`, which is how a trial balance lands on 33329.999999999996 and a GSTR-1 files a figure a paisa off the invoices behind it. Prefer a SQL `aggregate`/`groupBy` where the shape allows it.
- **Report date ranges are inclusive of their last day.** Use `inclusiveRange` / `endOfDay` from [server/helpers/dateRange.ts](server/helpers/dateRange.ts). Clients build bounds from `YYYY-MM-DD`, which parses to midnight, so a bare `lte` silently drops everything that happened on the closing day.
- Journal entries are validated by `assertPostable` from [@seed/accounting](accounting/validation.ts). Balance is checked with exact decimal equality — never a tolerance.
- **Every money movement posts.** Sale invoices, purchase orders and GRNs, sales and purchase returns, payments, stock adjustments and damage write-offs all write a journal entry inside the transaction that persists the document. Payments were one gap (receipts recorded nothing, so collected receivables stayed on the balance sheet forever); stock adjustments, damage and the stock leg of purchase returns were another (stock left the subledger but the Inventory account kept carrying it). Transfers post nothing, correctly: Inventory is one account for the whole business.
- **The Inventory account equals the stock subledger.** After any stock movement the balance of account 1200 must equal the sum of `InventoryStock.currentValue`, to the penny. A new stock-moving path needs a matching posting *and* a step in [inventoryReconciliation.test.ts](server/tests/integration/inventoryReconciliation.test.ts), which asserts exactly this after every kind of movement. Each document balancing on its own proves nothing here; only comparing the account with the subledger shows the drift.
- **Document numbers are unique per business, never globally.** `@@unique([businessId, documentNumber])`. `Payment` had a global unique, which made the second business on the instance unable to record its own `RCP-0001`.
- Settlement figures (`amountPaid`, `amountDue`, `paymentStatus`) are derived by summing `PaymentAllocation`, not incremented — that repairs rows written before the figures were maintained instead of compounding the gap.
- The GST breakup is frozen at **confirmation**, and the invoice PDF renders those stored figures rather than recomputing — the printed document must match what was filed.
- **The balance sheet must balance.** `getBalanceSheet` derives current-period earnings from the income and expense accounts and reports them inside equity; it returns `difference` and `balanced` so a broken ledger is visible rather than silently rendered. There are no closing entries and no period locking.

### Stock is valued at weighted average

- **Outbound movements cost stock at `InventoryStock.currentValue / currentQuantity`**, resolved by `resolveOutboundCost` in [server/helpers/inventoryLedger.ts](server/helpers/inventoryLedger.ts) inside the caller's transaction. Never use `Product.costPrice` for an issue: no receipt updates it, so value went in at the purchase price and came out at a number typed once when the product was created.
- Every issue path except a purchase return — sale, transfer, adjustment, damage — goes through it, and the same figure feeds the ledger entry, the `currentValue` decrement and the posting (COGS for a sale, Stock Loss for adjustments and damage). A transfer uses the source cost for both legs so moving stock cannot revalue it.
- **A purchase return is the deliberate exception.** It reverses a specific receipt and the supplier credits the price that receipt was invoiced at, so stock leaves at the unit price on the return line and the posting books Inventory at that same figure (`purchaseReturnStockPosting`) alongside the supplier leg (`purchaseReturnPosting`). Costing it at the average would leave a price difference with nowhere to post. Known limitation: purchase-line discounts are not carried into GRN valuation; see [docs/HANDOVER.md](docs/HANDOVER.md#known-gaps-and-risks).
- **A sale posts its cost.** `saleInvoicePosting` takes `costOfGoods` and adds COGS Dr / Inventory Cr. Without it inventory only ever grew and gross profit was the entire sale value.
- A sales return restores stock at the cost frozen on the invoice line it credits, not at today's average.
- `CostingMethod` has one value. FIFO was offered and implemented nowhere; do not add it back to the enum before it works.

### Concurrency

- **Lock before read-then-write on stock.** Call `lockProductsForUpdate` at the top of any transaction that issues stock. Availability checks and the weighted average are both reads that a concurrent transaction can invalidate; at READ COMMITTED two confirmations otherwise both pass and both deduct.
- **Document numbers come from `withDocumentNumber`**, which retries when another request claims the number first. Numbering reads the current maximum and adds one, which a double-clicked submit is enough to race. Retrying rather than using a counter keeps the sequence gapless, which GST expects of invoice serials.
- Scope deletes in the statement that performs them (`deleteMany({ where: { id, businessId } })`), not in a preceding read.

### Authentication

OTP-based email login (no passwords):
1. Email submitted → 6-digit OTP generated, stored in DB (5 min TTL, 5 attempt max)
2. OTP verified → access token (1h, HTTP-only cookie) + refresh token (7d, stored in DB)
3. Token rotation on refresh; `isAuthed` middleware verifies JWT on every protected request

Google OAuth is also supported via `server/helpers/googleClient.ts`.

### Database Schema

Multi-file Prisma schema in `database/models/`. Each `.prisma` file is a domain model. After any schema change, run `db:generate` then `db:migrate`.

### Frontend Structure

Next.js App Router with route groups:
- `(auth)/` — login, OTP verification (unauthenticated)
- `(main)/` — dashboard, businesses (requires user auth)
- `(admin)/admin/` — admin panel (requires admin role, guarded by `AdminGuard.tsx`)
- `(public)/` — landing page

Context providers in `web/providers/` wrap the app: `TRPCProvider` → `SessionProvider` → `BusinessProvider` → `AdminProvider`.

### Shared Schemas

`@seed/schemas` contains Zod schemas used for input validation in both routers (server) and forms (web). Always define schemas here when they're needed on both sides.

## Development Rules

- **Always run `pnpm build` from the root directory after every change or iteration** to verify the full project compiles cleanly before considering a task done.
- **Keep `docs/` and `README.md` in sync with the current state of the project.** Any time a module, API, schema, or flow is added or changed, update the relevant docs in the same PR/commit.

## Project Purpose

SEED is a full business solution targeting small and medium businesses. Current modules: business management, inventory, parties (customer/supplier), warehouses, sales, purchases, returns, stock operations, GST/tax, accounting, payments, communications, reports, CRM, manufacturing and an admin panel on web, with a mobile app covering the core. New modules will be added over time — design with that extensibility in mind.

## Not built

Named here so the roadmap stops implying otherwise. None of these exist in any
form; do not assume a partial implementation is hiding somewhere.

- **POS** — no server module, no router, no page.
- **BullMQ workers** — [jobs/queues.ts](jobs/queues.ts) defines nine queues and nothing consumes any of them. This is why `long-running` mode refuses to boot.
- **Recurring invoices, stock alerts, payment reminders** — queues exist, no producers and no consumers. `longRunningOnlyProcedure` is defined and used nowhere.
- **Mobile beyond the core** — eleven modules are placeholder screens behind `mobile/app/module/[key].tsx`.
- **A live e-invoicing run** — implemented and tested against recorded IRP responses, never executed against a real GSP. See [docs/EINVOICE_GO_LIVE.md](docs/EINVOICE_GO_LIVE.md).
- **Browser end-to-end tests in CI** — four Playwright specs exist in `web/tests/e2e/` and no job runs them.
- **A shared rate-limit store** — the tRPC limiter is a per-process `Map` ([server/trpc/rateLimit.ts](server/trpc/rateLimit.ts)); production is serverless, so limits do not aggregate across instances.
- **Period locking and closing entries** — see the balance-sheet rule above.

Known gaps, open decisions and the prioritised backlog live in [docs/HANDOVER.md](docs/HANDOVER.md).

## Environment Variables

**`server/.env`** — `DATABASE_URL`, `PORT`, `NODE_ENV`, `DEPLOYMENT_MODE`, `FRONTEND_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `SMTP_*`, `AWS_*`, `GOOGLE_CLIENT_*`, `TEST_MAIL`, `TEST_OTP`, and `REDIS_URL` (long-running mode only). The authoritative list is the Zod schema in [server/helpers/validateENV.ts](server/helpers/validateENV.ts) — the server refuses to boot if it fails.

Optional integration settings are never required — absence disables the feature rather than blocking boot. `EMAIL_PROVIDER`, `RESEND_*`, `SMS_PROVIDER`, `WHATSAPP_PROVIDER`, `GSP_*` and `RAZORPAY_*` are format-checked in that schema; the `MSG91_*`, `TWILIO_*` and `GUPSHUP_*` credentials are only read at call time through [integrations/config.ts](integrations/config.ts). (`SMTP_*` is required by the schema even when `EMAIL_PROVIDER=resend`.) The one exception: Razorpay keys without `RAZORPAY_WEBHOOK_SECRET` refuse to boot, because paid links could never be reconciled. Which variables each integration needs lives in [integrations/config.ts](integrations/config.ts).

**`web/.env`** — `NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:8080`
