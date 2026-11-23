# SEED - Smart Retail Management System

SEED is a modern, full-stack retail management system that helps businesses track sales, manage inventory, monitor expenses, and make data-driven decisions—all in one clean, efficient dashboard.

> **Picking this project up?** Start with [docs/HANDOVER.md](docs/HANDOVER.md): the current state, how to run and
> verify it, the decisions that were made, the known gaps and a prioritised backlog.

## 🏗️ Architecture Overview

SEED is built as a **monorepo** using **pnpm workspaces**, with clear separation between frontend, backend, API layer, and database packages.

### Technology Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS, Radix UI, Framer Motion
- **Mobile**: React Native (Expo SDK 56), Expo Router, NativeWind — shares the same backend, `@seed/api` types, and `@seed/schemas` (full guide: [docs/MOBILE.md](docs/MOBILE.md))
- **Backend**: Express.js, tRPC for type-safe APIs
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with refresh token rotation
- **Email**: Nodemailer with custom templates
- **OAuth**: Google OAuth 2.0 integration
- **Type Safety**: TypeScript throughout the entire stack
- **Containerization**: Docker support for server deployment
- **Deployment modes**: `long-running` (Redis + BullMQ workers) or `serverless` (no Redis, no workers, scheduled features disabled). Selected via `DEPLOYMENT_MODE` env. `long-running` currently refuses to boot because no worker consumes the queues — deploy `serverless`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#deployment-modes).
- **Tax and money**: [@seed/tax](tax/engine.ts) is the only place GST is computed; money is `Decimal` end to end, never `number`. The GST breakup is frozen at confirmation and the invoice PDF renders the stored figures, so the printed document matches what was filed.

---

## 📁 Project Structure

```
seed/
├── accounting/      # @seed/accounting: double-entry postings, journal validation, exact-decimal money helpers
├── api/             # @seed/api: tRPC client config and React Query provider (types come from the server)
├── database/        # @seed/database: Prisma schema (models/*.prisma), migrations/, client, seed-admin.ts
├── integrations/    # @seed/integrations: outbound adapters (email, SMS, WhatsApp, GSP e-invoicing, Razorpay)
│                    #   and config.ts, which detects whether each one has credentials
├── jobs/            # @seed/jobs: BullMQ queue definitions (no workers yet)
├── mobile/          # Expo / React Native app, see mobile/README.md
├── pdf/             # @seed/pdf: invoice PDF template
├── schemas/         # @seed/schemas: Zod schemas shared by server routers and web forms
├── tax/             # @seed/tax: GST engine, the only place GST is calculated
│
├── server/          # @seed/server: Express + tRPC backend
│   ├── index.ts         # entry point: env validation, rate limits, webhooks, graceful shutdown
│   ├── controllers/     # core modules: auth, business, inventory, category, party, warehouse, batch,
│   │                    #   stock, stockops, purchase, sales, returns, dashboard, admin/
│   ├── modules/         # newer domain modules (controllers + routers): tax, accounting, payments,
│   │                    #   communications, reports, crm, manufacturing
│   ├── routers/         # tRPC routers for the core modules; routers/index.ts mounts everything
│   ├── lib/             # shared server logic: dispatch/ (queueable work), tax/, accounting/ (postJournalEntry),
│   │                    #   einvoice/, payments/ (Razorpay webhook), pdf/
│   ├── helpers/         # inventoryLedger.ts, documentNumber.ts, dateRange.ts, auth, mail, env validation
│   ├── trpc/            # procedure tiers, middlewares, context, rate limiting
│   └── tests/           # unit/ (mocked DB), integration/ (real Postgres), fixtures/
│
├── web/             # Next.js 16 frontend
│   ├── app/             # App Router: (auth), (main) one folder per module, (admin), (public)
│   ├── components/      # ui/ (shadcn primitives) and per-module components
│   ├── providers/       # TRPC, Session, Business, Admin, Theme
│   └── tests/e2e/       # Playwright specs (not run in CI)
│
├── docs/            # project documentation, start with HANDOVER.md
├── scripts/         # server-docker.sh
├── AUDIT.md         # dated audit log
├── CLAUDE.md        # rules and invariants (written for Claude Code, a good summary for people too)
├── Dockerfile.server, fly.toml   # server container and Fly.io deployment
└── vitest.workspace.ts           # one vitest run across server (unit + integration), schemas, tax, accounting
```

---

## 🔄 Application Flow

### 1. Authentication Flow

```
User enters email → OTP sent to email → User verifies OTP →
Tokens issued (access + refresh) → User authenticated
```

**Detailed Steps:**

1. User submits email on login page
2. Server generates 6-digit OTP and stores in database with expiration (5 mins)
3. OTP email sent using Nodemailer
4. User enters OTP on verification page
5. Server validates OTP (max 5 attempts)
6. On success:
   - Access token (1h) issued as HTTP-only cookie
   - Refresh token (7d) stored in database with device info
   - User redirected to dashboard

