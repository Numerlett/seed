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
```

### Docker
```bash
docker build -t seed-server -f Dockerfile.server .
docker run -d -p 8080:8080 --name seed-server --env-file server/.env seed-server
```

## Architecture

SEED is a **pnpm monorepo** with five workspace packages:

| Package | Name | Purpose |
|---------|------|---------|
| `database/` | `@seed/database` | Prisma ORM, client, migrations |
| `schemas/` | `@seed/schemas` | Shared Zod validation schemas |
| `api/` | `@seed/api` | tRPC client config and React Query provider |
| `server/` | `@seed/server` | Express + tRPC backend |
| `web/` | `web` | Next.js 16 frontend |

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

**`server/.env`** — `DATABASE_URL`, `PORT`, `NODE_ENV`, `FRONTEND_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `EMAIL_*`, `GOOGLE_CLIENT_*`, `TEST_USER_EMAIL`, `TEST_USER_OTP`

**`web/.env.local`** — `NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:8080`

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes � gives risk-scored analysis |
| `get_review_context` | Need source snippets for review � token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
