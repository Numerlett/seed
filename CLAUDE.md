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
pnpm --filter @seed/database db:deploy    # Apply migrations (production)
pnpm --filter @seed/database db:studio    # Prisma Studio GUI
pnpm --filter @seed/database db:format    # Format Prisma schema files
```

### Code Quality
```bash
pnpm lint      # TypeScript check across all packages (tsc --noEmit)
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

CI provides a Postgres service, so they always run there.

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
| `integrations/` | `@seed/integrations` | Outbound adapters (email, sms, whatsapp, e-invoice) |

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

The backend runs in one of two modes selected by the `DEPLOYMENT_MODE` env var (`long-running` default, or `serverless`). Long-running uses Redis-backed BullMQ queues plus a separate worker process; serverless runs queueable work inline and gates scheduled features behind `longRunningOnlyProcedure`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full details.

> **`long-running` mode currently refuses to boot.** `jobs/queues.ts` defines nine queues but no `Worker` consumes them, so queued work would be accepted and silently never run. [server/index.ts](server/index.ts) exits with an explanatory error rather than dropping mail and e-invoices. Remove that guard only when a worker process exists. Production runs `serverless`.

**When adding a feature that would normally be queued** (email, sms, whatsapp, einvoice, async PDF):
- Import from [server/lib/dispatch/](server/lib/dispatch/) — never call BullMQ queues or `@seed/integrations` adapters directly from controllers/routers.
- The wrapper in `dispatch/` branches on `process.env.DEPLOYMENT_MODE`. Keep both paths working.

**For scheduled / heavy features**: use `longRunningOnlyProcedure` from [server/trpc/procedures.ts](server/trpc/procedures.ts).

**Hard rule**: `@seed/jobs` must never be statically imported from `server/`. Only [server/lib/dispatch/](server/lib/dispatch/) wrappers may dynamically `await import('@seed/jobs')`, and only inside the long-running branch. This is what keeps serverless deploys from initialising Redis.

### Tax and money

- **[@seed/tax](tax/engine.ts) is the only place GST is calculated.** Controllers must not compute tax inline — a second implementation in the sales controller is what left every GSTR filing reporting zero. Call [server/lib/tax/](server/lib/tax/), which resolves both parties' state codes and persists the breakup on both sales and purchases.
- **Money is `Decimal`, never `number`.** The tax and accounting engines take `number | string | Decimal` and return `Decimal`; convert with `.toFixed(2)` when writing to Prisma and only convert to `number` at the API boundary. `Number()` on a money value in a controller is a bug.
- Journal entries are validated by `assertPostable` from [@seed/accounting](accounting/validation.ts). Balance is checked with exact decimal equality — never a tolerance.
- The GST breakup is frozen at **confirmation**, and the invoice PDF renders those stored figures rather than recomputing — the printed document must match what was filed.

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

SEED is a full business solution targeting small and medium businesses. Current modules: business management, inventory, party (customer/supplier), sales, purchases, warehouses. New modules will be added over time — design with that extensibility in mind.

## Environment Variables

**`server/.env`** — `DATABASE_URL`, `PORT`, `NODE_ENV`, `DEPLOYMENT_MODE`, `FRONTEND_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `SMTP_*`, `AWS_*`, `GOOGLE_CLIENT_*`, `TEST_MAIL`, `TEST_OTP`, and `REDIS_URL` (long-running mode only). The authoritative list is the Zod schema in [server/helpers/validateENV.ts](server/helpers/validateENV.ts) — the server refuses to boot if it fails.

**`web/.env`** — `NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:8080`
