# Development Guide

This guide will help you set up your development environment and understand the development workflow for the SEED project.

---

## Prerequisites

### Required Software

1. **Node.js** (v20+)

   ```bash
   node --version  # Should be v20 or higher
   ```

   Download from: https://nodejs.org/

2. **pnpm** (v8+)

   ```bash
   npm install -g pnpm
   pnpm --version
   ```

3. **PostgreSQL** (v14+)
   - **macOS**: `brew install postgresql@16`
   - **Windows**: Download from https://www.postgresql.org/download/windows/
   - **Linux**: `sudo apt install postgresql postgresql-contrib`

4. **Git**

   ```bash
   git --version
   ```

5. **VS Code** (Recommended)
   - Install extensions:
     - Prisma
     - ESLint
     - Prettier
     - Tailwind CSS IntelliSense

---

## Initial Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd seed

# Install all dependencies
pnpm install
```

### 2. Database Setup

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE seed_dev;

# Create user (optional)
CREATE USER seed_user WITH PASSWORD 'seed_password';
GRANT ALL PRIVILEGES ON DATABASE seed_dev TO seed_user;

# Exit
\q
```

#### Configure Database URL

Create `server/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/seed_dev"
```

#### Run Migrations

```bash
# Generate Prisma Client
pnpm --filter @seed/database db:generate

# Run migrations
pnpm --filter @seed/database db:migrate

# Verify with Prisma Studio
pnpm --filter @seed/database db:studio
```

### 3. Configure Environment Variables

#### Server Environment (`server/.env`)

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/seed_dev"

# Server
PORT=8080
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT Secrets (generate with: openssl rand -base64 32)
ACCESS_TOKEN_SECRET=your_dev_access_secret_here
REFRESH_TOKEN_SECRET=your_dev_refresh_secret_here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-dev-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@seed-dev.local

# Google OAuth (optional for local dev)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth.googleCallback

# Test User (development convenience)
TEST_USER_EMAIL=test@example.com
TEST_USER_OTP=123456
```

#### Web Environment (`web/.env.local`)

```env
NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:8080
```

### 4. Gmail App Password Setup

For email functionality in development:

1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Generate App Password:
   - Go to Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this as `EMAIL_PASSWORD`

### 5. Build and Start

```bash
# Build all packages
pnpm build

# Start development servers
pnpm dev
```

This starts:

- Server: http://localhost:8080
- Web: http://localhost:3000

### 6. Seed Admin User (Optional)

To create the first admin (needed to access the admin dashboard):

```bash
cd database

# Create a regular admin
npx tsx seed-admin.ts user@example.com

# Create a super admin (full privileges)
npx tsx seed-admin.ts user@example.com --super
```

> **Note:** The user must already be registered via the normal login flow. The seed script links an existing user to the Admin table.

The admin dashboard is accessible at http://localhost:3000/admin

---

## Development Workflow

### Daily Development

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
pnpm install

# Start dev servers
pnpm dev
```

### Making Changes

#### 1. Database Changes

```bash
# Edit models in database/models/ (e.g., database/models/user.prisma)
# Then create migration:
pnpm --filter @seed/database db:migrate

# Migration will auto-generate Prisma Client
# If needed, manually regenerate:
pnpm --filter @seed/database db:generate
```

Example migration workflow:

```prisma
// Add new field to User model in database/models/user.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  phone     String?  @unique
  name      String?
  picture   String?
  bio       String?  // New field
  // ...
}
```

```bash
pnpm --filter @seed/database db:migrate
# Enter migration name: "add_user_bio"
```

#### 2. Adding API Endpoints

**Step 1**: Create controller function in `server/controllers/`

```typescript
// server/controllers/user.ts
import { protectedProcedure } from '../trpc/procedures';
import { z } from 'zod';
import { prisma } from '@seed/database';

export const getUserProfile = protectedProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    return await prisma.user.findUnique({
      where: { id: input.userId },
    });
  });
```

**Step 2**: Add to router in `server/routers/`

```typescript
// server/routers/user.ts
import { t } from '../trpc';
import { getUserProfile } from '../controllers/user';

export const userRoutes = t.router({
  getProfile: getUserProfile,
});
```

**Step 3**: Register in main router

```typescript
// server/routers/index.ts
import { userRoutes } from './user';

export const appRouter = t.router({
  auth: authRoutes,
  business: businessRoutes,
  user: userRoutes, // Add here
});
```

**Step 4**: Use in frontend

