import { AppRouter } from '@seed/server';
import { createTRPCReact, type CreateTRPCReact } from '@trpc/react-query';

export const clientTrpc: CreateTRPCReact<AppRouter, unknown> =
  createTRPCReact<AppRouter>();
