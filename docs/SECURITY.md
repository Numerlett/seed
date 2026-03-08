# Security Documentation

This document outlines security measures, best practices, and threat mitigations implemented in the SEED application.

---

## Table of Contents

- [Authentication Security](#authentication-security)
- [Authorization](#authorization)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Database Security](#database-security)
- [Infrastructure Security](#infrastructure-security)
- [Security Best Practices](#security-best-practices)
- [Incident Response](#incident-response)

---

## Authentication Security

### Token-Based Authentication

**Access Tokens:**

- **Lifetime**: 1 hour (configurable)
- **Storage**: HTTP-only cookies
- **Algorithm**: RS256 or HS256 JWT
- **Claims**: userId, email, iat, exp

**Refresh Tokens:**

- **Lifetime**: 7 days (configurable)
- **Storage**: Database + HTTP-only cookie
- **Rotation**: New token issued on each refresh
- **Revocation**: Supported via database flag

### Token Implementation

```typescript
// Access Token Generation
const accessToken = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.ACCESS_TOKEN_SECRET!,
  { expiresIn: '1h', algorithm: 'HS256' },
);

// Refresh Token with Rotation
const newRefreshToken = jwt.sign(
  { userId: user.id, tokenId: refreshTokenRecord.id },
  process.env.REFRESH_TOKEN_SECRET!,
  { expiresIn: '7d', algorithm: 'HS256' },
);

// Revoke old token when issuing new one
await prisma.refreshToken.update({
  where: { id: oldTokenId },
  data: { isRevoked: true },
});
```

### OTP Security

**Generation:**

- 6-digit random code
- Cryptographically secure generation
- Single-use only

**Expiration:**

- 5-minute validity window
- Automatic cleanup of expired OTPs

**Rate Limiting:**

- 1 OTP request per minute per email
- Maximum 5 verification attempts
- Account lockout after 5 failed attempts

**Implementation:**

```typescript
// Generate secure OTP
const otp = crypto.randomInt(100000, 999999).toString();

// Store with expiration
await prisma.otp.create({
  data: {
    email,
    otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
  },
});

// Validate with attempt tracking
const otpRecord = await prisma.otp.findFirst({
  where: {
    email,
    otp,
    expiresAt: { gt: new Date() },
    attempts: { lt: 5 },
    verifiedAt: null,
  },
});

if (!otpRecord) {
  // Increment attempts
  await prisma.otp.updateMany({
    where: { email, otp },
    data: { attempts: { increment: 1 } },
  });
  throw new Error('Invalid or expired OTP');
}
```

### OAuth 2.0 Security

**Google OAuth Implementation:**

```typescript
// Use PKCE flow for added security
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['email', 'profile'],
  state: crypto.randomBytes(32).toString('hex'), // CSRF protection
});

// Validate state parameter on callback
if (req.query.state !== req.session.oauthState) {
  throw new Error('Invalid state parameter');
}
```

---

## Session Management

### Device-Aware Sessions (Instagram-Style)

Each login creates a `RefreshToken` record enriched with structured device metadata, enabling users to review exactly where they are logged in.

**Stored per session:**

| Field          | Description                                      |
| -------------- | ------------------------------------------------ |
| `deviceName`   | Human-readable label, e.g. "Chrome 120 on macOS" |
| `deviceType`   | `desktop`, `mobile`, or `tablet`                 |
| `browser`      | Parsed browser name + version                    |
| `os`           | Parsed operating system                          |
| `ipAddress`    | Client IP (first entry from `x-forwarded-for`)   |
| `location`     | Optional geo-location string                     |
| `loginMethod`  | `email` or `google`                              |
| `lastActiveAt` | Updated on every token refresh                   |

### Current Session Identification

When fetching active sessions, the API compares the caller's refresh token against the database to return a `currentSessionId`, allowing the UI to label the entry as **"This device"**.

### Session Revocation

| Action                       | Endpoint                   | Behavior                                        |
| ---------------------------- | -------------------------- | ----------------------------------------------- |
| Revoke single session        | `auth.revokeSessionById`   | Ends a specific device's session                |
| Log out of all other devices | `auth.revokeOtherSessions` | Keeps the current session, revokes all others   |
| Log out everywhere           | `auth.revokeAllSessions`   | Revokes every session including the current one |

### Last-Active Tracking

Each time a refresh token is used to obtain a new access token, the session's `lastActiveAt` timestamp is updated. The UI renders this as a relative time string ("Active now", "2 hours ago", "3 days ago") to help users spot stale or suspicious sessions.

### Token Cleanup

A helper (`cleanupExpiredTokens`) can be invoked via `auth.cleanupTokens` or scheduled as a cron job. It removes:

- Tokens past their `expiresAt` date
- Revoked tokens older than 7 days

---

## Authorization

### Role-Based Access Control

**Current Implementation:**

- User owns their data
- User owns businesses they create
- Business owner has full control

**Example Authorization Check:**

```typescript
export const getBusiness = protectedProcedure
  .input(z.object({ businessId: z.string() }))
  .query(async ({ input, ctx }) => {
    const business = await prisma.business.findUnique({
      where: { id: input.businessId },
    });

    // Verify ownership
    if (business?.ownerId !== ctx.userId) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have access to this business',
      });
    }

    return business;
  });
```

### Future RBAC Implementation

**Planned Business-Level Roles:**

- Owner: Full access
- Manager: Manage inventory, sales
- Employee: View only, record sales

**Permission Structure:**

```typescript
interface Permission {
  resource: 'business' | 'inventory' | 'sales' | 'users';
  action: 'create' | 'read' | 'update' | 'delete';
}

interface Role {
  name: string;
  permissions: Permission[];
}
```

### Platform Admin Authorization

**Admin roles are enforced via tRPC middleware:**

1. `isAdmin` middleware — chains after `isAuthed`, performs a DB lookup on the `Admin` table using `ctx.userId`, and rejects if no active admin record exists.
2. `isSuperAdminMiddleware` — chains after `isAdmin`, checks `ctx.isSuperAdmin` and rejects non-super-admins.

**Procedure chain:**

```typescript
// Regular admin: isAuthed → isAdmin
export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin);

// Super admin: isAuthed → isAdmin → isSuperAdminMiddleware
export const superAdminProcedure = t.procedure
  .use(isAuthed)
  .use(isAdmin)
  .use(isSuperAdminMiddleware);
```

**Key design decisions:**

- Admin uses the **same auth system** as regular users (same JWT tokens, same login flow)
- No separate admin cookies or tokens — admin status is determined by a DB lookup on every request
- Admin record has `isActive` flag allowing deactivation without deleting the record
- Super admin actions (delete user, modify settings, manage admins) are audit-logged

**Frontend protection:**

- `AdminProvider` queries `admin.auth.getAdminMe` on mount
- `AdminGuard` component blocks non-admins with appropriate UI (login redirect or access denied)
- Super-admin-only UI elements check `isSuperAdmin` from context

---

## Data Protection

### Sensitive Data Handling

**What NOT to Store:**

- ❌ Passwords (we use passwordless auth)
- ❌ Credit card numbers
- ❌ Social security numbers
- ❌ Unencrypted secrets

**What to Encrypt:**

- ✅ Refresh tokens (hashed)
- ✅ API keys (if stored)
- ✅ OAuth tokens (if stored)

### Data Encryption

**At Rest:**

- Database encryption enabled (cloud provider)
- Encrypted backups
- Secure key management (AWS KMS, Google Cloud KMS)

**In Transit:**

- HTTPS/TLS 1.3 for all communications
- Secure WebSocket connections (WSS)
- Certificate pinning for mobile apps

### Personal Data (GDPR Compliance)

**User Rights:**

- Right to access: `GET /api/user/data`
- Right to deletion: `DELETE /api/user/account`
- Right to portability: Export user data

**Data Retention:**

```typescript
// Auto-delete expired tokens
async function cleanupExpiredTokens() {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  // Delete old OTPs
  await prisma.otp.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { verifiedAt: { not: null } }],
    },
  });
}
```

---

## API Security

### CORS Configuration

```typescript
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Single trusted origin
    credentials: true, // Allow cookies
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
```

**Production CORS:**

```typescript
// Strict production CORS
const allowedOrigins = ['https://yourdomain.com', 'https://www.yourdomain.com'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);
```

### Rate Limiting

**Global Rate Limit:**

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);
```

**Endpoint-Specific Limits:**

```typescript
// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 attempts
  skipSuccessfulRequests: true,
});

app.use('/api/auth.emailLogin', authLimiter);
app.use('/api/auth.verifyOTP', authLimiter);
```

### Input Validation

**Using Zod for Runtime Validation:**

```typescript
import { z } from 'zod';

// Define strict schemas
const createBusinessSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  website: z.string().url().optional(),
  description: z.string().max(500).optional(),
});

