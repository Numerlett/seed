import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { createTRPCContext } from '../trpc/context';
import { authRoutes } from './auth';
import { t } from '../trpc';
import { businessRoutes } from './business';
import { inventoryRoutes } from './inventory';
import { categoryRoutes } from './category';
import { s3Routes } from './s3';
import { partyRoutes } from './party';
import { dashboardRoutes } from './dashboard';
import { warehouseRoutes } from './warehouse';
import { batchRoutes } from './batch';
import { stockRoutes } from './stock';
import { purchaseRoutes } from './purchase';
import { salesRoutes } from './sales';
import { returnsRoutes } from './returns';
import { stockopsRoutes } from './stockops';
import { adminRoutes } from './admin';
import { taxRoutes } from '../modules/tax/routers';
import { accountingRoutes } from '../modules/accounting/routers';
import { paymentsRoutes } from '../modules/payments/routers';
import { manufacturingRoutes } from '../modules/manufacturing/routers';
import { crmRoutes } from '../modules/crm/routers';
import { reportsRoutes } from '../modules/reports/routers';
import { communicationsRoutes } from '../modules/communications/routers';

export const appRouter = t.router({
  auth: authRoutes,
  business: businessRoutes,
  dashboard: dashboardRoutes,
  inventory: inventoryRoutes,
  category: categoryRoutes,
  party: partyRoutes,
  s3: s3Routes,
  warehouse: warehouseRoutes,
  batch: batchRoutes,
  stock: stockRoutes,
  purchase: purchaseRoutes,
  sales: salesRoutes,
  returns: returnsRoutes,
  stockops: stockopsRoutes,
  admin: adminRoutes,
  tax: taxRoutes,
  accounting: accountingRoutes,
  payments: paymentsRoutes,
  manufacturing: manufacturingRoutes,
  crm: crmRoutes,
  reports: reportsRoutes,
  communications: communicationsRoutes,
});

export const trpcExpress = createExpressMiddleware({
  router: appRouter,
  createContext: createTRPCContext,
});

export type AppRouter = typeof appRouter;

export type AppRouterOutputType = inferRouterOutputs<AppRouter>;

export type AppRouterInputType = inferRouterInputs<AppRouter>;
