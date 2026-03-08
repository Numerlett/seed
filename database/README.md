# Database Package

Prisma-based database layer for the SEED application.

## Overview

This package provides type-safe database access using Prisma ORM. It includes the database schema, migrations, and a configured Prisma Client instance.

## Structure

```
database/
├── schema.prisma          # Base schema (generator + datasource config)
├── prisma.config.ts       # Prisma config (env loading from server/.env)
├── models/                # Multi-file Prisma schema (models)
│   ├── user.prisma        # User, RefreshToken, otp, Admin, AuditLog, SystemSetting
│   ├── business.prisma    # Business model
│   ├── product.prisma     # Product model
│   ├── inventory.prisma   # Inventory models
│   ├── sales.prisma       # Sales models
│   ├── purchase.prisma    # Purchase models
│   ├── warehouse.prisma   # Warehouse model
│   ├── party.prisma       # Party model
│   └── stockops.prisma    # Stock operations
├── migrations/            # Migration history
├── generated/             # Auto-generated Prisma Client
├── seed-admin.ts          # CLI to bootstrap admin users
├── client.ts              # Prisma client singleton
└── index.ts               # Package exports
```

## Database Schema

### Models

**Auth & Users:**

- **User**: User accounts and profiles
- **RefreshToken**: JWT refresh tokens for session management
- **otp**: One-time passwords for authentication

**Business & Commerce:**

- **Business**: Business entities owned by users
- **Product**: Products within a business
- **Category**: Product categories per business
- **Party**: Customers and suppliers
- **Warehouse**: Warehouses per business
- **Batch**: Product batches for inventory tracking

**Inventory & Stock:**

- **InventoryItem**: Stock items per warehouse
- **StockOperation**: Stock adjustments and transfers
- **Purchase / PurchaseItem**: Purchase orders and line items
- **Sale / SaleItem**: Sales orders and line items
- **Return / ReturnItem**: Returns tracking

**Admin:**

- **Admin**: Admin users (linked to User via `userId` FK)
- **AuditLog**: Immutable log of admin actions
- **SystemSetting**: Key-value platform configuration

### Relationships

- User → RefreshToken (one-to-many)
- User → Business (one-to-many, as owner)
- User → Admin (one-to-one)
- Admin → AuditLog (one-to-many)
- Business → Product, Category, Party, Warehouse (one-to-many)

## Usage

### Import Prisma Client

```typescript
import { prisma } from '@seed/database';

// Query users
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
});

// Create business
const business = await prisma.business.create({
  data: {
    name: 'My Store',
    ownerId: userId,
  },
});
```

### Transactions

```typescript
import { prisma } from '@seed/database';

await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email } });
  await tx.business.create({
    data: { name: 'Store', ownerId: user.id },
  });
});
```

## Scripts

```bash
# Generate Prisma Client
pnpm db:generate

# Create migration
pnpm db:migrate

# Deploy migrations (production)
pnpm db:deploy

# Open Prisma Studio
pnpm db:studio

# Build package
pnpm build
```

## Development

### Adding a New Model

1. Add or edit a `.prisma` file in `models/` (e.g., `models/myfeature.prisma`)
2. Run migration: `pnpm db:migrate`
3. Prisma Client auto-regenerates

### Modifying Existing Model

1. Edit the relevant model file in `models/`
2. Create migration: `pnpm db:migrate`
3. Name migration descriptively
4. Commit migration files

### Seeding Admin Users

```bash
# Create a regular admin from an existing user
npx tsx seed-admin.ts user@example.com

# Create a super admin
npx tsx seed-admin.ts user@example.com --super
```

### Database Connection

Set `DATABASE_URL` in environment:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

## Type Safety

All database operations are fully typed:

```typescript
// TypeScript knows the shape of User
const user = await prisma.user.findUnique({
  where: { id: 'user_id' },
});

// Compile-time error if field doesn't exist
const name = user?.name; // ✅ Valid
const invalid = user?.notAField; // ❌ TypeScript error
```

## Best Practices

### Select Only Needed Fields

```typescript
// ✅ Good: Select specific fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
  },
});

// ❌ Avoid: Fetching all fields unnecessarily
const user = await prisma.user.findUnique({ where: { id } });
```

### Use Includes for Relations

```typescript
// ✅ Good: Single query with relations
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    businessesOwned: true,
  },
});

// ❌ Avoid: N+1 queries
const user = await prisma.user.findUnique({ where: { id } });
const businesses = await prisma.business.findMany({
  where: { ownerId: id },
});
```

### Use Transactions

```typescript
// ✅ Good: Atomic operations
await prisma.$transaction([
  prisma.user.update({ where: { id }, data: { ... } }),
  prisma.business.create({ data: { ... } })
]);

// ❌ Avoid: Separate operations (not atomic)
await prisma.user.update({ where: { id }, data: { ... } });
await prisma.business.create({ data: { ... } });
```

## Troubleshooting

### Prisma Client Out of Sync

```bash
# Regenerate client
pnpm db:generate

# Rebuild package
pnpm build
```

### Migration Failed

```bash
# Check migration status
pnpm prisma migrate status

# Reset database (dev only)
pnpm db:migrate reset
```

### Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check PostgreSQL is running
pg_isready
```

## Documentation

- [Prisma Documentation](https://www.prisma.io/docs)
- [Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
