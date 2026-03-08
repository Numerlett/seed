# Server Package

Express.js backend server with tRPC API for the SEED application.

## Overview

This package contains the backend server implementation, including API routes, business logic, authentication, and integrations with external services.

## Structure

```
server/
├── index.ts              # Server entry point
├── controllers/          # Business logic
│   ├── auth.ts          # Authentication
│   ├── batch.ts         # Batch operations
│   ├── business.ts      # Business management
│   ├── category.ts      # Category management
│   ├── dashboard.ts     # Dashboard data
│   ├── inventory.ts     # Inventory management
│   ├── party.ts         # Party management
│   ├── purchase.ts      # Purchase operations
│   ├── returns.ts       # Returns handling
│   ├── sales.ts         # Sales operations
│   ├── stock.ts         # Stock management
│   ├── stockops.ts      # Stock operations
│   ├── warehouse.ts     # Warehouse management
│   └── admin/           # Admin dashboard controllers
│       ├── auth.ts      # getAdminMe
│       ├── users.ts     # User management
│       ├── businesses.ts # Business management
│       ├── analytics.ts # Platform analytics
│       ├── settings.ts  # System settings
│       ├── auditLog.ts  # Audit log viewer
│       └── management.ts # Admin CRUD (super admin)
├── routers/             # tRPC routers
│   ├── index.ts         # Main router (combines all)
│   ├── auth.ts          # Auth routes
│   ├── batch.ts         # Batch routes
│   ├── business.ts      # Business routes
│   ├── category.ts      # Category routes
│   ├── dashboard.ts     # Dashboard routes
│   ├── inventory.ts     # Inventory routes
│   ├── party.ts         # Party routes
│   ├── purchase.ts      # Purchase routes
│   ├── returns.ts       # Returns routes
│   ├── s3.ts            # S3 file upload routes
│   ├── sales.ts         # Sales routes
│   ├── stock.ts         # Stock routes
│   ├── stockops.ts      # Stock operations routes
│   ├── warehouse.ts     # Warehouse routes
│   └── admin/           # Admin routes (admin.*)
│       └── index.ts     # Barrel combining sub-routers
├── trpc/                # tRPC configuration
│   ├── index.ts         # tRPC initialization
│   ├── context.ts       # Request context
│   ├── middlewares.ts   # Auth + admin middleware
│   └── procedures.ts    # Public/protected/admin procedures
├── helpers/             # Utility functions
│   ├── auth.ts          # Auth helpers (tokens, cookies)
│   ├── adminAuth.ts     # Admin audit logging
│   ├── controllerErrorHandler.ts # Standardized error handler
│   ├── documentNumber.ts # Document number generation
│   ├── googleClient.ts  # Google OAuth setup
│   ├── handlePrismaError.ts # Prisma error mapping
│   ├── index.ts         # Helper exports
│   ├── inventoryLedger.ts # Inventory ledger logic
│   ├── sendMail.ts      # Email service
│   ├── tokenManagement.ts # Token CRUD
│   ├── validateENV.ts   # Environment validation
│   ├── aws/             # AWS utilities (S3)
│   └── email-templates/ # Email HTML templates
└── types/               # TypeScript types
    ├── auth.ts
    └── s3.ts
```

## Key Features

### Authentication System

- **Email OTP**: Passwordless login with one-time codes
- **Google OAuth**: Social login integration
- **JWT Tokens**: Access and refresh token management
- **Session Management**: Multi-device support with revocation

### API Layer

- **tRPC**: Type-safe API with automatic validation
- **Zod**: Runtime input validation
- **Error Handling**: Standardized error responses
- **Rate Limiting**: Protection against abuse

### Email Service

- **Nodemailer**: SMTP email sending
- **HTML Templates**: Beautiful email designs
- **OTP Delivery**: Secure code transmission
- **Welcome Emails**: User onboarding

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/seed_db"

# Server
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT Secrets
ACCESS_TOKEN_SECRET=your_secret_here
REFRESH_TOKEN_SECRET=your_secret_here

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth.googleCallback

