'use server';

import { serverTrpc } from '@seed/api/server';

export const getUser = async () => {
  try {
    const user = await serverTrpc.auth.getUser.query();
    return user;
  } catch {
    return null;
  }
};

export * from './AuthGuard';
