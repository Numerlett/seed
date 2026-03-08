# API Reference

Complete reference for all tRPC procedures available in the SEED application.

---

## Authentication Routes (`auth.*`)

### `auth.getUser`

Get the currently authenticated user's profile.

**Type**: Query (Protected)  
**Input**: None  
**Output**: User object

```typescript
const { data: user } = api.auth.getUser.useQuery();

// Response
{
  id: string;
  email: string;
  phone: string | null;
  name: string | null;
  picture: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### `auth.updateUser`

Update the current user's profile information.

**Type**: Mutation (Protected)  
**Input**:

```typescript
{
  name: string;
}
```

**Output**: Updated User object

```typescript
const updateUser = api.auth.updateUser.useMutation();

updateUser.mutate({ name: 'John Doe' });
```

---

### `auth.emailLogin`

Initiate email-based login by sending OTP to user's email.

**Type**: Mutation (Public)  
**Input**:

```typescript
{
  email: string; // Valid email format
}
```

**Output**:

```typescript
{
  success: boolean;
  message: string;
}
```

**Errors:**

- `TOO_MANY_REQUESTS`: Rate limit (1 request per minute)
- `BAD_REQUEST`: Invalid email format

```typescript
const emailLogin = api.auth.emailLogin.useMutation();

emailLogin.mutate({ email: 'user@example.com' });
```

**Notes:**

- Creates new user if email doesn't exist
- Sends welcome email for new users
- OTP expires in 5 minutes
- Maximum 5 verification attempts

---

### `auth.verifyOTP`

Verify OTP code and authenticate user.

**Type**: Mutation (Public)  
**Input**:

```typescript
{
  email: string;
  otp: string; // 6-digit code
}
```

**Output**:

```typescript
{
  success: boolean;
  user: User;
}
```

**Side Effects:**

- Sets access token cookie (1 hour expiry)
- Sets refresh token cookie (7 days expiry)
- Creates refresh token record in database
- Marks OTP as verified

**Errors:**

- `BAD_REQUEST`: Invalid OTP format
- `UNAUTHORIZED`: Invalid or expired OTP
- `TOO_MANY_REQUESTS`: Max attempts exceeded (5)

```typescript
const verifyOTP = api.auth.verifyOTP.useMutation({
  onSuccess: ({ user }) => {
    router.push('/dashboard');
  },
});

verifyOTP.mutate({
  email: 'user@example.com',
  otp: '123456',
});
```

---

### `auth.googleAuth`

Initiate Google OAuth flow.

**Type**: Mutation (Public)  
**Input**: None  
**Output**:

```typescript
{
  authUrl: string; // Redirect user to this URL
}
```

```typescript
const googleAuth = api.auth.googleAuth.useMutation({
  onSuccess: ({ authUrl }) => {
    window.location.href = authUrl;
  },
});

googleAuth.mutate();
```

---

### `auth.googleCallback`

Handle Google OAuth callback and authenticate user.

**Type**: Mutation (Public)  
**Input**:

```typescript
{
  code: string; // Authorization code from Google
}
```

**Output**:

```typescript
{
  success: boolean;
  user: User;
}
```

**Side Effects:**

- Creates/updates user with Google profile data
- Issues access and refresh tokens
- Sets authentication cookies

```typescript
// Typically called by redirect handler
const callback = api.auth.googleCallback.useMutation();

callback.mutate({ code: searchParams.get('code') });
```

---

### `auth.refreshToken`

Exchange refresh token for new access token.

**Type**: Mutation (Public)  
**Input**: None (uses refresh token from cookie)  
**Output**:

```typescript
{
  success: boolean;
}
```

**Side Effects:**

- Issues new access token (1 hour)
- Rotates refresh token (new 7 day token)
- Updates cookie values

**Errors:**

- `UNAUTHORIZED`: Invalid/expired refresh token
- `UNAUTHORIZED`: Revoked refresh token

```typescript
// Usually called automatically by tRPC client
const refresh = api.auth.refreshToken.useMutation();

refresh.mutate();
```

---

### `auth.logout`

End user session and revoke tokens.

**Type**: Mutation (Protected)  
**Input**: None  
**Output**:

```typescript
{
  success: boolean;
}
```

**Side Effects:**

- Revokes current refresh token in database
- Clears access and refresh token cookies

```typescript
const logout = api.auth.logout.useMutation({
  onSuccess: () => {
    router.push('/login');
  },
});