**OAuth Flow (Google):**

1. User clicks "Sign in with Google"
2. Redirect to Google consent screen
3. Google returns authorization code
4. Server exchanges code for user profile
5. User created/updated in database
6. Tokens issued and user authenticated

### 2. Token Refresh Flow

```
Access token expires → Client detects 401 →
Refresh endpoint called → New tokens issued → Request retried
```

### 3. Data Flow

```
Frontend Component → tRPC Client →
HTTP Request → Express Server → tRPC Router →
Controller → Prisma → PostgreSQL →
Response back through chain
```

**Type Safety:**

- Input validation with Zod schemas
- TypeScript inference from tRPC procedures
- Prisma-generated types for database models
- End-to-end type safety from DB to UI

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v24 or higher (`engines` in the root `package.json`; CI runs 24)
- **pnpm**: v11, pinned by `packageManager` in the root `package.json` (`corepack enable` picks it up)
- **PostgreSQL**: v14 or higher (running instance)
- **Git**: For cloning the repository

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd seed
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy the examples and fill them in. They are the authoritative, commented lists:

   ```bash
   cp server/.env.example server/.env
   cp web/.env.example web/.env
   cp mobile/.env.example mobile/.env   # only if you work on the mobile app
   ```

   The server validates its environment with the Zod schema in
   [server/helpers/validateENV.ts](server/helpers/validateENV.ts) and refuses to
   boot if it fails, naming the variable. These are required:

   | Variable | Notes |
   | --- | --- |
   | `PORT`, `FRONTEND_URL` | e.g. `8080` and `http://localhost:3000` (`FRONTEND_URL` is the CORS allow-list, comma-separated) |
   | `DATABASE_URL` | Your local Postgres, e.g. `postgresql://user:pass@localhost:5432/seed` |
   | `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` | At least 32 characters each (`openssl rand -base64 48`) |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Required by the schema; placeholders work if you do not use Google login |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_MAIL` | Mail for OTP login. Required even when `EMAIL_PROVIDER=resend` |
   | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` | S3 uploads (product images) |
   | `DEPLOYMENT_MODE` | Set `serverless` (the example does). The schema default, `long-running`, refuses to boot until BullMQ workers exist |

   `TEST_MAIL` and `TEST_OTP` are development-only: they let one address log in
   with a fixed OTP, so you do not need working mail locally.

   SMS, WhatsApp, e-invoicing (GSP) and Razorpay are optional and ship commented
   out in `server/.env.example`. Absent credentials disable the feature instead of
   blocking boot.

   `web/.env` needs `NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:8080` and an
   `ACCESS_TOKEN_SECRET` equal to the server's, because Next.js middleware
   verifies the JWT.

