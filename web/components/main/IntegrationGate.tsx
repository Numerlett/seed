'use client';

import { clientTrpc } from '@seed/api/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlugZap } from 'lucide-react';

/**
 * Integrations whose absence changes what the UI should offer.
 * Mirrors `IntegrationId` in @seed/integrations.
 */
export type IntegrationId = 'email' | 'sms' | 'whatsapp' | 'einvoice' | 'razorpay';

const LABELS: Record<IntegrationId, string> = {
  email: 'Email delivery',
  sms: 'SMS delivery',
  whatsapp: 'WhatsApp delivery',
  einvoice: 'E-invoicing',
  razorpay: 'Online payments',
};

/**
 * Whether the server has credentials for an integration.
 *
 * `undefined` while loading, so a caller can avoid flashing a "not configured"
 * banner before the answer arrives.
 */
export function useIntegrationConfigured(id: IntegrationId): boolean | undefined {
  const { data } = clientTrpc.system.getIntegrationStatus.useQuery(undefined, {
    // Deployment configuration does not change while someone is looking at a
    // page, so this need not be refetched on every focus.
    staleTime: 5 * 60 * 1000,
  });
  return data?.find((entry) => entry.id === id)?.configured;
}

/**
 * Explains that a feature is unavailable because the server has no credentials
 * for it, rather than letting the user press a button that can only fail.
 */
export function IntegrationGate({
  id,
  children,
}: {
  id: IntegrationId;
  children?: React.ReactNode;
}) {
  const configured = useIntegrationConfigured(id);

  // Still loading, or configured: show nothing.
  if (configured !== false) return null;

  return (
    <Alert>
      <PlugZap className="h-4 w-4" />
      <AlertTitle>{LABELS[id]} is not set up</AlertTitle>
      <AlertDescription>
        {children ?? (
          <span>
            This server has no credentials for {LABELS[id].toLowerCase()}. Actions
            that depend on it are disabled until an administrator configures it.
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
