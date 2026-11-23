import { t } from '../trpc';
import { protectedProcedure } from '../trpc/procedures';

/**
 * Deployment-level facts the frontend needs in order to present features
 * honestly.
 *
 * Without this the UI has no way to know that e-invoicing or online payments
 * are unconfigured until the user clicks the button and gets an error. The
 * missing variable names are deliberately not returned — knowing a feature is
 * unavailable is what the UI needs; knowing the server's environment layout is
 * not.
 */
export const systemRoutes = t.router({
  getIntegrationStatus: protectedProcedure.query(async () => {
    const { allIntegrationStatuses } = await import('@seed/integrations');
    return allIntegrationStatuses().map(({ id, configured, provider }) => ({
      id,
      configured,
      provider,
    }));
  }),

  getDeploymentMode: protectedProcedure.query(() => ({
    mode: process.env.DEPLOYMENT_MODE ?? 'long-running',
  })),
});