```tsx
// web/app/profile/page.tsx
'use client';
import { api } from '@seed/api';

export default function ProfilePage() {
  const { data: profile } = api.user.getProfile.useQuery({
    userId: 'user_id',
  });

  return <div>{profile?.name}</div>;
}
```

#### 2b. Adding Admin Endpoints

Admin controllers go in `server/controllers/admin/` and use `adminProcedure` or `superAdminProcedure`:

```typescript
// server/controllers/admin/myFeature.ts
import { adminProcedure, superAdminProcedure } from '../../trpc/procedures';
import { prisma } from '@seed/database';

export const getAdminData = adminProcedure.query(async ({ ctx }) => {
  // ctx.adminId and ctx.isSuperAdmin available
  return await prisma.someModel.findMany();
});

export const dangerousAction = superAdminProcedure.mutation(async ({ ctx }) => {
  // Only super admins can reach here
});
```

Routers go in `server/routers/admin/`, and the barrel `server/routers/admin/index.ts` combines them. Routes are accessible as `admin.myFeature.*`.

#### 3. Adding UI Components

```bash
# Install shadcn component
npx shadcn-ui@latest add button

# Or create custom component
# web/components/my-component.tsx
```

Component structure:

```tsx
'use client'; // Only if using hooks/state

import { cn } from '@/lib/utils';

interface MyComponentProps {
  title: string;
  className?: string;
}

export function MyComponent({ title, className }: MyComponentProps) {
  return <div className={cn('base-styles', className)}>{title}</div>;
}
```

#### 4. Adding Pages

```bash
# Create new page in app directory
# web/app/(main)/new-page/page.tsx
```

```tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Title',
};

export default function NewPage() {
  return (
    <main>
      <h1>New Page</h1>
    </main>
  );
}
```

---

## Testing

### Manual Testing

#### Test Authentication Flow

1. Go to http://localhost:3000/login
2. Enter email: `test@example.com`
3. Use OTP: `123456` (test user)
4. Should redirect to dashboard

#### Test Email Templates

Visit these URLs:

- OTP Email: http://localhost:8080/email-template?type=otp
- Welcome Email: http://localhost:8080/email-template?type=welcome

#### Test API Endpoints

Using browser or curl:

```bash
# Health check
curl http://localhost:8080/health

# tRPC endpoint (requires auth)
curl -X POST http://localhost:8080/api/auth.getUser \
  -H "Content-Type: application/json" \
  -H "Cookie: access-token=YOUR_TOKEN"
```

### Database Testing

```bash
# Open Prisma Studio
pnpm --filter @seed/database db:studio

# View/edit data at http://localhost:5555
```

### Type Checking

```bash
# Check all packages
pnpm lint

# Check specific package
pnpm --filter @seed/server lint
pnpm --filter web lint
```

---

## Debugging

### Server Debugging

Add breakpoints in VS Code:

**`.vscode/launch.json`:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/server",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Next.js Debugging

Add to `web/.vscode/launch.json`:

```json
{
  "name": "Next.js: debug",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/web/node_modules/next/dist/bin/next",
  "args": ["dev"],
  "cwd": "${workspaceFolder}/web",
  "console": "integratedTerminal"
}
```

### Common Issues

#### Port Already in Use

```bash
# Find process using port 8080
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

#### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql@16  # macOS
sudo service postgresql start  # Linux
# Windows: Check Services app
```

#### Prisma Client Out of Sync

```bash
# Regenerate client
pnpm --filter @seed/database db:generate

# Rebuild database package
pnpm --filter @seed/database build
```

#### Module Not Found

```bash
# Clean install
rm -rf node_modules */node_modules
pnpm install
pnpm build
```

---

## Code Style

### TypeScript

```typescript
// Use explicit types for function params
function getUserById(id: string): Promise<User> {
  return prisma.user.findUnique({ where: { id } });
}

// Use type inference for simple cases
const user = await getUserById('123'); // User type inferred

// Avoid 'any' - use 'unknown' if type is truly unknown
function process(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
}
```

### Naming Conventions

```typescript
// Variables & Functions: camelCase
const userName = 'John';
function getUserName() {}

// Components & Types: PascalCase
type UserProfile = {};
function UserCard() {}

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:8080';

// Files:
// - Components: PascalCase (UserCard.tsx)
// - Utilities: camelCase (getUserName.ts)
// - Types: PascalCase (UserTypes.ts)
```

### React/Next.js