4. **Set up the database**

   ```bash
   # Create an empty database first (for example: createdb seed), then apply every migration
   pnpm --filter @seed/database db:deploy

   # (Optional) Open Prisma Studio to view data
   pnpm --filter @seed/database db:studio
   ```

   `db:deploy` brings a database up to date and never creates anything. Use
   `db:migrate` only when you have changed a model in `database/models/` and want
   Prisma to generate a new migration (see [Database Changes](#database-changes)).
   The Prisma client is generated by `pnpm build` (step 5).

   To make yourself an admin, log in once, then run
   `cd database && npx tsx seed-admin.ts <your-email> --super`.

5. **Build packages**
   ```bash
   pnpm build
   ```

### Running the Application

#### Development Mode

Start all services in parallel:

```bash
pnpm dev
```

This starts:

- **Server**: http://localhost:8080
- **Web**: http://localhost:3000

Or run individually:

```bash
# Server only
pnpm --filter @seed/server dev

# Web only
pnpm --filter web dev
```

#### Production Mode

```bash
# Build all packages
pnpm build

# Start in production
pnpm start
```

---

## 🐳 Docker Deployment

### Build and Run Server

```bash
# Build the Docker image
docker build -t seed-server -f Dockerfile.server .

# Stop and remove existing container (if any)
docker stop seed && docker rm seed

# Run the container
docker run -d -p 8080:8080 --name seed --env-file server/.env seed-server

# View logs
docker logs -f seed
```

### Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: seed_user
      POSTGRES_PASSWORD: seed_password
      POSTGRES_DB: seed_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  server:
    build:
      context: .
      dockerfile: Dockerfile.server
    ports:
      - '8080:8080'
    env_file:
      - server/.env
    depends_on:
      - postgres

volumes:
  postgres_data:
```

Run with:

```bash
docker-compose up -d
```

---

## 📦 Package Scripts

### Root Level

```bash
pnpm dev      # Start all packages in dev mode
pnpm build    # Build all packages
pnpm start    # Start all packages in production
pnpm clean    # Clean build artifacts
pnpm lint     # tsc --noEmit on every package; ESLint on web (web types are checked by `pnpm build`)
pnpm test     # Vitest: unit suites, plus the integration suites when a test database is configured
```

### Database Package

```bash
pnpm --filter @seed/database db:generate  # Generate Prisma Client
pnpm --filter @seed/database db:migrate   # Create a new migration from model changes (dev only)
pnpm --filter @seed/database db:deploy    # Apply all pending migrations (what CI and Fly run)
pnpm --filter @seed/database db:drift     # Fail if the schema differs from what the migrations build
pnpm --filter @seed/database db:studio    # Open Prisma Studio
```

### Schemas Package

```bash
pnpm --filter @seed/schemas build    # Build TypeScript for schemas
pnpm --filter @seed/schemas clean    # Clean build artifacts
pnpm --filter @seed/schemas lint     # Lint schemas package
```

### Server Package

```bash
pnpm --filter @seed/server dev      # Start dev server with watch mode
pnpm --filter @seed/server build    # Build TypeScript
pnpm --filter @seed/server start    # Start production server
```

### Web Package

```bash
pnpm --filter web dev       # Start Next.js dev server
pnpm --filter web build     # Build Next.js app
pnpm --filter web start     # Start production server
```

---

## 🔑 Key Features Implementation

### Authentication System

- **Email OTP**: Passwordless authentication with 6-digit OTP
- **Google OAuth**: One-click social login
- **JWT Tokens**: Short-lived access tokens (1h) + long-lived refresh tokens (7d)
- **Token Rotation**: Automatic refresh token rotation for security
- **Session Management**: Multi-device support with session revocation

### Admin Dashboard

- **Shared Auth**: Admin uses the same login as regular users (no separate auth flow)
- **Role-Based Access**: Two-tier role system — Admin and Super Admin
- **User Management**: List, search, view details, and delete platform users
- **Business Management**: Browse and manage all businesses on the platform
- **Platform Analytics**: User/business growth charts and top businesses
- **Audit Logging**: Track admin actions with filters and pagination
- **System Settings**: Key-value store for platform configuration (super admin)
- **Admin Management**: Promote/demote, activate/deactivate admins (super admin)
- **Seed Script**: CLI tool to bootstrap the first admin (`database/seed-admin.ts`)

### Business Management

- Create and manage multiple businesses per user
- Business profiles with logo, contact info, and description
- Owner-based access control

### Type-Safe API Layer

- **tRPC**: End-to-end type safety without code generation
- **Zod**: Runtime validation with TypeScript inference
- **React Query**: Automatic caching and state management

### Email System

- HTML email templates using React components
- Welcome emails for new users
- OTP delivery with expiration countdown
- Template preview endpoint for development
- Delivery goes through `server/lib/dispatch`, so it is inline in serverless
  mode and queued in long-running mode without the caller knowing

### Accounting and Inventory Accuracy

- **Money never passes through a JavaScript float.** Reports, GST returns and
  the financial statements accumulate in `Decimal` via
  [accounting/money.ts](accounting/money.ts) and convert once at the API
  boundary.
- **Stock is valued at weighted average.** An issue costs stock at
  `currentValue / currentQuantity` at the moment it leaves, and the same figure
  feeds the inventory ledger, the stock valuation and the COGS posting — so
  gross profit is revenue less what the goods actually cost.
- **The balance sheet balances.** Current-period earnings are computed from the
  income and expense accounts and reported within equity; the response carries
  `difference` and `balanced` so a broken ledger is visible rather than quietly
  rendered.
- **Concurrent movements are serialised.** Confirming a document that issues
  stock locks the products first, so two simultaneous confirmations cannot both
  spend the same units, and document numbers retry rather than colliding.

### Outbound Integrations

Email, SMS, WhatsApp, e-invoicing (GSP) and online payments (Razorpay) are all
optional. Each is detected from the environment at runtime by
[integrations/config.ts](integrations/config.ts):

- **Configured** — the feature works normally.
- **Not configured** — the call fails immediately with `PRECONDITION_FAILED`
  naming the missing variables, and the UI disables the control after reading
  `system.getIntegrationStatus`. Nothing is written that cannot be completed.

E-invoicing registers a confirmed invoice with the IRP and stores the returned
IRN, acknowledgement and signed QR; the payload is built from the GST figures
frozen at confirmation, so what is filed matches what was printed. E-way bills
are raised against an existing IRN.

Online payments create a hosted Razorpay link for the outstanding balance of a
confirmed invoice. `POST /webhooks/razorpay` verifies the HMAC signature with a
timing-safe comparison, then records the receipt, settles the invoice and posts
to the ledger. Settlement is idempotent, so the retries gateways send cannot
record the same money twice.

---

## 🛠️ Development Tips

### Database Changes

When modifying the schema:

```bash
# 1. Edit models in database/models/ (e.g., user.prisma)
# 2. Create migration
pnpm --filter @seed/database db:migrate
# 3. Regenerate client
pnpm --filter @seed/database db:generate
```

- Commit the model change and its migration together. CI applies every migration to an empty Postgres and then runs
  `db:drift`, which fails if the schema describes anything the migrations do not build.
- Never edit a migration that has been applied anywhere. Add a new one.
- Prisma has no down migrations. Take a backup before deploying to a database that holds real data.
- `database/prisma.config.ts` loads `server/.env`, so a bare Prisma command targets your **dev** database. When you
  mean a scratch database, set `DATABASE_URL` explicitly on the command.

### Adding New API Routes

1. Create controller in `server/controllers/`
2. Define tRPC procedures
3. Add to router in `server/routers/`
4. Use in frontend with full type safety:

```tsx
const { data } = api.yourRoute.useQuery();
```

### Working with Schemas

The `@seed/schemas` package contains all Zod schemas for input validation and type inference. To update or add schemas:

1. Edit or add files in `schemas/` (e.g., `schemas/inventory.ts`)
2. Rebuild the package:

```bash
pnpm --filter @seed/schemas build
```

3. Import and use schemas in backend or frontend:

```typescript
import { productSchema } from '@seed/schemas';
```

### Environment Variables

- Never commit `.env` files
- Update `.env.example` when adding new variables
- Use `process.env.VARIABLE` in server
- Use `NEXT_PUBLIC_` prefix for client-side variables

### Testing

```bash
pnpm test      # unit suites; the integration suites skip themselves without a database
```

The integration suites (`server/tests/integration/`) run the real tRPC procedures against a real Postgres and
**create and delete rows**, so point them at a throwaway database, never your dev one. With Docker:

```bash
docker run --rm -d --name seed-test-db -p 55432:5432 \
  -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=seed_test postgres:17-alpine
export TEST_DATABASE_URL=postgresql://postgres@localhost:55432/seed_test
DATABASE_URL=$TEST_DATABASE_URL pnpm --filter @seed/database db:deploy   # apply migrations once
pnpm test
```

(PowerShell: `$env:TEST_DATABASE_URL = "..."`.) Without a Docker daemon, any local Postgres works the same way.
The suites that matter most: `inventoryReconciliation` (the Inventory account must equal the stock subledger after
every kind of movement), `fullJourney` and `ledgerPosting` (the books balance), `invoiceGst` (tax frozen at
confirmation) and `stockConcurrency`.

### Testing Email Templates

Visit: `http://localhost:8080/email-template?type=otp` or `?type=welcome`

---

## 🔒 Security Considerations

- Access tokens stored in HTTP-only cookies (XSS protection)
- Refresh tokens stored in database (can be revoked)
- CORS configured for specific frontend origin
- Rate limiting on OTP requests (1 per minute)
- OTP attempts limited to 5 before invalidation
- Password-less authentication reduces attack surface
- JWT secrets should be strong and unique

---

## 📝 Database Schema

### Users

- Stores user profiles and authentication info
- Links to businesses they own
- Tracks refresh tokens

### Businesses

- Business information and settings
- One-to-many relationship with owner (User)
- Unique constraint on owner + business name

### OTP

- Temporary OTP codes for authentication
- Automatic expiration (5 minutes)
- Attempt tracking and verification status

### RefreshToken

- Long-lived tokens for session management
- Device/client information tracking
- Revocation support

### Admin

- Links to User via `userId` FK (shared auth model)
- Tracks `isSuperAdmin` and `isActive` status
- One-to-one relation with User

### AuditLog

- Records admin actions (action, entity, entityId, details)
- References the Admin who performed the action
- Immutable append-only log

### SystemSetting

- Key-value store for platform-wide configuration
- JSON `value` field supports any data type
- Managed by super admins only

---

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes with clear commits
3. Ensure types are correct: `pnpm lint`
4. Test locally
5. Submit pull request

---

## 📄 License

ISC

---

## 🆘 Troubleshooting

### Server won't start

- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify all required environment variables are set

### Build errors

- Clear build artifacts: `pnpm clean`
- Remove node_modules: `rm -rf node_modules */node_modules`
- Reinstall: `pnpm install`

### Database migration issues

- Reset database (**destroys all data**, scratch databases only): `DATABASE_URL=<scratch url> pnpm --filter @seed/database exec prisma migrate reset`
- Check migration status: Check `database/migrations/`

### Type errors

- Regenerate Prisma Client: `pnpm --filter @seed/database db:generate`
- Rebuild packages: `pnpm build`

---

## 📧 Contact

For questions or support, contact the development team.