logout.mutate();
```

---

### `auth.getActiveSessions`

Get all active sessions for the current user with enriched device metadata and current session identification.

**Type**: Query (Protected)  
**Input**: None  
**Output**:

```typescript
{
  sessions: Array<{
    id: string;
    clientInfo: unknown;
    createdAt: Date;
    expiresAt: Date;
    lastActiveAt: Date;
    deviceName: string | null;
    deviceType: string | null; // 'desktop' | 'mobile' | 'tablet'
    browser: string | null;
    os: string | null;
    location: string | null;
    ipAddress: string | null;
    loginMethod: string | null; // 'email' | 'google'
  }>;
  currentSessionId: string | null;
}
```

```typescript
const { data } = api.auth.getActiveSessions.useQuery();
// data.sessions — array of active sessions
// data.currentSessionId — ID of the session for the current device
```

---

### `auth.revokeSessionById`

Revoke a specific session/refresh token.

**Type**: Mutation (Protected)  
**Input**:

```typescript
{
  sessionId: string; // Refresh token ID
}
```

**Output**:

```typescript
{
  message: string;
  success: boolean;
}
```

```typescript
const revokeSession = api.auth.revokeSessionById.useMutation();

revokeSession.mutate({ sessionId: 'token_id' });
```

---

### `auth.revokeAllSessions`

Revoke all sessions including the current one. Clears cookies and forces re-authentication everywhere.

**Type**: Mutation (Protected)  
**Input**: None  
**Output**:

```typescript
{
  message: string;
  success: boolean;
  count: number;
}
```

```typescript
const revokeAll = api.auth.revokeAllSessions.useMutation();

revokeAll.mutate();
```

---

### `auth.revokeOtherSessions`

Revoke all sessions except the current one (Instagram-style "Log out of all other devices"). The user stays logged in on the current device.

**Type**: Mutation (Protected)  
**Input**: None  
**Output**:

```typescript
{
  message: string;
  success: boolean;
  count: number;
}
```

```typescript
const revokeOthers = api.auth.revokeOtherSessions.useMutation();

revokeOthers.mutate();
```

---

## Business Routes (`business.*`)

### `business.create`

Create a new business.

**Type**: Mutation (Protected)  
**Input**:

```typescript
{
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoImage?: string; // URL or base64
}
```

**Output**: Business object

```typescript
const createBusiness = api.business.create.useMutation();

createBusiness.mutate({
  name: 'My Store',
  description: 'A retail business',
  email: 'contact@mystore.com',
});
```

**Constraints:**

- Business name must be unique per user
- Email must be valid format if provided

---

### `business.list`

Get all businesses owned by current user.

**Type**: Query (Protected)  
**Input**: None  
**Output**: Array of Business objects

```typescript
const { data: businesses } = api.business.list.useQuery();

// Response
[{
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  logoImage: string | null;
  website: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}]
```

---

### `business.get`

Get a specific business by ID.

**Type**: Query (Protected)  
**Input**:

```typescript
{
  businessId: string;
}
```

**Output**: Business object

**Errors:**

- `NOT_FOUND`: Business not found
- `FORBIDDEN`: User doesn't own this business

```typescript
const { data: business } = api.business.get.useQuery({
  businessId: 'business_id',
});
```

---

### `business.update`

Update business information.

**Type**: Mutation (Protected)  
**Input**:

```typescript
{
  businessId: string;
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoImage?: string;
}
```

**Output**: Updated Business object

```typescript
const updateBusiness = api.business.update.useMutation();

updateBusiness.mutate({
  businessId: 'business_id',
  name: 'Updated Store Name',
  description: 'New description',
});
```

---

### `business.delete`

Delete a business.

**Type**: Mutation (Protected)  
**Input**:

```typescript
{
  businessId: string;
}
```

**Output**:

```typescript
{
  success: boolean;
}
```

**Side Effects:**

- Permanently deletes business
- Cascades to related data (inventory, sales, etc.)

```typescript
const deleteBusiness = api.business.delete.useMutation();

