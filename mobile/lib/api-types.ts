import type { AppRouterInputType, AppRouterOutputType } from '@seed/server';

// Type-only imports (elided at runtime). Reliable inference of every procedure's
// input/output — prefer these over ReturnType<typeof trpc.x.useQuery> which is
// unreliable on tRPC's overloaded hooks.
export type RouterOutputs = AppRouterOutputType;
export type RouterInputs = AppRouterInputType;