# Test User (dev only)
TEST_USER_EMAIL=test@example.com
TEST_USER_OTP=123456
```

## Scripts

```bash
# Development (with hot reload)
pnpm dev

# Build
pnpm build

# Production
pnpm start

# Type check
pnpm lint

# Clean
pnpm clean
```

## API Routes

### Authentication

- `auth.emailLogin` - Initiate email login
- `auth.verifyOTP` - Verify OTP code
- `auth.googleAuth` - Start Google OAuth
- `auth.googleCallback` - Handle OAuth callback
- `auth.refreshToken` - Refresh access token
- `auth.getUser` - Get current user (protected)
- `auth.updateUser` - Update user profile (protected)
- `auth.logout` - End session (protected)
- `auth.getSessions` - List active sessions (protected)
- `auth.revokeSession` - Revoke specific session (protected)
- `auth.revokeAllSessions` - Revoke all sessions (protected)

### Business

- `business.create` - Create new business (protected)
- `business.list` - List user's businesses (protected)
- `business.get` - Get specific business (protected)
- `business.update` - Update business (protected)
- `business.delete` - Delete business (protected)

### Inventory

- `inventory.addProduct` - Add product (protected)
- `inventory.getProducts` - List products (protected)
- `inventory.getProductById` - Get product (protected)
- `inventory.getProductCount` - Product count (protected)
- `inventory.updateProduct` - Update product (protected)
- `inventory.deleteProduct` - Delete product (protected)
- `inventory.bulkDeleteProducts` - Bulk delete (protected)

### Other Routes

- `category.*` - Category CRUD
- `party.*` - Party (customer/supplier) management
- `warehouse.*` - Warehouse management
- `batch.*` - Batch operations
- `stock.*` - Stock queries
- `purchase.*` - Purchase orders
- `sales.*` - Sales orders
- `returns.*` - Returns handling
- `stockops.*` - Stock operations (adjustments, transfers)
- `dashboard.*` - Dashboard data
- `s3.*` - File upload (presigned URLs)

### Admin

- `admin.auth.getAdminMe` - Get admin profile (admin)
- `admin.users.*` - User management (admin / super admin)
- `admin.businesses.*` - Business management (admin / super admin)
- `admin.analytics.*` - Platform analytics (admin)
- `admin.settings.*` - System settings (admin / super admin)
- `admin.auditLog.*` - Audit log viewer (admin)
- `admin.management.*` - Admin CRUD (super admin)

## Adding New API Endpoints

### 1. Create Controller

```typescript
// controllers/example.ts
import { protectedProcedure } from '../trpc/procedures';
import { z } from 'zod';
import { prisma } from '@seed/database';

export const exampleQuery = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    return await prisma.example.findUnique({
      where: { id: input.id },
    });
  });

export const exampleMutation = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(100),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return await prisma.example.create({
      data: {
        ...input,
        userId: ctx.userId,
      },
    });
  });
```

### 2. Create Router

```typescript
// routers/example.ts
import { t } from '../trpc';
import { exampleQuery, exampleMutation } from '../controllers/example';

export const exampleRoutes = t.router({
  query: exampleQuery,
  mutate: exampleMutation,
});
```

### 3. Register Router

```typescript
// routers/index.ts
import { exampleRoutes } from './example';

export const appRouter = t.router({
  auth: authRoutes,
  business: businessRoutes,
  example: exampleRoutes, // Add here
});
```

### 4. Use in Frontend

```tsx
'use client';
import { api } from '@seed/api/client';