deleteBusiness.mutate({ businessId: 'business_id' });
```

---

## Inventory Routes (`inventory.*`)

Inventory routes manage products within a business context.

### `inventory.addProduct`

Add a new product to inventory.

**Type**: Mutation (Protected)

---

### `inventory.getProductCount`

Get total product count for a business.

**Type**: Query (Protected)

---

### `inventory.getProducts`

List products with pagination and filtering.

**Type**: Query (Protected)

---

### `inventory.getProductById`

Get a single product by ID.

**Type**: Query (Protected)

---

### `inventory.updateProduct`

Update product details.

**Type**: Mutation (Protected)

---

### `inventory.deleteProduct`

Delete a product.

**Type**: Mutation (Protected)

---

### `inventory.bulkDeleteProducts`

Delete multiple products at once.

**Type**: Mutation (Protected)

---

## Error Responses

All tRPC procedures can throw errors with the following structure:

```typescript
{
  message: string; // User-friendly error message
  code: string; // HTTP status code as string
  data: {
    code: string; // tRPC error code
    httpStatus: number;
    path: string;
    zodError?: ZodError; // If validation failed
  }
}
```

### Common Error Codes

| Code                    | HTTP Status | Meaning                                 |
| ----------------------- | ----------- | --------------------------------------- |
| `UNAUTHORIZED`          | 401         | Missing or invalid authentication       |
| `FORBIDDEN`             | 403         | Valid auth but insufficient permissions |
| `NOT_FOUND`             | 404         | Resource doesn't exist                  |
| `BAD_REQUEST`           | 400         | Invalid input data                      |
| `TOO_MANY_REQUESTS`     | 429         | Rate limit exceeded                     |
| `INTERNAL_SERVER_ERROR` | 500         | Server error                            |

---

## Type Utilities

### Router Types

```typescript
import type { AppRouter } from '@seed/server';

// Input types
type AuthInput = AppRouter['auth']['emailLogin']['_def']['$types']['input'];

// Output types
type UserOutput = AppRouter['auth']['getUser']['_def']['$types']['output'];
```

### Inferred Types

```typescript
// From tRPC router
import { AppRouterInputType, AppRouterOutputType } from '@seed/server';

type EmailLoginInput = AppRouterInputType['auth']['emailLogin'];
type UserType = AppRouterOutputType['auth']['getUser'];
```

---

## Client Usage Examples

### React Hooks (Frontend)

```tsx
'use client';
import { api } from '@seed/api';

function MyComponent() {
  // Query
  const { data, isLoading, error } = api.auth.getUser.useQuery();

  // Mutation
  const updateUser = api.auth.updateUser.useMutation({
    onSuccess: () => {
      console.log('User updated');
    },
    onError: (error) => {
      console.error(error.message);
    },
  });

  return (
    <button onClick={() => updateUser.mutate({ name: 'New Name' })}>
      Update
    </button>
  );
}
```

### Vanilla Client (Non-React)

```typescript
import { createTRPCClient } from '@seed/api/client';

const client = createTRPCClient();

// Query
const user = await client.auth.getUser.query();

// Mutation
const result = await client.auth.emailLogin.mutate({
  email: 'user@example.com',
});
```

### Server-Side (Next.js)

```typescript
import { createTRPCCaller } from '@seed/api/server';

// In Server Component or API route
const trpc = await createTRPCCaller({ req, res });