// Use in procedures
export const createBusiness = protectedProcedure
  .input(createBusinessSchema)
  .mutation(async ({ input, ctx }) => {
    // Input is validated and typed
    return await prisma.business.create({
      data: { ...input, ownerId: ctx.userId },
    });
  });
```

### SQL Injection Prevention

**Using Prisma ORM:**

- Parameterized queries (built-in)
- No raw SQL strings
- Type-safe queries

```typescript
// ✅ Safe: Prisma handles parameterization
const user = await prisma.user.findUnique({
  where: { email: userInput },
});

// ❌ Never do this (if using raw queries):
// const user = await prisma.$queryRaw`SELECT * FROM users WHERE email = '${userInput}'`;

// ✅ If raw query needed, use parameters:
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;
```

### XSS Prevention

**Server-Side:**

- Validate and sanitize all inputs
- Use Content Security Policy headers

**Client-Side:**

- React automatically escapes values
- Avoid `dangerouslySetInnerHTML`
- Sanitize user-generated HTML

```typescript
// Set security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  );
  next();
});
```

---

## Database Security

### Connection Security

```typescript
// Use SSL for database connections
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?sslmode=require',
    },
  },
});
```

### Access Control

**Principle of Least Privilege:**

```sql
-- Create read-only user for reporting
CREATE USER reporter WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE seeddb TO reporter;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporter;

