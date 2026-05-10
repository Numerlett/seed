# SEED - Smart Retail Management System

SEED is a modern, full-stack retail management system that helps businesses track sales, manage inventory, monitor expenses, and make data-driven decisions—all in one clean, efficient dashboard.

## 🏗️ Architecture Overview

SEED is built as a **monorepo** using **pnpm workspaces**, with clear separation between frontend, backend, API layer, and database packages.

### Technology Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS, Radix UI, Framer Motion
- **Backend**: Express.js, tRPC for type-safe APIs
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with refresh token rotation
- **Email**: Nodemailer with custom templates
- **OAuth**: Google OAuth 2.0 integration
- **Type Safety**: TypeScript throughout the entire stack
- **Containerization**: Docker support for server deployment
- **Deployment modes**: `long-running` (Redis + BullMQ workers) or `serverless` (no Redis, no workers, scheduled features disabled). Selected via `DEPLOYMENT_MODE` env. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#deployment-modes).

---

## 📁 Project Structure

```
seed/
├── api/                    # tRPC client & server exports
│   ├── client.ts          # tRPC client configuration
│   ├── server.ts          # Server-side tRPC utilities
│   ├── Provider.tsx       # React Query + tRPC provider
│   └── types.ts           # Shared API types
│
├── database/              # Database layer with Prisma
│   ├── schema.prisma      # Base schema (generator + datasource)
│   ├── prisma.config.ts   # Prisma config (env loading)
│   ├── models/            # Multi-file Prisma schema
│   │   ├── user.prisma    # User, Auth, Admin, AuditLog, SystemSetting
│   │   ├── business.prisma # Business model
│   │   ├── product.prisma # Product model
│   │   ├── inventory.prisma # Inventory models
│   │   ├── sales.prisma   # Sales models
│   │   ├── purchase.prisma # Purchase models
│   │   ├── warehouse.prisma # Warehouse model
│   │   ├── party.prisma   # Party model
│   │   └── stockops.prisma # Stock operations
│   ├── migrations/        # Migration history
│   ├── generated/         # Generated Prisma Client
│   ├── seed-admin.ts      # CLI to bootstrap admin users
│   ├── client.ts          # Prisma client instance
│   └── index.ts           # Database exports
│
├── server/                # Backend Express + tRPC server
│   ├── index.ts           # Server entry point
│   ├── controllers/       # Business logic
│   │   ├── auth.ts        # Authentication
│   │   ├── batch.ts       # Batch operations
│   │   ├── business.ts    # Business management
│   │   ├── category.ts    # Category management
│   │   ├── dashboard.ts   # Dashboard data
│   │   ├── inventory.ts   # Inventory management
│   │   ├── party.ts       # Party management
│   │   ├── purchase.ts    # Purchase operations
│   │   ├── returns.ts     # Returns handling
│   │   ├── sales.ts       # Sales operations
│   │   ├── stock.ts       # Stock management
│   │   ├── stockops.ts    # Stock operations
│   │   ├── warehouse.ts   # Warehouse management
│   │   └── admin/         # Admin dashboard controllers
│   │       ├── auth.ts    # Admin auth (getAdminMe)
│   │       ├── users.ts   # User management
│   │       ├── businesses.ts # Business management
│   │       ├── analytics.ts  # Platform analytics
│   │       ├── settings.ts   # System settings
│   │       ├── auditLog.ts   # Audit log viewer
│   │       └── management.ts # Admin CRUD (super admin)
│   ├── routers/           # tRPC router definitions
│   │   ├── auth.ts        # Auth routes
│   │   ├── batch.ts       # Batch routes
│   │   ├── business.ts    # Business routes
│   │   ├── category.ts    # Category routes
│   │   ├── dashboard.ts   # Dashboard routes
│   │   ├── inventory.ts   # Inventory routes
│   │   ├── party.ts       # Party routes
│   │   ├── purchase.ts    # Purchase routes
│   │   ├── returns.ts     # Returns routes
│   │   ├── s3.ts          # S3 file upload routes
│   │   ├── sales.ts       # Sales routes
│   │   ├── stock.ts       # Stock routes
│   │   ├── stockops.ts    # Stock operations routes
│   │   ├── warehouse.ts   # Warehouse routes
│   │   ├── index.ts       # Root router
│   │   └── admin/         # Admin routes (admin.*)
│   │       └── index.ts   # Barrel combining sub-routers
│   ├── trpc/              # tRPC setup
│   │   ├── index.ts       # tRPC initialization
│   │   ├── context.ts     # Request context
│   │   ├── middlewares.ts # Auth + admin middleware
│   │   └── procedures.ts  # Public/protected/admin procedures
│   ├── helpers/           # Utility functions
│   │   ├── auth.ts        # Auth utilities
│   │   ├── adminAuth.ts   # Admin audit logging
│   │   ├── controllerErrorHandler.ts # Error handler
│   │   ├── documentNumber.ts # Doc number generation
│   │   ├── googleClient.ts # Google OAuth setup
│   │   ├── handlePrismaError.ts # Prisma error mapping
│   │   ├── index.ts       # Helper exports
│   │   ├── inventoryLedger.ts # Inventory ledger logic
│   │   ├── sendMail.ts    # Email service
│   │   ├── tokenManagement.ts # Token handling
│   │   ├── validateENV.ts # Env validation
│   │   ├── aws/           # AWS utilities
│   │   └── email-templates/ # Email HTML templates
│   └── types/             # Backend TypeScript types
│
└── web/                   # Next.js frontend application
    ├── app/               # Next.js App Router
    │   ├── (auth)/        # Auth route group
    │   │   ├── login/     # Login page
    │   │   └── auth/      # OTP verification
    │   ├── (main)/        # Protected routes
    │   │   ├── dashboard/ # Dashboard page
    │   │   └── businesses/ # Business management
    │   ├── (admin)/       # Admin dashboard route group
    │   │   └── admin/     # Admin pages
    │   │       ├── page.tsx       # Dashboard overview
    │   │       ├── users/         # User management
    │   │       ├── businesses/    # Business management
    │   │       ├── analytics/     # Platform analytics
    │   │       ├── audit-log/     # Audit log viewer
    │   │       ├── settings/      # System settings
    │   │       └── admins/        # Admin management
    │   └── (public)/      # Public routes
    │       └── page.tsx   # Landing page
    ├── components/        # React components
    │   ├── ui/            # Radix UI primitives (shadcn)
    │   ├── admin/         # Admin panel components
    │   │   ├── AdminGuard.tsx  # Auth + admin access gate
    │   │   ├── AdminNavBar.tsx # Sidebar navigation
    │   │   └── AdminHeader.tsx # Top header bar
    │   ├── animations/    # Animation components
    │   ├── auth/          # Auth components
    │   ├── batches/       # Batch components
    │   ├── dashboard/     # Dashboard widgets
    │   ├── home/          # Landing page sections
    │   ├── inventory/     # Inventory components
    │   ├── main/          # Main layout components
    │   ├── parties/       # Party components
    │   ├── profile/       # Profile components
    │   ├── purchases/     # Purchase components
    │   ├── returns/       # Returns components
    │   ├── sales/         # Sales components
    │   ├── shared/        # Shared components
    │   ├── stock/         # Stock components
    │   ├── stockops/      # Stock operations components
    │   └── warehouses/    # Warehouse components
    ├── providers/         # React context providers
    │   ├── AdminProvider.tsx    # Admin context (role, status)
    │   ├── BusinessProvider.tsx # Business context
    │   ├── CategoriesProvider.tsx # Categories context
    │   ├── DataProvider.tsx     # Data provider
    │   ├── SessionProvider.tsx  # Auth session
    │   ├── ThemeProvider.tsx    # Dark/Light mode
    │   └── TRPCProvider.tsx    # API client
    ├── auth/              # Auth utilities
    ├── hooks/             # Custom React hooks
    └── lib/               # Utilities and helpers
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

- **Node.js**: v20 or higher
- **pnpm**: v8 or higher (install with `npm install -g pnpm`)
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

   **Server (`server/.env`):**

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/seed_db"

   # Server
   PORT=8080
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000

   # JWT Secrets (generate with: openssl rand -base64 32)
   ACCESS_TOKEN_SECRET=your_access_token_secret
   REFRESH_TOKEN_SECRET=your_refresh_token_secret

   # Email (SMTP)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=noreply@yourdomain.com

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth.googleCallback

   # Test User (development only)
   TEST_USER_EMAIL=test@example.com
   TEST_USER_OTP=123456
   ```

   **Web (`web/.env.local`):**

   ```env
   NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:8080
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma Client
   pnpm --filter @seed/database db:generate

   # Run migrations
   pnpm --filter @seed/database db:migrate

   # (Optional) Open Prisma Studio to view data
   pnpm --filter @seed/database db:studio
   ```

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
pnpm lint     # Lint all packages
```

### Database Package

```bash
pnpm --filter @seed/database db:generate  # Generate Prisma Client
pnpm --filter @seed/database db:migrate   # Run migrations
pnpm --filter @seed/database db:deploy    # Deploy migrations (production)
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

- Reset database (dev only): `pnpm --filter @seed/database db:migrate reset`
- Check migration status: Check `database/migrations/`

### Type errors

- Regenerate Prisma Client: `pnpm --filter @seed/database db:generate`
- Rebuild packages: `pnpm build`

---

## 📧 Contact

For questions or support, contact the development team.