const user = await trpc.auth.getUser();
```

---

## Rate Limiting

Current rate limits:

| Endpoint          | Limit      | Window          |
| ----------------- | ---------- | --------------- |
| `auth.emailLogin` | 1 request  | 60 seconds      |
| `auth.verifyOTP`  | 5 attempts | Per OTP session |

_Global rate limiting to be implemented_

---

## Webhooks

_Not yet implemented_

Planned webhook events:

- `user.created`
- `user.updated`
- `business.created`
- `business.updated`
- `business.deleted`

---

## Admin Routes (`admin.*`)

All admin routes require the user to be authenticated **and** have an active record in the `Admin` table. Super admin routes additionally require `isSuperAdmin: true`.

### Admin Auth (`admin.auth.*`)

#### `admin.auth.getAdminMe`

Get the current admin's record with associated user info.

**Type**: Query (Admin)
**Input**: None
**Output**:

```typescript
{
  id: string;
  userId: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
  }
}
```

```typescript
const { data: admin } = api.admin.auth.getAdminMe.useQuery();
```

---

### Admin User Management (`admin.users.*`)

#### `admin.users.listUsers`

List all platform users with pagination and search.

**Type**: Query (Admin)
**Input**:

```typescript
{
  page?: number;       // default: 1
  limit?: number;      // default: 20, max: 100
  search?: string;     // name, email, or phone
  sortOrder?: 'asc' | 'desc'; // default: 'desc'
}
```

**Output**: `{ users: User[], total, page, limit, totalPages }`

---

#### `admin.users.getUserDetail`

Get detailed user info including businesses owned, memberships, and session count.

**Type**: Query (Admin)
**Input**: `{ userId: string }`
**Output**: User with relations

---

#### `admin.users.deleteUser`

Permanently delete a user. **Super Admin only.**

**Type**: Mutation (Super Admin)
**Input**: `{ userId: string }`

---

### Admin Business Management (`admin.businesses.*`)

#### `admin.businesses.listBusinesses`

List all businesses with pagination and search.

**Type**: Query (Admin)
**Input**:

```typescript
{
  page?: number;
  limit?: number;
  search?: string;
  sortOrder?: 'asc' | 'desc';
}
```

**Output**: `{ businesses: Business[], total, page, limit, totalPages }`

---

#### `admin.businesses.getBusinessDetail`

Get detailed business info including members, products count, and warehouses count.

**Type**: Query (Admin)
**Input**: `{ businessId: string }`

---

#### `admin.businesses.deleteBusiness`

Permanently delete a business. **Super Admin only.**

**Type**: Mutation (Super Admin)
**Input**: `{ businessId: string }`

---

### Admin Analytics (`admin.analytics.*`)

#### `admin.analytics.getPlatformStats`

Get high-level platform statistics.

**Type**: Query (Admin)
**Output**:

```typescript
{
  totalUsers: number;
  totalBusinesses: number;
  totalAdmins: number;
  activeSessions: number;
  newUsersLast7d: number;
  newUsersLast30d: number;
  newBusinessesLast7d: number;
  newBusinessesLast30d: number;
}
```

---

#### `admin.analytics.getUserGrowth`

Get user registration time-series data.

**Type**: Query (Admin)
**Input**: `{ range: '7d' | '30d' | '90d' | '1y' }`
**Output**: `Array<{ date: string; count: number }>`

---

#### `admin.analytics.getBusinessGrowth`

Get business creation time-series data.

**Type**: Query (Admin)
**Input**: `{ range: '7d' | '30d' | '90d' | '1y' }`
**Output**: `Array<{ date: string; count: number }>`

---

#### `admin.analytics.getTopBusinesses`

Get top businesses by member or product count.

**Type**: Query (Admin)
**Input**: `{ limit?: number; sortBy?: 'members' | 'products' | 'transactions' }`
**Output**: `Business[]` with `_count.members` and `_count.products`

---

### Admin Settings (`admin.settings.*`)

#### `admin.settings.getSettings`

Get all system settings.

**Type**: Query (Admin)
**Output**: `{ settings: SystemSetting[], settingsMap: Record<string, unknown> }`

---

#### `admin.settings.updateSetting`

Create or update a system setting. **Super Admin only.**

**Type**: Mutation (Super Admin)
**Input**: `{ key: string; value: any }`
**Output**: Updated `SystemSetting`

---

### Admin Audit Log (`admin.auditLog.*`)

#### `admin.auditLog.getAuditLogs`

Get audit logs with pagination and filters.

**Type**: Query (Admin)
**Input**:

```typescript
{
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
}
```

**Output**: `{ logs: AuditLog[], total, page, limit, totalPages }`

---

### Admin Management (`admin.management.*`)

All routes in this group require **Super Admin** privileges.

#### `admin.management.listAdmins`

List all admin records with associated user info.

**Type**: Query (Super Admin)
**Output**: `Admin[]` with `.user` relation

---

#### `admin.management.activateAdmin`

Activate a deactivated admin.

**Type**: Mutation (Super Admin)
**Input**: `{ adminId: string }`

---

#### `admin.management.deactivateAdmin`

Deactivate an admin. Cannot deactivate yourself.

**Type**: Mutation (Super Admin)
**Input**: `{ adminId: string }`

---

#### `admin.management.toggleSuperAdmin`

Promote or demote an admin's super admin status. Cannot change your own status.

**Type**: Mutation (Super Admin)
**Input**: `{ adminId: string; isSuperAdmin: boolean }`

---

## API Versioning

Current version: **v1** (implicit)

Future versions will be namespaced:

```typescript
// v2 example
api.v2.auth.login.mutate({ ... });
```
