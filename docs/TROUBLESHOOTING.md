# Troubleshooting Guide

Common issues and their solutions for the SEED application.

---

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Problems](#database-problems)
- [Server Issues](#server-issues)
- [Frontend Issues](#frontend-issues)
- [Authentication Problems](#authentication-problems)
- [Build Errors](#build-errors)
- [Docker Issues](#docker-issues)
- [Performance Issues](#performance-issues)

---

## Installation Issues

### pnpm Installation Fails

**Problem:** `pnpm install` fails with permission errors

**Solution:**

```bash
# Fix npm permissions (Linux/macOS)
sudo chown -R $USER:$(id -gn $USER) ~/.config

# Or use nvm to manage Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
npm install -g pnpm
```

### Workspace Dependencies Not Resolving

**Problem:** `Cannot find module '@seed/database'`

**Solution:**

```bash
# Reinstall all dependencies
rm -rf node_modules */node_modules pnpm-lock.yaml
pnpm install

# Build all packages in correct order
pnpm build
```

### Node Version Mismatch

**Problem:** `The engine "node" is incompatible with this module`

**Solution:**

```bash
# Check Node version
node --version  # Should be v20+

# Install correct version
nvm install 20
nvm use 20

# Or update Node.js from nodejs.org
```

---

## Database Problems

### Cannot Connect to Database

**Problem:** `Error: P1001: Can't reach database server`

**Solution 1:** Check if PostgreSQL is running

```bash
# macOS
brew services list
brew services start postgresql@16

# Linux
sudo systemctl status postgresql
sudo systemctl start postgresql

# Windows
# Check Services app for PostgreSQL service
```

**Solution 2:** Verify DATABASE_URL

```bash
# Test connection
psql "postgresql://user:password@localhost:5432/dbname"

# Check environment variable
echo $DATABASE_URL

# Verify format
# postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

**Solution 3:** Check firewall

```bash
# Allow PostgreSQL port
sudo ufw allow 5432  # Linux
# Windows: Check Windows Firewall settings
```

### Migration Fails

**Problem:** `Migration failed to apply cleanly to the shadow database`

**Solution:**

```bash
# Reset shadow database
pnpm --filter @seed/database db:migrate reset

# Or create migration manually
pnpm --filter @seed/database db:migrate dev --create-only
# Edit migration file, then apply
pnpm --filter @seed/database db:migrate dev
```

### Database Schema Drift

**Problem:** `Your database is not in sync with your migration files`

**Solution:**

```bash
# Check status
pnpm --filter @seed/database prisma migrate status

# Reset database (WARNING: deletes all data)
pnpm --filter @seed/database db:migrate reset

# Or create new migration from current state
pnpm --filter @seed/database db:migrate dev --name sync_schema
```

### Prisma Client Out of Sync

**Problem:** `Type 'PrismaClient' is not assignable`

**Solution:**

```bash
# Regenerate Prisma Client
pnpm --filter @seed/database db:generate

# Rebuild database package
pnpm --filter @seed/database build

# Restart dev server
pnpm --filter @seed/server dev
```

### Database Connection Pool Exhausted

**Problem:** `Error: Timed out fetching a new connection from the pool`

**Solution:**

```typescript
// Increase connection pool size
// database/client.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection pool configuration
  log: ['query', 'error', 'warn'],
});

// Or in DATABASE_URL
postgresql://user:pass@host:5432/db?connection_limit=10
```

---

## Server Issues

### Server Won't Start

**Problem:** `Error: listen EADDRINUSE: address already in use :::8080`

**Solution:**

```bash
# Find process using port 8080
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in .env
PORT=8081
```

### Environment Variables Not Loading

**Problem:** `undefined` values for `process.env.VARIABLE`

**Solution:**

```bash
# Verify .env file exists
ls server/.env

# Check file content
cat server/.env

# Ensure dotenv is loaded first
# server/index.ts
import dotenv from 'dotenv';
dotenv.config();  # Must be at top of file

# Restart server
pnpm --filter @seed/server dev
```

### JWT Token Invalid

**Problem:** `JsonWebTokenError: invalid signature`

**Solution:**

```bash
# Verify secrets are set
echo $ACCESS_TOKEN_SECRET
echo $REFRESH_TOKEN_SECRET

# Generate new secrets
openssl rand -base64 32

# Update .env file
ACCESS_TOKEN_SECRET=new_secret_here
REFRESH_TOKEN_SECRET=another_new_secret_here

# Clear browser cookies
# Restart server
```

### Email Not Sending

**Problem:** `Error: Invalid login: 535-5.7.8 Username and Password not accepted`

**Solution for Gmail:**

```bash
# Use App Password, not regular password
# 1. Enable 2FA on Google Account
# 2. Generate App Password:
#    https://myaccount.google.com/apppasswords
# 3. Use App Password in EMAIL_PASSWORD
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # 16-character app password
```

**Test email configuration:**

```typescript
// Create test file: server/test-email.ts
import sendMail from './helpers/sendMail';

sendMail({
  to: 'your-email@example.com',
  subject: 'Test Email',
  html: '<p>Test</p>',
})
  .then(() => console.log('Email sent!'))
  .catch((err) => console.error('Error:', err));
```

---

## Frontend Issues

### Next.js Build Fails

**Problem:** `Error: Module not found: Can't resolve '@seed/api'`

**Solution:**

```bash
# Build dependencies first
pnpm --filter @seed/database build
pnpm --filter @seed/api build

# Then build web
pnpm --filter web build
```

### Hydration Error

**Problem:** `Error: Text content does not match server-rendered HTML`

**Solution:**

```tsx
// Ensure server and client render same content
// Use useEffect for client-only code
import { useEffect, useState } from 'react';

export function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <div>{/* Client-only content */}</div>;
}
```

### tRPC Query Fails

**Problem:** `TRPCClientError: fetch failed`

**Solution:**

```bash
# Check server is running
curl http://localhost:8080/health

# Verify NEXT_PUBLIC_SERVER_BASE_URL
echo $NEXT_PUBLIC_SERVER_BASE_URL

# Check browser console for CORS errors
# Update server CORS configuration if needed
```

### Infinite Redirect Loop

**Problem:** Auth guard causes redirect loop

**Solution:**

```tsx
// Check AuthGuard logic
// Ensure you're not redirecting authenticated users from auth pages
// web/auth/AuthGuard.tsx

if (isLoading) return <LoadingSpinner />;

if (!isAuthenticated && requireAuth) {
  return <Navigate to="/login" />;
}

if (isAuthenticated && !requireAuth) {
  return <Navigate to="/dashboard" />;
}

return children;
```

---

## Authentication Problems

### OTP Not Received

**Problem:** OTP email not arriving

**Checklist:**

1. ✅ Check spam/junk folder
2. ✅ Verify EMAIL_FROM is valid
3. ✅ Check server logs for email errors
4. ✅ Test email configuration (see above)
5. ✅ Verify SMTP credentials

**For Development:**

```bash
# Use test user credentials
TEST_USER_EMAIL=test@example.com
TEST_USER_OTP=123456

# Login with test@example.com
# Use OTP: 123456
```

### Session Expires Immediately

**Problem:** User logged out immediately after login

**Solution:**

```typescript
// Check cookie settings
// server/helpers/auth.ts

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // false in dev
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 1000, // 1 hour
};

// Verify domain matches
// If using different domains for frontend/backend:
// Set cookie domain explicitly
domain: process.env.COOKIE_DOMAIN, // e.g., '.yourdomain.com'
```

### Google OAuth Fails

**Problem:** `Error: invalid_client`

**Solution:**

```bash
# Verify credentials
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# Check redirect URI matches exactly
# Must be configured in Google Cloud Console
GOOGLE_REDIRECT_URI=http://localhost:8080/api/auth.googleCallback

# In production, use HTTPS
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/api/auth.googleCallback
```

### Cannot Refresh Token

**Problem:** `UNAUTHORIZED: Invalid refresh token`

**Solution:**

```bash
# Check refresh token in database
# Connect to database
psql $DATABASE_URL

# Check for revoked tokens
SELECT * FROM refresh_tokens WHERE user_id = 'USER_ID';

# Clean up expired tokens
DELETE FROM refresh_tokens WHERE expires_at < NOW();

# User may need to log in again
```

---

## Build Errors

### TypeScript Errors

**Problem:** `error TS2307: Cannot find module '@seed/database'`

**Solution:**

```bash
# Check tsconfig.json paths
# Rebuild packages in order
pnpm --filter @seed/database build
pnpm --filter @seed/server build
pnpm --filter @seed/api build
pnpm --filter web build

# Check for circular dependencies
pnpm list --depth=0
```

### Module Resolution Errors

**Problem:** `Cannot find module or its corresponding type declarations`

**Solution:**

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf */node_modules/.cache

# Reinstall
pnpm install

# Check node_modules structure
ls node_modules/@seed/
```

### Prisma Generate Fails

**Problem:** `Error: Schema parsing failed`

**Solution:**

```bash
# Check schema syntax
# database/prisma/schema.prisma

# Format schema
npx prisma format --schema=database/prisma/schema.prisma

# Regenerate
pnpm --filter @seed/database db:generate
```

---

## Docker Issues

### Docker Build Fails

**Problem:** `ERROR [stage 0] failed to solve: executor failed running`

**Solution:**

```bash
# Clear Docker cache
docker builder prune

# Rebuild without cache
docker build --no-cache -t seed-server -f Dockerfile.server .

# Check for syntax errors in Dockerfile
```

### Container Exits Immediately

**Problem:** Container stops right after starting

**Solution:**

```bash
# Check logs
docker logs seed

# Common issues:
# 1. Missing environment variables
docker run -d --name seed -p 8080:8080 \
  --env-file server/.env \
  seed-server

# 2. Database connection fails
# Verify DATABASE_URL in container

# 3. Port conflict
# Change host port: -p 8081:8080
```

### Cannot Connect to Database from Docker

**Problem:** Container can't reach database

**Solution:**

```bash
# If database on host machine, use:
# macOS/Windows: host.docker.internal
DATABASE_URL="postgresql://user:pass@host.docker.internal:5432/db"

# Linux: use host IP
ip addr show docker0 | grep inet
DATABASE_URL="postgresql://user:pass@172.17.0.1:5432/db"

# Or use docker network
docker network create seed-network
docker run --network seed-network --name postgres ...
docker run --network seed-network --name seed ...
# Use: DATABASE_URL="postgresql://user:pass@postgres:5432/db"
```

---

## Performance Issues

### Slow Database Queries

**Problem:** Queries taking too long

**Solution:**

```sql
-- Add missing indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_businesses_owner ON businesses(owner_id);

-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM businesses WHERE owner_id = 'xxx';

-- Optimize with select
-- ✅ Good: Select only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true }
});
```

### Memory Leaks

**Problem:** Memory usage grows over time

**Solution:**

```typescript
// Close database connections properly
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Clear intervals/timeouts
const interval = setInterval(() => {}, 1000);
process.on('SIGTERM', () => clearInterval(interval));

// Monitor memory usage
console.log(process.memoryUsage());
```

### Slow Build Times

**Problem:** `pnpm build` takes too long

**Solution:**

```bash
# Build specific packages only
pnpm --filter @seed/server build

# Use turbo for faster builds (optional)
pnpm add -D turbo -w

# Clear build cache
pnpm clean
rm -rf node_modules/.cache
```

---

## Getting More Help

### Debug Mode

**Enable verbose logging:**

```bash
# Server
DEBUG=* pnpm --filter @seed/server dev

# Database queries
# database/client.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Collect Diagnostic Information

```bash
# System info
node --version
pnpm --version
psql --version

# Package versions
pnpm list --depth=0

# Check running processes
ps aux | grep node
lsof -i :8080
lsof -i :3000

# Database status
psql $DATABASE_URL -c "SELECT version();"

# Environment variables (sanitized)
env | grep -E "(NODE|PORT|DATABASE)" | sed 's/=.*/=***/'
```

### Create Issue Report

When reporting issues, include:

1. **Environment**
   - OS: macOS/Windows/Linux
   - Node version
   - pnpm version
2. **Steps to Reproduce**
   - Exact commands run
   - Expected behavior
   - Actual behavior

3. **Logs**
   - Server logs
   - Browser console errors
   - Database errors

4. **Configuration**
   - .env file structure (without secrets)
   - Relevant code snippets

---

## Quick Reference

### Reset Everything

```bash
# Nuclear option: complete reset
rm -rf node_modules */node_modules pnpm-lock.yaml
pnpm install
pnpm --filter @seed/database db:migrate reset
pnpm build
pnpm dev
```

### Health Checks

```bash
# Server health
curl http://localhost:8080/health

# Database connection
psql $DATABASE_URL -c "SELECT 1;"

# Frontend running
curl http://localhost:3000
```

### Common Ports

- **3000**: Next.js frontend
- **8080**: Express backend
- **5432**: PostgreSQL database
- **5555**: Prisma Studio

---

## Still Having Issues?

1. Check [GitHub Issues](https://github.com/your-org/seed/issues)
2. Search [Discussions](https://github.com/your-org/seed/discussions)
3. Review documentation in `docs/` folder
4. Contact team on Slack/Discord
5. Create new issue with details above
