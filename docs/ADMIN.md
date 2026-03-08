# Admin Dashboard

Comprehensive documentation for the SEED platform admin dashboard — architecture, setup, API routes, frontend pages, and operational workflows.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Models](#database-models)
- [Authentication & Authorization](#authentication--authorization)
- [Backend Structure](#backend-structure)
- [Frontend Structure](#frontend-structure)
- [API Reference](#api-reference)
- [Setup & Seeding](#setup--seeding)
- [Schemas](#schemas)
- [Adding New Admin Features](#adding-new-admin-features)

---

## Overview

The admin dashboard provides platform-level management for the SEED application. It allows authorized admins to:

- View platform statistics and growth analytics
- Manage users and businesses
- Configure system settings
- Review audit logs of admin actions
- Manage other admin accounts (super admin only)

**Key design principle:** Admin uses the **same authentication system** as regular users. There is no separate login flow, tokens, or cookies. Admin status is determined by a database lookup on every request.

---

## Architecture

### Auth Flow

```
User logs in normally (OTP / Google OAuth)
  → JWT access token issued (same as all users)
  → User navigates to /admin
  → AdminProvider calls admin.auth.getAdminMe
  → Server middleware looks up Admin table by userId
  → If admin record exists and isActive → access granted
  → If not → AdminGuard shows "Access Denied"
```

### Middleware Chain

```
Request
  → isAuthed (verify JWT, extract userId)
  → isAdmin (DB lookup: Admin.findUnique({ where: { userId } }))
  → [optional] isSuperAdminMiddleware (check ctx.isSuperAdmin)
  → Controller logic
```

### Procedure Hierarchy

| Procedure             | Middleware Chain                        | Use Case                      |
| --------------------- | --------------------------------------- | ----------------------------- |
| `publicProcedure`     | None                                    | Public endpoints              |
| `protectedProcedure`  | `isAuthed`                              | Logged-in users               |
| `adminProcedure`      | `isAuthed` → `isAdmin`                  | Admin dashboard features      |
| `superAdminProcedure` | `isAuthed` → `isAdmin` → `isSuperAdmin` | Destructive/sensitive actions |

---

## Database Models

All admin models are defined in `database/models/user.prisma`.

### Admin

```prisma
model Admin {
  id           String   @id @default(cuid())
  userId       String   @unique
  isSuperAdmin Boolean  @default(false)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  auditLogs AuditLog[]

  @@map("admins")
}
```

- Links to `User` via one-to-one `userId` FK
- `isSuperAdmin` grants elevated privileges
- `isActive` can deactivate without deleting the record

### AuditLog

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  adminId   String
  action    String
  entity    String
  entityId  String?
  details   Json?
  createdAt DateTime @default(now())

  admin Admin @relation(fields: [adminId], references: [id], onDelete: Cascade)

  @@map("audit_logs")
}
```

- Immutable append-only log of admin actions
- `action`: e.g. `DELETE_USER`, `UPDATE_SETTING`, `ACTIVATE_ADMIN`
- `entity`: e.g. `user`, `business`, `system_setting`, `admin`
- `details`: Optional JSON payload with action-specific metadata

### SystemSetting

```prisma
model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt

  @@map("system_settings")
}
```

- Key-value store for platform configuration
- `value` is JSON, supports any data type
- Managed via upsert (create if missing, update if exists)

---

## Authentication & Authorization

### Why Shared Auth?

- **Simpler system**: No duplicate token logic, cookies, or login pages
- **Single session**: Admin is just a capability attached to a regular user
- **Immediate revocation**: Deactivate admin record → next request fails

### Middleware: `isAdmin`

Located in `server/trpc/middlewares.ts`:

```typescript
export const isAdmin = t.middleware(async ({ ctx, next }) => {
  const userId = (ctx as any).userId;

  const admin = await prisma.admin.findUnique({
    where: { userId },
    select: { id: true, isActive: true, isSuperAdmin: true },
  });

  if (!admin || !admin.isActive) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  return next({
    ctx: { userId, adminId: admin.id, isSuperAdmin: admin.isSuperAdmin },
  });
});
```

### Middleware: `isSuperAdminMiddleware`

```typescript
export const isSuperAdminMiddleware = t.middleware(({ ctx, next }) => {
  if (!(ctx as any).isSuperAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Super admin access required',
    });
  }
  return next({ ctx });
});
```

### Audit Logging

The `createAuditLog` helper in `server/helpers/adminAuth.ts` records admin actions:

```typescript
await createAuditLog({
  adminId: ctx.adminId,
  action: 'DELETE_USER',
  entity: 'user',
  entityId: userId,
  details: { reason: 'policy violation' }, // optional
});
```

Called in super-admin mutations (delete user, update settings, manage admins).

---

## Backend Structure

### Controllers (`server/controllers/admin/`)

| File            | Procedures                                                                   | Access Level  |
| --------------- | ---------------------------------------------------------------------------- | ------------- |
| `auth.ts`       | `getAdminMe`                                                                 | Admin         |
| `users.ts`      | `listUsers`, `getUserDetail`, `deleteUser`                                   | Admin / Super |
| `businesses.ts` | `listBusinesses`, `getBusinessDetail`, `deleteBusiness`                      | Admin / Super |
| `analytics.ts`  | `getPlatformStats`, `getUserGrowth`, `getBusinessGrowth`, `getTopBusinesses` | Admin         |
| `settings.ts`   | `getSettings`, `updateSetting`                                               | Admin / Super |
| `auditLog.ts`   | `getAuditLogs`                                                               | Admin         |
| `management.ts` | `listAdmins`, `activateAdmin`, `deactivateAdmin`, `toggleSuperAdmin`         | Super Admin   |

### Routers (`server/routers/admin/`)

Each file exports a tRPC router. The barrel `index.ts` combines them:

```typescript
export const adminRoutes = t.router({
  auth: adminAuthRoutes,
  users: adminUsersRoutes,
  businesses: adminBusinessesRoutes,
  analytics: adminAnalyticsRoutes,
  settings: adminSettingsRoutes,
  auditLog: adminAuditLogRoutes,
  management: adminManagementRoutes,
});
```

Registered in `server/routers/index.ts` as `admin: adminRoutes`, making routes accessible as `trpc.admin.<sub>.<procedure>`.

---

## Frontend Structure

### Layout & Components

| File                                   | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| `web/app/(admin)/layout.tsx`           | Admin layout with sidebar + header + guard        |
| `web/providers/AdminProvider.tsx`      | Context: admin data, isSuperAdmin, isLoading      |
| `web/components/admin/AdminGuard.tsx`  | Auth + admin gate (loading, denied, login states) |
| `web/components/admin/AdminNavBar.tsx` | Sidebar navigation with role-based visibility     |
| `web/components/admin/AdminHeader.tsx` | Top header bar with page title + user button      |

### Pages

| Route                    | File                                     | Description                            |
| ------------------------ | ---------------------------------------- | -------------------------------------- |
| `/admin`                 | `(admin)/admin/page.tsx`                 | Dashboard: stats + growth cards        |
| `/admin/users`           | `(admin)/admin/users/page.tsx`           | User list with search + pagination     |
| `/admin/users/[id]`      | `(admin)/admin/users/[id]/page.tsx`      | User detail + delete (super admin)     |
| `/admin/businesses`      | `(admin)/admin/businesses/page.tsx`      | Business list with search + pagination |
| `/admin/businesses/[id]` | `(admin)/admin/businesses/[id]/page.tsx` | Business detail + delete (super admin) |
| `/admin/analytics`       | `(admin)/admin/analytics/page.tsx`       | Growth charts + top businesses table   |
| `/admin/audit-log`       | `(admin)/admin/audit-log/page.tsx`       | Filterable audit log viewer            |
| `/admin/settings`        | `(admin)/admin/settings/page.tsx`        | System settings (super admin edit)     |
| `/admin/admins`          | `(admin)/admin/admins/page.tsx`          | Admin management (super admin only)    |

### Provider Flow

```
AdminProvider (fetches getAdminMe)
  → AdminGuard (checks session + admin status)
    → AdminNavBar + AdminHeader + Page Content
```

`AdminNavBar` hides super-admin-only links (e.g., "Admins") when `isSuperAdmin` is false.

---

## API Reference

See [API_REFERENCE.md](API_REFERENCE.md#admin-routes-admin) for the full admin API reference with input/output types.

### Quick Summary

| Endpoint                             | Access      | Description                        |
| ------------------------------------ | ----------- | ---------------------------------- |
| `admin.auth.getAdminMe`              | Admin       | Get current admin profile          |
| `admin.users.listUsers`              | Admin       | Paginated user list                |
| `admin.users.getUserDetail`          | Admin       | User detail with relations         |
| `admin.users.deleteUser`             | Super Admin | Delete a user                      |
| `admin.businesses.listBusinesses`    | Admin       | Paginated business list            |
| `admin.businesses.getBusinessDetail` | Admin       | Business detail with members       |
| `admin.businesses.deleteBusiness`    | Super Admin | Delete a business                  |
| `admin.analytics.getPlatformStats`   | Admin       | Counts + recent growth             |
| `admin.analytics.getUserGrowth`      | Admin       | Time-series user registrations     |
| `admin.analytics.getBusinessGrowth`  | Admin       | Time-series business creations     |
| `admin.analytics.getTopBusinesses`   | Admin       | Top businesses by members/products |
| `admin.settings.getSettings`         | Admin       | List all system settings           |
| `admin.settings.updateSetting`       | Super Admin | Upsert a setting                   |
| `admin.auditLog.getAuditLogs`        | Admin       | Paginated + filtered audit logs    |
| `admin.management.listAdmins`        | Super Admin | List all admins                    |
| `admin.management.activateAdmin`     | Super Admin | Activate an admin                  |
| `admin.management.deactivateAdmin`   | Super Admin | Deactivate an admin                |
| `admin.management.toggleSuperAdmin`  | Super Admin | Promote/demote super admin         |

---

## Setup & Seeding

### Prerequisites

- The SEED application must be running (database, server, web)
- A user account must exist (created via normal registration)

### Creating the First Admin

```bash
cd database

# Make an existing user a regular admin
npx tsx seed-admin.ts user@example.com

# Make an existing user a super admin
npx tsx seed-admin.ts user@example.com --super
```

The script:

1. Loads environment variables from `server/.env` (same as Prisma config)
2. Looks up the user by email
3. Creates an `Admin` record linked to that user's ID
4. If the admin already exists, updates their status (promote to super, reactivate)

### Accessing the Dashboard

1. Log in to the application normally at `/login`
2. Navigate to `/admin`
3. If you have an active admin record, the dashboard loads
4. If not, you see an "Access Denied" screen

---

## Schemas

Admin Zod schemas are defined in `schemas/admin.ts` and exported from `@seed/schemas`.

| Schema                     | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- | ----- | ----- | ------- |
| `paginationSchema`         | Base pagination (page, limit, search, sort)                    |
| `listUsersSchema`          | Extends pagination with status filter                          |
| `getUserDetailSchema`      | `{ userId: string }`                                           |
| `deleteUserSchema`         | `{ userId: string }`                                           |
| `listBusinessesSchema`     | Extends pagination with status filter                          |
| `getBusinessDetailSchema`  | `{ businessId: string }`                                       |
| `deleteBusinessSchema`     | `{ businessId: string }`                                       |
| `analyticsTimeRangeSchema` | `{ range: '7d'                                                 | '30d' | '90d' | '1y' }` |
| `topBusinessesSchema`      | `{ limit, sortBy: 'members' \| 'products' \| 'transactions' }` |
| `updateSettingSchema`      | `{ key: string, value: any }`                                  |
| `auditLogFilterSchema`     | Extends pagination with admin/action/entity/date filters       |
| `createAdminSchema`        | `{ email: string, name?: string, isSuperAdmin?: boolean }`     |
| `toggleAdminSchema`        | `{ adminId: string }`                                          |
| `updateAdminSchema`        | `{ adminId: string, name?: string, isSuperAdmin?: boolean }`   |
| `toggleUserSchema`         | `{ userId: string }`                                           |
| `toggleBusinessSchema`     | `{ businessId: string }`                                       |
| `getSettingSchema`         | `{ key: string }`                                              |

---

## Adding New Admin Features

### 1. Add Schema (if needed)

```typescript
// schemas/admin.ts
export const myNewSchema = z.object({
  someField: z.string(),
});
```

Rebuild: `pnpm --filter @seed/schemas build`

### 2. Create Controller

```typescript
// server/controllers/admin/myFeature.ts
import { adminProcedure } from '../../trpc/procedures';
import { prisma } from '@seed/database';

export const myQuery = adminProcedure.query(async ({ ctx }) => {
  // ctx.adminId, ctx.isSuperAdmin, ctx.userId available
  return await prisma.someModel.findMany();
});
```

### 3. Create Router

```typescript
// server/routers/admin/myFeature.ts
import { t } from '../../trpc';
import { myQuery } from '../../controllers/admin/myFeature';

export const myFeatureRoutes = t.router({
  myQuery,
});
```

### 4. Register in Barrel

```typescript
// server/routers/admin/index.ts
import { myFeatureRoutes } from './myFeature';

export const adminRoutes = t.router({
  // ...existing routes
  myFeature: myFeatureRoutes,
});
```

### 5. Create Frontend Page

```tsx
// web/app/(admin)/admin/my-feature/page.tsx
'use client';
import { clientTrpc } from '@seed/api/client';

export default function MyFeaturePage() {
  const { data } = clientTrpc.admin.myFeature.myQuery.useQuery();
  return <div>{/* render data */}</div>;
}
```

### 6. Add Navigation Link

In `web/components/admin/AdminNavBar.tsx`, add to the `navItems` array:

```typescript
{
  title: 'My Feature',
  href: '/admin/my-feature',
  icon: SomeIcon,
  superAdminOnly: false, // or true
}
```

---

## Migrations

The admin system was added in two migrations:

1. **`add_admin_system`** — Initial Admin, AuditLog, SystemSetting models
2. **`rework_admin_use_userid`** — Switched from separate admin auth to shared auth (userId FK)

Both are in `database/migrations/`.
