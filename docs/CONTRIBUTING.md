# Contributing to SEED

Thank you for your interest in contributing to SEED! This document provides guidelines and best practices for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. Read the [README.md](../README.md)
2. Set up your development environment following [DEVELOPMENT.md](DEVELOPMENT.md)
3. Familiarized yourself with the [ARCHITECTURE.md](ARCHITECTURE.md)

### Finding Issues to Work On

- Check the [Issues](https://github.com/your-org/seed/issues) page
- Look for issues labeled `good first issue` or `help wanted`
- Comment on an issue to express interest before starting work
- Wait for maintainer approval before beginning

---

## Development Process

### 1. Fork and Clone

```bash
# Fork repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/seed.git
cd seed

# Add upstream remote
git remote add upstream https://github.com/original-org/seed.git
```

### 2. Create a Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

**Branch Naming Conventions:**

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

### 3. Make Changes

Follow the coding standards and best practices outlined in this document.

```bash
# Make your changes
# Test thoroughly
# Commit with meaningful messages
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add user profile functionality"
```

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**

```bash
git commit -m "feat(auth): implement password reset functionality"
git commit -m "fix(database): resolve connection timeout issue"
git commit -m "docs(api): update authentication endpoints documentation"
```

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

---

## Pull Request Process

### Before Submitting

✅ **Checklist:**

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] New code has appropriate test coverage
- [ ] Documentation is updated (if needed)
- [ ] No console.log statements or commented code
- [ ] Environment variables documented (if new ones added)
- [ ] Database migrations created (if schema changed)
- [ ] Types are properly defined
- [ ] No TypeScript errors (`pnpm lint`)

### PR Title Format

Follow conventional commits format:

```
feat(auth): add two-factor authentication
fix(business): resolve duplicate name validation
docs(readme): update installation instructions
```

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue

Fixes #123

## Changes Made

- Added X functionality
- Fixed Y bug
- Updated Z documentation

## Screenshots (if applicable)

[Add screenshots]

## Testing Done

- [ ] Tested locally
- [ ] Added unit tests
- [ ] Tested in different browsers

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, PR will be merged

### After PR is Merged

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Delete feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

---

## Coding Standards

### TypeScript

#### Type Safety

```typescript
// ✅ Good: Explicit types
function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

// ❌ Bad: Using 'any'
function getUserById(id: any): any {
  return prisma.user.findUnique({ where: { id } });
}

// ✅ Good: Use unknown for truly unknown types
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
}
```

#### Interfaces vs Types

```typescript
// ✅ Use interfaces for object shapes
interface User {
  id: string;
  email: string;
  name?: string;
}

// ✅ Use types for unions, intersections
type Status = 'active' | 'inactive' | 'pending';
type UserWithBusiness = User & { business: Business };
```

### React/Next.js

#### Component Structure

```tsx
// ✅ Good: Clear component structure
'use client'; // Only when needed

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface UserCardProps {
  user: User;
  onUpdate?: (user: User) => void;
}

export function UserCard({ user, onUpdate }: UserCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdate?.(user);
    setIsEditing(false);
  };

  return <div>{/* Component JSX */}</div>;
}
```

#### Server vs Client Components

```tsx
// ✅ Server Component (default)
export default function Page() {
  return <div>Static content</div>;
}

// ✅ Client Component (when needed)
('use client');
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### API Design

#### tRPC Procedures

```typescript
// ✅ Good: Clear input validation
export const createBusiness = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(100),
      email: z.string().email().optional(),
      description: z.string().max(500).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    return await prisma.business.create({
      data: {
        ...input,
        ownerId: ctx.userId,
      },
    });
  });

// ❌ Bad: No input validation
export const createBusiness = protectedProcedure.mutation(
  async ({ input, ctx }) => {
    return await prisma.business.create({
      data: { ...input, ownerId: ctx.userId },
    });
  },
);
```

#### Error Handling

```typescript
// ✅ Good: Specific error messages
if (!business) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'Business not found',
  });
}

// ❌ Bad: Generic errors
throw new Error('Something went wrong');
```

### Database Queries

```typescript
// ✅ Good: Select only needed fields
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
  },
});

// ❌ Bad: Fetch all fields unnecessarily
const user = await prisma.user.findUnique({
  where: { id },
});

// ✅ Good: Use transactions for multiple operations
await prisma.$transaction(async (tx) => {
  await tx.user.update({ ... });
  await tx.business.create({ ... });
});
```

### Styling

```tsx
// ✅ Good: Use Tailwind with cn utility
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  className
)}>
  Content
</div>

// ✅ Good: Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  Items
</div>
```

---

## Testing Guidelines

### Unit Tests

```typescript
// tests/utils/auth.test.ts
import { describe, it, expect } from 'vitest';
import { generateTokens } from '@/helpers/auth';

describe('generateTokens', () => {
  it('should generate valid access and refresh tokens', () => {
    const tokens = generateTokens({ userId: 'test-id' });

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// tests/api/auth.test.ts
import { describe, it, expect } from 'vitest';
import { createCaller } from '@/server/routers';

describe('auth.getUser', () => {
  it('should return user for authenticated request', async () => {
    const caller = createCaller({ userId: 'test-id' });
    const user = await caller.auth.getUser();

    expect(user.id).toBe('test-id');
  });
});
```

### Testing Checklist

- [ ] Unit tests for utility functions
- [ ] Integration tests for API endpoints
- [ ] Test edge cases and error scenarios
- [ ] Test authentication flows
- [ ] Test database operations

---

## Documentation

### Code Comments

```typescript
// ✅ Good: Explain why, not what
// Use exponential backoff to prevent rate limit errors
const retryWithBackoff = async (fn: Function, attempts = 3) => {
  // Implementation
};

// ❌ Bad: Obvious comments
// This function adds two numbers
function add(a: number, b: number) {
  return a + b; // Return the sum
}
```

### JSDoc for Functions

```typescript
/**
 * Sends an OTP email to the specified email address
 *
 * @param email - Recipient email address
 * @param otp - 6-digit one-time password
 * @param expiresAt - OTP expiration timestamp
 * @returns Promise resolving to email send status
 * @throws {Error} If email service is unavailable
 */
async function sendOTPEmail(
  email: string,
  otp: string,
  expiresAt: Date,
): Promise<boolean> {
  // Implementation
}
```

### README Updates

When adding new features, update:

- Feature list
- Installation steps (if changed)
- Configuration (if new env vars)
- Usage examples

---

## Issue Reporting

### Bug Reports

**Template:**

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**

1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Screenshots**
If applicable

**Environment**

- OS: [e.g., macOS 12.0]
- Browser: [e.g., Chrome 120]
- Node: [e.g., v20.0.0]
- Package version: [e.g., 1.0.0]

**Additional Context**
Any other relevant information
```

### Feature Requests

**Template:**

```markdown
**Feature Description**
Clear description of the feature

**Problem it Solves**
What problem does this address?

**Proposed Solution**
How should it work?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Mockups, examples, etc.
```

---

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Creating a Release

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.2.0`
4. Push tag: `git push origin v1.2.0`
5. Create GitHub release

---

## Questions?

If you have questions:

- Check existing documentation
- Search closed issues
- Ask in discussions
- Contact maintainers

Thank you for contributing to SEED! 🌱