export function ExampleComponent() {
  const { data } = api.example.query.useQuery({ id: 'id' });
  const mutation = api.example.mutate.useMutation();

  return <div>{data?.name}</div>;
}
```

## Middleware

### Authentication Middleware

```typescript
// trpc/middlewares.ts
export const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.accessToken) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const payload = jwt.verify(ctx.accessToken, ACCESS_TOKEN_SECRET);

  return next({
    ctx: {
      ...ctx,
      userId: payload.userId,
      userEmail: payload.email,
    },
  });
});
```

### Custom Middleware

```typescript
// Add rate limiting middleware
export const rateLimited = t.middleware(async ({ ctx, next }) => {
  // Check rate limit for user
  const key = `rate:${ctx.userId}`;
  const count = await redis.incr(key);

  if (count > 100) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded',
    });
  }

  return next();
});

// Use in procedure
export const limitedProcedure = protectedProcedure.use(rateLimited);
```

## Error Handling

### Throwing Errors

```typescript
import { TRPCError } from '@trpc/server';

// Not found
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Business not found',
});

// Unauthorized
throw new TRPCError({
  code: 'UNAUTHORIZED',
  message: 'Invalid credentials',
});

// Bad request
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid input data',
});
```

### Error Codes

- `UNAUTHORIZED`: 401 - Authentication required
- `FORBIDDEN`: 403 - Permission denied
- `NOT_FOUND`: 404 - Resource not found
- `BAD_REQUEST`: 400 - Invalid input
- `TOO_MANY_REQUESTS`: 429 - Rate limit
- `INTERNAL_SERVER_ERROR`: 500 - Server error

## Email Service

### Sending Emails

```typescript
import sendMail from './helpers/sendMail';
import otpEmailTemplate from './helpers/email-templates/otpEmailTemplate';

// Send OTP email
await sendMail({
  to: user.email,
  subject: 'Your verification code',
  html: otpEmailTemplate({
    otp: '123456',
    to: user.email,
    exp: new Date(Date.now() + 5 * 60 * 1000),
  }),
});
```

### Email Templates

Templates are in `helpers/email-templates/`:

- `otpEmailTemplate.ts` - OTP verification email
- `welcomeEmailTemplate.ts` - Welcome email for new users

Preview templates at: `http://localhost:8080/email-template?type=otp`

## Security

### Token Management

```typescript
// Generate tokens
const { accessToken, refreshToken } = generateTokens({
  userId: user.id,
  email: user.email,
});

// Set secure cookies
res.cookie('access-token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 1000, // 1 hour
});
```

### Input Validation

```typescript
// Always validate inputs with Zod
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100).trim(),
  age: z.number().int().positive().max(150)
});

// Use in procedures
.input(schema)
.mutation(async ({ input }) => {
  // input is validated and typed
});
```

## Database Access

```typescript
import { prisma } from '@seed/database';

// Queries are type-safe
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: {
    businessesOwned: true
  }
});

// Transactions for multiple operations
await prisma.$transaction([
  prisma.user.update({ where: { id }, data: { ... } }),
  prisma.business.create({ data: { ... } })
]);
```

## Testing

### Manual Testing

```bash
# Start server
pnpm dev

# Test endpoints
curl http://localhost:8080/health

# View email templates
open http://localhost:8080/email-template?type=otp
```

### Unit Tests (Future)

```typescript
import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';

describe('Auth Routes', () => {
  it('should create user with email', async () => {
    const caller = appRouter.createCaller({
      /* context */
    });
    const result = await caller.auth.emailLogin({
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });
});
```

## Deployment

### Production Build

```bash
# Build TypeScript
pnpm build

# Start production server
NODE_ENV=production pnpm start
```

### Docker

```bash
# Build image
docker build -t seed-server -f Dockerfile.server .

# Run container
docker run -d -p 8080:8080 --env-file server/.env seed-server
```

## Troubleshooting

### Server Won't Start

```bash
# Check port availability
lsof -i :8080

# Verify environment variables
cat server/.env

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Email Not Sending

```bash
# Test SMTP credentials
# Use Gmail App Password, not regular password
# Enable 2FA and generate App Password at:
# https://myaccount.google.com/apppasswords
```

## Documentation

- [tRPC Server](https://trpc.io/docs/server/introduction)
- [Express.js](https://expressjs.com/)
- [Nodemailer](https://nodemailer.com/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