-- Application user with limited permissions
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- No DROP, ALTER, or TRUNCATE permissions
```

### Backup Security

- Encrypted backups
- Secure storage (S3 with encryption)
- Access logging
- Regular restore tests

---

## Infrastructure Security

### Environment Variables

**Never commit to git:**

```bash
# .gitignore
.env
.env.*
!.env.example
```

**Use secrets management:**

- AWS Secrets Manager
- Google Cloud Secret Manager
- HashiCorp Vault
- Railway/Vercel environment variables

### Docker Security

```dockerfile
# Use non-root user
FROM node:20-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Don't include secrets in image
# Use environment variables or mounted secrets

# Scan for vulnerabilities
# docker scan seed-server:latest
```

### Network Security

**Firewall Rules:**

- Allow only necessary ports (80, 443, 8080)
- Restrict database access to application servers
- Use VPC/private networks

**Security Groups (AWS):**

```yaml
InboundRules:
  - Port: 443
    Source: 0.0.0.0/0 # HTTPS from anywhere
  - Port: 8080
    Source: LoadBalancerSecurityGroup # App server from LB only
  - Port: 5432
    Source: AppServerSecurityGroup # Database from app only
```

---

## Security Best Practices

### Development

1. **Never commit secrets**

   ```bash
   # Use git-secrets to prevent accidents
   git secrets --install
   git secrets --register-aws
   ```

2. **Use environment variables**

   ```typescript
   // ✅ Good
   const secret = process.env.JWT_SECRET;

   // ❌ Bad
   const secret = 'hardcoded-secret';
   ```

3. **Keep dependencies updated**

   ```bash
   pnpm audit
   pnpm update
   ```

4. **Use TypeScript strict mode**
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true
     }
   }
   ```

### Production

1. **Enable HTTPS only**
2. **Use secure cookies**

   ```typescript
   res.cookie('token', token, {
     httpOnly: true,
     secure: true, // HTTPS only
     sameSite: 'strict',
     maxAge: 3600000,
   });
   ```

3. **Implement rate limiting**
4. **Monitor for suspicious activity**
5. **Regular security audits**
6. **Automated vulnerability scanning**

### Code Review Checklist

- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Authorization checks in place
- [ ] SQL injection prevention
- [ ] XSS prevention measures
- [ ] CSRF protection (for state-changing operations)
- [ ] Rate limiting on sensitive endpoints
- [ ] Proper error handling (no sensitive info in errors)

---

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitoring alerts trigger
2. **Assess**: Determine severity and scope
3. **Contain**: Isolate affected systems
4. **Eradicate**: Remove threat
5. **Recover**: Restore normal operations
6. **Learn**: Post-mortem and prevention

### Breach Response

**Immediate Actions:**

1. Rotate all secrets (JWT secrets, API keys)
2. Revoke all active sessions
3. Enable additional logging
4. Notify affected users (if required by law)
5. Document incident

**Commands:**

```bash
# Revoke all refresh tokens
UPDATE refresh_tokens SET is_revoked = true;

# Force all users to re-login by rotating secret
# Update ACCESS_TOKEN_SECRET in environment
# Restart application
```

### Contact

**Security Issues:**
Report via: security@yourdomain.com

**PGP Key:** [Include public key]

**Response Time:** Within 24 hours

---

## Security Checklist

### Pre-Launch

- [ ] All secrets rotated from development
- [ ] HTTPS enabled and enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Error tracking configured
- [ ] Security audit completed
- [ ] Penetration testing done
- [ ] Incident response plan documented

### Ongoing

- [ ] Weekly dependency updates
- [ ] Monthly security reviews
- [ ] Quarterly penetration tests
- [ ] Regular backup testing
- [ ] Monitor security bulletins
- [ ] Review access logs
- [ ] Rotate secrets every 90 days

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Prisma Security](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
