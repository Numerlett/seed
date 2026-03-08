# Web Package

Next.js frontend application for the SEED retail management system.

## Overview

This package is the user-facing web application built with Next.js 16, React 19, Tailwind CSS v4, and shadcn/ui (Radix). It consumes the backend API via tRPC hooks provided by the `@seed/api` package.

## Structure

```
web/
├── app/                   # Next.js App Router
│   ├── (auth)/            # Auth route group (login, OTP verification)
│   ├── (main)/            # Protected routes (dashboard, business modules)
│   │   ├── dashboard/
│   │   ├── businesses/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── purchases/
│   │   ├── returns/
│   │   ├── parties/
│   │   ├── warehouses/
│   │   ├── batches/
│   │   ├── stock-ops/
│   │   └── layout.tsx
│   ├── (admin)/           # Admin dashboard route group
│   │   ├── layout.tsx     # Admin layout (sidebar + header + guard)
│   │   └── admin/         # Admin pages
│   │       ├── page.tsx           # Dashboard overview
│   │       ├── users/             # User management
│   │       ├── businesses/        # Business management
│   │       ├── analytics/         # Growth charts
│   │       ├── audit-log/         # Admin action log
│   │       ├── settings/          # System settings
│   │       └── admins/            # Admin management
│   ├── (public)/          # Public routes (landing page)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/                # shadcn/Radix UI primitives
│   ├── admin/             # Admin panel (AdminGuard, AdminNavBar, AdminHeader)
│   ├── auth/              # Auth components
│   ├── dashboard/         # Dashboard widgets
│   ├── inventory/         # Inventory components
│   ├── sales/             # Sales components
│   ├── purchases/         # Purchase components
│   ├── returns/           # Returns components
│   ├── parties/           # Party components
│   ├── warehouses/        # Warehouse components
│   ├── batches/           # Batch components
│   ├── stock/             # Stock components
│   ├── stockops/          # Stock operations components
│   ├── home/              # Landing page sections
│   ├── main/              # Main layout components
│   ├── shared/            # Shared/reusable components
│   ├── animations/        # Animation components
│   └── profile/           # Profile components
├── providers/             # React context providers
│   ├── AdminProvider.tsx      # Admin role context
│   ├── BusinessProvider.tsx   # Active business context
│   ├── CategoriesProvider.tsx # Categories context
│   ├── DataProvider.tsx       # Shared data context
│   ├── SessionProvider.tsx    # Auth session context
│   ├── ThemeProvider.tsx      # Dark/light mode
│   └── TRPCProvider.tsx       # tRPC + React Query
├── auth/                  # Auth utilities (AuthGuard)
├── hooks/                 # Custom React hooks
│   ├── useDebounce.tsx
│   ├── useIsMobile.tsx
│   └── useLocalState.tsx
├── lib/                   # Utilities (cn, schemas)
├── utils/                 # Helpers (data, fonts, images, themes)
└── public/                # Static assets
```

## Route Groups

| Group      | Path         | Description                           |
| ---------- | ------------ | ------------------------------------- |
| `(auth)`   | `/login`, `/auth` | Login and OTP verification       |
| `(main)`   | `/dashboard`, `/businesses`, etc. | Protected business modules |
| `(admin)`  | `/admin/*`   | Admin dashboard (requires admin role) |
| `(public)` | `/`          | Public landing page                   |

## Scripts

```bash
# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start

# Lint
pnpm lint
```

## Key Features

- **App Router**: File-based routing with route groups and layouts
- **shadcn/ui**: 30+ Radix-based UI components
- **Tailwind CSS v4**: Utility-first styling
- **tRPC Hooks**: Type-safe API calls via `clientTrpc`
- **AuthGuard**: Protects routes from unauthenticated access
- **AdminGuard**: Gates admin pages with role check
- **Theme**: Dark/light mode toggle with persistence
- **Responsive**: Mobile-friendly layout

## Environment Variables

```env
NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:8080
```

## Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives)
