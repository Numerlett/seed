# Architecture Documentation

## Overview

SEED follows a monorepo architecture with clear separation of concerns across multiple packages. This document details the architectural decisions, patterns, and best practices used throughout the codebase.

---

## Design Principles

1. **Type Safety First**: End-to-end TypeScript with runtime validation
2. **Separation of Concerns**: Clear boundaries between layers
3. **Code Reusability**: Shared packages for common functionality
4. **Developer Experience**: Hot reload, type inference, and clear error messages
5. **Security by Default**: HTTP-only cookies, CORS, token rotation

---

## Monorepo Structure

### Why Monorepo?

- **Shared Code**: Common types and utilities across packages
- **Atomic Changes**: Update multiple packages in single commit
- **Simplified Dependencies**: Internal packages with workspace protocol
- **Consistent Tooling**: Single TypeScript/Prettier config

### Package Dependencies

```
web → api → server → database
      ↓
   @trpc/react-query
```

- **web**: Depends on `api` for tRPC client
- **api**: Depends on `server` for router types
- **server**: Depends on `database` for Prisma client
- **database**: Standalone package with Prisma schema

---

## Layer Responsibilities

### Database Layer (`@seed/database`)

**Purpose**: Data access layer with Prisma ORM

**Responsibilities:**

- Define database schema in Prisma
- Generate type-safe Prisma Client
- Handle migrations
- Export database client instance

**Key Files:**

- `prisma/schema.prisma`: Database schema definition
- `client.ts`: Prisma client singleton
- `generated/`: Auto-generated Prisma Client

**Best Practices:**

- Always use transactions for multi-step operations
- Use Prisma relations for data fetching
- Avoid N+1 queries with `include` and `select`

```typescript
// Good: Single query with relations
const user = await prisma.user.findUnique({
  where: { id },
  include: { businessesOwned: true },
});

// Bad: N+1 queries
const user = await prisma.user.findUnique({ where: { id } });
const businesses = await prisma.business.findMany({ where: { ownerId: id } });
```

---

### Server Layer (`@seed/server`)

**Purpose**: Business logic and API endpoints

**Architecture:**

```
Express App
  ↓
tRPC Middleware
  ↓
Context Creation (auth tokens, request/response)
  ↓
Router (routes to procedures)
  ↓
Procedures (public/protected)
  ↓
Controllers (business logic)
  ↓
Database queries
```

**Components:**

#### 1. Controllers (`controllers/`)

Business logic implementation. Each controller exports tRPC procedures.

```typescript
export const getUser = protectedProcedure.query(async ({ ctx }) => {
  return await prisma.user.findUnique({
    where: { id: ctx.userId },
  });
});
```

#### 2. Routers (`routers/`)

Organize related procedures into namespaces.

```typescript
export const authRoutes = t.router({
  getUser,
  updateUser,
  emailLogin,
  // ...
});
```

#### 3. Context (`trpc/context.ts`)

Extract request information for procedures.

- Extracts access token from cookie or header
- Makes request/response available to procedures
- Tracks auth source for logging

#### 4. Middlewares (`trpc/middlewares.ts`)

Request preprocessing and authorization.

```typescript
export const isAuthed = t.middleware(async ({ ctx, next }) => {
  // Verify JWT token
  // Attach userId to context
  // Throw if invalid
});
```

#### 5. Procedures (`trpc/procedures.ts`)

Procedure types with different access levels.

- `publicProcedure`: No authentication required
- `protectedProcedure`: Requires valid access token
- `adminProcedure`: Requires authentication + active admin record
- `superAdminProcedure`: Requires authentication + active super admin record

#### 6. Helpers (`helpers/`)

Utility functions:

- `auth.ts`: Token generation, cookie options
- `adminAuth.ts`: Audit log creation for admin actions
- `tokenManagement.ts`: Refresh token CRUD
- `sendMail.ts`: Email service wrapper
- `googleClient.ts`: OAuth 2.0 setup
- `validateENV.ts`: Environment validation

---

### API Layer (`@seed/api`)

**Purpose**: tRPC client configuration and React integration

**Exports:**

- `@seed/api`: Re-exports tRPC client utilities
- `@seed/api/client`: Vanilla tRPC client
- `@seed/api/server`: Server-side helpers
- `@seed/api/provider`: React Query provider
- `@seed/api/types`: Type utilities

**Client Setup:**

```typescript
const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: SERVER_URL + '/api',
      fetch: customFetch, // With credentials
    }),
  ],
  transformer: SuperJSON,
});
```

