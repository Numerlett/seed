# Handover

Prepared 2026-11-23. Read this first if you are taking over SEED. It covers the state of the code, how to run and verify
it, what was decided and why, what is known to be missing or risky, and what to build next.

The rules every change must respect are in [CLAUDE.md](../CLAUDE.md). That file is written for Claude Code, but it is
also the most compact statement of the codebase's invariants, so read it too.

## State on handover

| | |
| --- | --- |
| Code | All of it is on `main`, merged through [PR #1](https://github.com/Numerlett/seed/pull/1) (`fix/gst-breakup-and-platform-hardening`) |
| Build | `pnpm build` passes |
| Lint | `pnpm lint` passes: `tsc --noEmit` on every package, ESLint on web with no warnings |
| Tests | 287 tests in 28 files pass, including the 9 integration suites, run against Postgres 17 |
| Migrations | All 10 apply to an empty database, and the Prisma schema matches what they build (`db:drift`) |
| CI | Applies migrations, checks drift, then builds, lints and tests; green on PR #1 |
| Production | The server runs `serverless` on Fly (see [DEPLOYMENT.md](DEPLOYMENT.md)). This work has **not been deployed**: the next deploy applies nine migrations |

**Not verified:** anything against a live provider (GSP/IRP, Razorpay, email, SMS, WhatsApp), the Playwright specs,
the mobile app on a device, and production data.

### What PR #1 contains

- GST breakup computed by `@seed/tax`, persisted on every sales and purchase document and frozen at confirmation;
  returns are filed as credit and debit notes; money is `Decimal` end to end.
- Every document posts to the ledger: sales (with COGS), purchase orders, GRNs, sales and purchase returns, payments,
  stock adjustments and damage write-offs. The balance sheet reports `balanced` / `difference`.
- Weighted-average costing for outbound stock. FIFO was removed because it was never implemented.
- Concurrency: product rows are locked before stock is issued, and document numbers retry on collision.
- E-invoicing and e-way bills call the GSP (tested against recorded IRP responses); a rejection stores the reason.
- Razorpay payment links, with a signature-verified, idempotent webhook that settles the invoice and posts.
- Integrations without credentials refuse before writing anything; the UI disables the control.
- Payment numbers unique per business; payment allocations have real foreign keys.
- Invoice PDF download, SQL-side aggregation for reports, a health check that probes the database, CI.
- Pre-handover pass: postings for purchase returns, stock adjustments and damage; CI migrations and drift check;
  `.env.example`, README and docs corrected against the code. Details in [AUDIT.md](../AUDIT.md).

## Get it running

Prerequisites: Node 24+, pnpm 11 (`corepack enable`), PostgreSQL 14+.

```bash
pnpm install
cp server/.env.example server/.env    # fill in; DEPLOYMENT_MODE=serverless is already set
cp web/.env.example web/.env          # ACCESS_TOKEN_SECRET must equal the server's
createdb seed                         # or any empty database that DATABASE_URL points at
pnpm --filter @seed/database db:deploy
pnpm build                            # generates the Prisma client and every package's dist/
pnpm dev                              # server :8080, web :3000
```

Log in with `TEST_MAIL` / `TEST_OTP` from `server/.env` to skip email. To make yourself an admin, log in once, then run
`cd database && npx tsx seed-admin.ts <your-email> --super`. The README's Getting Started section lists every required
variable.

## Verify it yourself

The integration suites create and delete rows, so give them a throwaway database:

```bash
docker run --rm -d --name seed-test-db -p 55432:5432 \
  -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=seed_test postgres:17-alpine
export TEST_DATABASE_URL=postgresql://postgres@localhost:55432/seed_test
DATABASE_URL=$TEST_DATABASE_URL pnpm --filter @seed/database db:deploy
DATABASE_URL=$TEST_DATABASE_URL pnpm --filter @seed/database db:drift    # expect "No difference detected"
pnpm build && pnpm lint && pnpm test                                      # expect 287 passing
```

Without Docker, any spare Postgres works. This handover was verified on Windows with a disposable cluster made from the
installed PostgreSQL binaries (`initdb -D <dir> -U postgres -A trust`, then `pg_ctl -D <dir> -o "-p 55432" -l <log> start`).

Two traps:

- `database/prisma.config.ts` loads `server/.env`. A Prisma command without `DATABASE_URL` set on it targets your
  **dev** database.
- The integration setup falls back to `DATABASE_URL` when `TEST_DATABASE_URL` is unset (CI relies on that). Never run
  `pnpm test` from a shell with a dev `DATABASE_URL` exported.

## How the system fits together

Packages and the request lifecycle: [CLAUDE.md](../CLAUDE.md#architecture) and [ARCHITECTURE.md](ARCHITECTURE.md).
Internal dependencies (no runtime cycles):

```
web, mobile          → api, schemas
api                  → server (types only)
server               → accounting, database, integrations, jobs, pdf, schemas, tax
accounting, jobs, tax → database
pdf                  → schemas
```

| Concern | Where |
| --- | --- |
| GST maths | [tax/engine.ts](../tax/engine.ts), always called through [server/lib/tax/](../server/lib/tax/) |
| What each document posts | [accounting/postings.ts](../accounting/postings.ts) |
| Writing a journal entry | [server/lib/accounting/post.ts](../server/lib/accounting/post.ts) (`postJournalEntry`, idempotent per document) |
| Stock movements and costing | [server/helpers/inventoryLedger.ts](../server/helpers/inventoryLedger.ts) |
| Document numbers | [server/helpers/documentNumber.ts](../server/helpers/documentNumber.ts) |
| Outbound integrations | [integrations/](../integrations/), reached only through [server/lib/dispatch/](../server/lib/dispatch/) |
| Razorpay webhook | [server/lib/payments/](../server/lib/payments/), mounted at `POST /webhooks/razorpay` |
| Environment validation | [server/helpers/validateENV.ts](../server/helpers/validateENV.ts) |

## The invariants and the tests that hold them

Integration suites live in [server/tests/integration/](../server/tests/integration/).

| Invariant | Suites |
| --- | --- |
| The books balance after any sequence of documents | `fullJourney`, `ledgerPosting` (and `assertBooksBalance` wherever a suite posts) |
| The Inventory account equals the stock subledger after every kind of movement | `inventoryReconciliation` |
| Outbound stock is costed at weighted average | `inventoryValuation` |
| GST is computed once and frozen at confirmation | `invoiceGst`, plus the engine and property tests in `tax/tests/` |
| Concurrent confirmations cannot oversell | `stockConcurrency` |
| Settlement is derived from allocations; a replayed webhook records nothing twice | `paymentSettlement`, `razorpayWebhook` |
| E-invoice filing against recorded IRP responses | `einvoiceFiling` |

## Database and migrations

| Migration | What it does |
| --- | --- |
| `20260510125245_init` | Initial schema (the only migration on `main`) |
| `20260822090000_invoice_gst_breakup` | GST breakup columns on sale invoices |
| `20260823090000_purchase_gst_breakup` | GST breakup on purchases |
| `20260823140000_return_gst_breakup` | GST breakup on returns |
| `20260823160000_journal_source_purchase_order` | Adds the `PURCHASE_ORDER` journal source |
| `20260902100000_einvoice_failure_reason` | Records why the IRP rejected a document |
| `20260902110000_payment_number_per_business` | Payment numbers unique per business, not globally |
| `20260902120000_payment_links` | `payment_links` table for Razorpay |
| `20260904100000_costing_weighted_average_only` | Removes FIFO; FIFO businesses become weighted average |
| `20260905090000_payment_allocation_foreign_keys` | Real foreign keys; detaches allocations pointing at deleted documents |

Fly runs `db:deploy` as its `release_command`, so the next deploy applies every pending migration. Follow
[DEPLOYMENT.md → Before the next deploy](DEPLOYMENT.md#before-the-next-deploy-the-2026-hardening-migrations) first
(`main` held only `init` until this work landed, so check what production actually has):
check `prisma migrate status`, back up, count the allocations the last migration will detach.

Rules: commit a model change and its migration together; never edit a migration that has been applied anywhere;
create new ones with `db:migrate` against a dev database. CI fails if the schema and the migrations disagree.

## Decisions that were made

These are deliberate and can be revisited.

1. **Weighted average is the only costing method.** FIFO was in the enum and implemented nowhere. Add it back only
   with an implementation.
2. **Purchase returns leave stock at the price on the return line, not the average.** A return reverses a specific
   receipt and the supplier credits that receipt's price. Costing it at the average would need a price-variance account.
3. **Stock gains and losses share one account, Stock Loss (5200).** Shortfalls and damage debit it, count surpluses
   credit it, so net shrinkage is one figure.
4. **Transfers post nothing**, because Inventory is one account per business. If the GL ever tracks inventory per
   warehouse, transfers will need postings.
5. **Unconfigured integrations refuse up front** and the UI disables the control. No row is written that can only be
   completed by a call that cannot be made.
6. **`serverless` is the only bootable mode** until a worker process exists. `long-running` exits at boot instead of
   silently dropping queued work.
7. **Settlement figures are derived** by summing allocations, never incremented.
8. **Document numbers retry on collision** instead of using a counter, so GST invoice series stay gapless.

## Known gaps and risks

Ordered by how likely they are to hurt.

1. **Historical books may not reconcile.** Purchase returns, stock adjustments and damage reports confirmed before the
   pre-handover pass changed stock without moving the Inventory account correctly. The fix applies from now on. On any
   database holding real data, run the query in [Reconcile historical books](#reconcile-historical-books) and post a
   manual journal for any difference after finding the documents behind it.
2. **Purchase-line discounts are not carried into stock valuation.** A purchase order posts its taxable value net of
   the line discount, but a GRN line carries its own `unitPrice` and stock enters at that price, so a discounted order
   can leave a residual in GR/IR clearing and inventory valued above cost. A purchase return takes its tax from the
   order (net) but relieves stock at the gross line price. No test uses a non-zero discount.
3. **Nothing has run against a live provider.** GSP/IRP (see [EINVOICE_GO_LIVE.md](EINVOICE_GO_LIVE.md)), Razorpay
   (test mode first; register the webhook and set `RAZORPAY_WEBHOOK_SECRET`), email, SMS and WhatsApp.
4. **Rate limits do not hold across instances.** The tRPC limiter is a per-process `Map`
   ([server/trpc/rateLimit.ts](../server/trpc/rateLimit.ts)) and production is serverless. OTP attempts are capped in
   the database, so guessing an OTP is still bounded.
5. **Untested areas.** Reports, CRM, manufacturing and communications have no tests. Web has no component tests, and
   its four Playwright specs are not run in CI. Mobile has no tests.
6. **`long-running` cannot boot, and it is the schema default.** Set `DEPLOYMENT_MODE=serverless` explicitly in every
   environment.
7. **Configuration foot-guns.** `prisma.config.ts` falls back to a hard-coded local URL and loads `server/.env`. The
   env schema requires `SMTP_*` even when `EMAIL_PROVIDER=resend`.
8. **Accounting has no period locking or closing entries.** GSTR-1 and GSTR-3B are previews built from stored figures.
9. **Mobile:** 11 of 21 modules are placeholder screens.

### Reconcile historical books

Lists every business whose Inventory account (1200) disagrees with its stock subledger:

```sql
SELECT b.id AS "businessId", b.name,
       COALESCE(s.value, 0)   AS "stockSubledger",
       COALESCE(g.balance, 0) AS "inventoryAccount",
       COALESCE(g.balance, 0) - COALESCE(s.value, 0) AS "difference"
FROM businesses b
LEFT JOIN (
  SELECT p."businessId", SUM(st."currentValue") AS value
  FROM inventory_stock st JOIN products p ON p.id = st."productId"
  GROUP BY p."businessId"
) s ON s."businessId" = b.id
LEFT JOIN (
  SELECT a."businessId", SUM(l.debit - l.credit) AS balance
  FROM journal_lines l JOIN chart_of_accounts a ON a.id = l."accountId"
  WHERE a.code = '1200'
  GROUP BY a."businessId"
) g ON g."businessId" = b.id
WHERE ABS(COALESCE(g.balance, 0) - COALESCE(s.value, 0)) > 0.05
ORDER BY ABS(COALESCE(g.balance, 0) - COALESCE(s.value, 0)) DESC;
```

## Backlog

In suggested order.

1. **Deploy what is on `main`.** It is merged but not deployed. Follow DEPLOYMENT.md's "Before the next deploy" first.
2. **Reconcile production books** with the query above, if the database holds real data.
3. **Purchase discounts** (gap 2): default GRN prices from the order's net price, then add discounted cases to
   `inventoryReconciliation`.
4. **BullMQ worker process.** Consumers for the nine queues in [jobs/queues.ts](../jobs/queues.ts), calling the same
   adapters the serverless branch of `server/lib/dispatch/` calls. Then remove the boot guard in `server/index.ts`.
5. **Scheduled features** on the worker: recurring invoices, stock alerts, payment reminders, behind
   `longRunningOnlyProcedure`.
6. **Go live with integrations**, GSP sandbox first, then Razorpay test mode.
7. **Tests** for reports, CRM, manufacturing and communications (copy the fixture pattern in
   `inventoryReconciliation.test.ts`), and a CI job for the Playwright specs.
8. **Shared rate-limit store** (Redis or Postgres).
9. **POS.** Nothing exists yet; it will sit on `sales` and the stock ledger.
10. **Mobile modules.** 11 placeholders behind `mobile/app/module/[key].tsx`; their backends already exist.
11. **Period locking and closing entries.**

## Suggested walkthrough (about an hour)

1. **Run it** (10 min): Get it running and Verify it yourself, live.
2. **Architecture** (10 min): CLAUDE.md's Architecture section; follow one request from a web page to Prisma.
3. **Money** (15 min): a sale from `createSaleInvoice` to `confirmSaleInvoice`, through `server/lib/tax`,
   `inventoryLedger.ts` and `postings.ts`. Then read `fullJourney.test.ts` top to bottom.
4. **Stock** (10 min): `inventoryReconciliation.test.ts` and decision 2.
5. **Integrations** (5 min): `integrations/config.ts`, one dispatch wrapper, `IntegrationGate`.
6. **Database, deploy, backlog** (10 min): the last sections of this document.

## First-day checklist

- [ ] `pnpm install`, `pnpm build` and `pnpm dev` work, and you can log in
- [ ] The integration suites pass against your own scratch database (287 tests)
- [ ] You have read CLAUDE.md and this document's Known gaps
- [ ] Access: the GitHub repo, the Fly app, the production database and its backups, provider dashboards, and the
      production environment values (shared through a password manager, never the repository)