```tsx
// Server Components by default
export default function Page() {
  return <div>Server Component</div>;
}

// Client Components when needed
('use client');
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

// Use async Server Components for data fetching
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### File Organization

```
feature/
├── components/
│   ├── FeatureCard.tsx
│   └── FeatureList.tsx
├── hooks/
│   └── useFeature.ts
├── types/
│   └── feature.types.ts
└── utils/
    └── featureHelpers.ts
```

---

## Git Workflow

### Branching Strategy

```bash
# Create feature branch
git checkout -b feature/user-profile

# Make changes and commit
git add .
git commit -m "feat: add user profile page"

# Push to remote
git push origin feature/user-profile

# Create Pull Request on GitHub
```

### Commit Messages

Follow conventional commits:

```bash
feat: add new feature
fix: fix bug
docs: update documentation
style: format code
refactor: refactor code
test: add tests
chore: update dependencies
```

Examples:

```bash
git commit -m "feat: add business creation form"
git commit -m "fix: resolve token refresh issue"
git commit -m "docs: update API reference"
```

---

## Performance Tips

### 1. Minimize Client Components

```tsx
// Good: Server Component with Client island
export default function Page() {
  return (
    <div>
      <StaticContent />
      <InteractiveButton /> {/* Client component */}
    </div>
  );
}
```

### 2. Use React Query Features

```tsx
// Cache data
const { data } = api.user.get.useQuery(
  { id },
  { staleTime: 60000 }, // 1 minute
);

// Prefetch data
const utils = api.useUtils();
await utils.user.get.prefetch({ id });
```

### 3. Optimize Images

```tsx
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={500}
  height={300}
  priority={false} // Only true for above-fold images
/>;
```

### 4. Database Query Optimization

```typescript
// Select only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
  },
});

// Use include for relations instead of separate queries
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    businesses: true,
  },
});
```

---

## Useful Commands

### Package Management

```bash
# Add dependency to specific package
pnpm add <package> --filter @seed/server

# Add dev dependency
pnpm add -D <package> --filter web

# Update dependencies
pnpm update

# List outdated packages
pnpm outdated
```

### Database Commands

```bash
# Reset database (WARNING: deletes all data)
pnpm --filter @seed/database db:migrate reset

# Create empty migration
pnpm --filter @seed/database db:migrate dev --create-only

# Format schema
npx prisma format --schema=database/prisma/schema.prisma

# Seed admin user
cd database && npx tsx seed-admin.ts <email> [--super]
```

### Build Commands

```bash
# Build specific package
pnpm --filter @seed/database build

# Build with clean
pnpm clean && pnpm build

# Watch mode (auto-rebuild)
pnpm --filter @seed/server dev
```

---

## Environment Variables Reference

### Server Required Variables

```env
DATABASE_URL=          # PostgreSQL connection string
ACCESS_TOKEN_SECRET=   # JWT secret for access tokens
REFRESH_TOKEN_SECRET=  # JWT secret for refresh tokens
FRONTEND_URL=          # CORS allowed origin
EMAIL_HOST=            # SMTP host
EMAIL_PORT=            # SMTP port
EMAIL_USER=            # SMTP username
EMAIL_PASSWORD=        # SMTP password
EMAIL_FROM=            # Sender email address
```

### Server Optional Variables

```env
PORT=8080              # Server port (default: 8080)
NODE_ENV=development   # Environment mode
GOOGLE_CLIENT_ID=      # Google OAuth client ID
GOOGLE_CLIENT_SECRET=  # Google OAuth client secret
GOOGLE_REDIRECT_URI=   # OAuth callback URL
TEST_USER_EMAIL=       # Test user email (dev only)
TEST_USER_OTP=         # Test user OTP (dev only)
```

### Web Required Variables

```env
NEXT_PUBLIC_SERVER_BASE_URL=  # Backend API URL
```

---

## Resources

### Documentation

- [tRPC Docs](https://trpc.io)
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Tools

- [Prisma Studio](https://www.prisma.io/studio) - Database GUI
- [React DevTools](https://react.dev/learn/react-developer-tools) - Debug React
- [Postman](https://www.postman.com/) - API testing

### VS Code Extensions

- Prisma
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Error Lens
- Auto Rename Tag

---

## Getting Help

If you encounter issues:

1. Check this documentation
2. Search existing issues on GitHub
3. Check package documentation (tRPC, Prisma, etc.)
4. Ask team members
5. Create new issue with reproduction steps