**Provider:**
Wraps app in React Query + tRPC provider for hooks:

```tsx
<TRPCProvider>
  <App />
</TRPCProvider>
```

---

### Web Layer (`web/`)

**Purpose**: Next.js frontend application

**Architecture:**

#### App Router Structure (`app/`)

```
app/
├── (auth)/        # Authentication flows
│   ├── login/     # Email entry
│   └── auth/      # OTP verification
├── (main)/        # Protected dashboard
│   ├── dashboard/
│   └── businesses/
├── (admin)/       # Admin dashboard
│   └── admin/
│       ├── page.tsx       # Overview stats
│       ├── users/         # User management
│       ├── businesses/    # Business management
│       ├── analytics/     # Growth charts + top businesses
│       ├── audit-log/     # Admin action audit trail
│       ├── settings/      # System settings (super admin)
│       └── admins/        # Admin management (super admin)
└── (public)/      # Public landing page
```

**Route Groups:**

- `(auth)`: No layout, auth-only pages
- `(main)`: Dashboard layout with navigation
- `(admin)`: Admin layout with sidebar, header, and admin guard
- `(public)`: Public layout with header/footer

#### Component Organization

```
components/
├── ui/            # Shadcn/Radix primitives
├── admin/         # Admin dashboard components
├── animations/    # Animation components
├── auth/          # Authentication UI
├── batches/       # Batch components
├── dashboard/     # Dashboard widgets
├── home/          # Landing page sections
├── inventory/     # Inventory components
├── main/          # Main layout components
├── parties/       # Party components
├── profile/       # Profile components
├── purchases/     # Purchase components
├── returns/       # Returns components
├── sales/         # Sales components
├── shared/        # Shared/reusable components
├── stock/         # Stock components
├── stockops/      # Stock operations components
└── warehouses/    # Warehouse components
```

**Component Patterns:**

- Use `"use client"` only when necessary (state, effects, browser APIs)
- Prefer Server Components for static content
- Co-locate components with their features

#### Providers (`providers/`)

**TRPCProvider:**

- Initializes React Query client
- Creates tRPC client with links
- Handles server health checks

**SessionProvider:**

- Manages authentication state
- Provides user context
- Handles token refresh

**ThemeProvider:**

- Dark/light mode toggle
- Persists preference in localStorage

**BusinessProvider:**

- Current business context
- Business switching logic

**CategoriesProvider:**

- Category data for the active business
- Used by inventory and product components

**DataProvider:**

- Shared data context for cross-component data

**AdminProvider:**

- Calls `admin.auth.getAdminMe` to verify admin status
- Provides `admin`, `isSuperAdmin`, and `isLoading` via React context
- Used by `AdminGuard` and all admin pages to gate access

#### Auth Guard (`auth/AuthGuard.tsx`)

Protects routes from unauthenticated access:

```tsx
<AuthGuard requireAuth>
  <ProtectedPage />
</AuthGuard>
```

#### Admin Guard (`components/admin/AdminGuard.tsx`)

Gates the admin panel with three checks:

1. Session must be `authenticated` (via `SessionProvider`)
2. `AdminProvider` must return an active admin record
3. Shows appropriate UI for unauthenticated, forbidden, or loading states

---

## Data Flow Patterns

### 1. Query Pattern (Read Data)

```
Component
  ↓ useQuery hook
tRPC Client
  ↓ HTTP GET
Server Router
  ↓ Call procedure
Controller
  ↓ Prisma query
Database
  ↓ Return data
Component (auto-updates with cache)
```

**Example:**

```tsx
// Component
const { data: user } = api.auth.getUser.useQuery();

// Controller
export const getUser = protectedProcedure.query(async ({ ctx }) => {
  return await prisma.user.findUnique({
    where: { id: ctx.userId },
  });
});
```

### 2. Mutation Pattern (Write Data)

```
Component
  ↓ useMutation hook
tRPC Client
  ↓ HTTP POST
Server Router
  ↓ Call procedure
Controller (validate input)
  ↓ Prisma mutation
Database
  ↓ Return result
Component (invalidate queries)
```

**Example:**

```tsx
// Component
const updateUser = api.auth.updateUser.useMutation({
  onSuccess: () => {
    utils.auth.getUser.invalidate(); // Refetch user
  },
});

// Controller
export const updateUser = protectedProcedure
  .input(z.object({ name: z.string() }))
  .mutation(async ({ input: { name }, ctx }) => {
    return await prisma.user.update({
      where: { id: ctx.userId },
      data: { name },
    });
  });
```

### 3. Authentication Flow

```
Login Page (email entry)
  ↓ emailLogin mutation
Server (generate OTP, send email)
  ↓ Success response
OTP Page
  ↓ verifyOTP mutation
Server (validate OTP)
  ↓ Generate tokens
  ↓ Set HTTP-only cookies
  ↓ Return success
Client (redirect to dashboard)
```

### 4. Token Refresh Flow

```
API Request (expired token)
  ↓ 401 Unauthorized
tRPC Client (error interceptor)
  ↓ Call refresh endpoint
Server (verify refresh token)
  ↓ Generate new tokens
  ↓ Update cookies
Client (retry original request)
```

---

## Security Architecture

### Token Strategy

**Access Token:**

- Short-lived (1 hour)
- Stored in HTTP-only cookie
- Used for API authentication
- Contains: userId, email, expiry

**Refresh Token:**

- Long-lived (7 days)
- Stored in database + HTTP-only cookie
- Used only for token refresh
- Contains: userId, tokenId, expiry
- Can be revoked

### Authentication Middleware

```typescript
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.accessToken) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  try {
    const payload = jwt.verify(ctx.accessToken, ACCESS_SECRET);
    return next({
      ctx: {
        ...ctx,
        userId: payload.userId,
      },
    });
  } catch (error) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
});
```

### CORS Configuration

```typescript
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true, // Allow cookies
});
```

---

## Error Handling

### tRPC Error Codes

```typescript
throw new TRPCError({
  code: 'UNAUTHORIZED', // 401
  message: 'User-friendly message',
});
```

**Common codes:**

- `UNAUTHORIZED`: 401 - Invalid/missing auth
- `FORBIDDEN`: 403 - Valid auth, insufficient permissions
- `NOT_FOUND`: 404 - Resource doesn't exist
- `BAD_REQUEST`: 400 - Invalid input
- `TOO_MANY_REQUESTS`: 429 - Rate limit exceeded
- `INTERNAL_SERVER_ERROR`: 500 - Server error

### Client-Side Error Handling

```tsx
const mutation = api.auth.login.useMutation({
  onError: (error) => {
    if (error.data?.code === 'TOO_MANY_REQUESTS') {
      toast.error('Please wait before trying again');
    }
  },
});
```

---

## Performance Optimization

### 1. React Query Caching

```tsx
// Cache for 5 minutes, stale after 1 minute
const { data } = api.auth.getUser.useQuery(undefined, {
  staleTime: 1000 * 60,
  cacheTime: 1000 * 60 * 5,
});
```

### 2. Batching Requests

tRPC automatically batches requests made within 10ms:

```tsx
// Single HTTP request with both queries
const user = api.auth.getUser.useQuery();
const businesses = api.business.list.useQuery();
```

### 3. Optimistic Updates

```tsx
const utils = api.useUtils();

const updateBusiness = api.business.update.useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await utils.business.get.cancel();

    // Snapshot previous value
    const previous = utils.business.get.getData();

    // Optimistically update
    utils.business.get.setData(undefined, newData);

    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    utils.business.get.setData(undefined, context.previous);
  },
});
```

### 4. Database Optimization

```typescript
// Use select to fetch only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true
    // Don't fetch unused fields
  }
});

// Use indexes for frequent queries
@@index([email])
@@index([ownerId, name])
```

---

## Testing Strategy

### Unit Tests

- Test pure functions in `helpers/`
- Test utility functions
- Mock Prisma client

### Integration Tests

- Test tRPC procedures
- Test authentication flow
- Test database operations

### E2E Tests

- Test complete user flows
- Test across all layers
- Use real database (isolated)

---

## Deployment Architecture

### Production Setup

```
Internet
  ↓
Load Balancer / CDN (Vercel/Cloudflare)
  ↓
Next.js Frontend (Vercel)
  ↓ API Calls
Express Backend (Docker/Cloud Run)
  ↓
PostgreSQL Database (Managed Service)
```

### Environment Separation

- **Development**: Local Postgres, local servers
- **Staging**: Cloud Postgres, test domain
- **Production**: Managed Postgres, production domain

---

## Future Enhancements

### Planned Features

- WebSocket support for real-time updates
- Redis caching layer
- Background job processing (Bull/BullMQ)
- Multi-tenancy support
- Business-level role-based access control (RBAC)
- API versioning

### Scalability Considerations

- Database read replicas
- Horizontal scaling with load balancer
- CDN for static assets
- Microservices split for high-traffic features

---

## Additional Resources

- [tRPC Documentation](https://trpc.io)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Query Documentation](https://tanstack.com/query)
