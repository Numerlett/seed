import type { IntegrationId } from '@seed/integrations';

export class ServerlessUnavailableError extends Error {
  readonly feature: string;

  constructor(feature: string) {
    super(
      `Feature "${feature}" is not available in serverless deployment mode. Run in long-running mode to enable.`,
    );
    this.name = 'ServerlessUnavailableError';
    this.feature = feature;
  }
}

/** Human-readable names for the error message, so it reads like a sentence. */
const LABELS: Record<IntegrationId, string> = {
  email: 'Email delivery',
  sms: 'SMS delivery',
  whatsapp: 'WhatsApp delivery',
  einvoice: 'E-invoicing (IRN / e-way bill)',
  razorpay: 'Online payments (Razorpay)',
};

/**
 * Thrown when an integration is used before its credentials are configured.
 *
 * This exists so an unconfigured provider fails loudly and immediately instead
 * of the adapter firing a request with empty credentials, which surfaces as an
 * opaque provider error — or worse, as a database row stuck in PENDING that no
 * one ever advances.
 */
export class IntegrationNotConfiguredError extends Error {
  readonly integration: IntegrationId;
  readonly missing: string[];

  constructor(integration: IntegrationId, missing: string[]) {
    super(
      `${LABELS[integration]} is not configured on this server. ` +
        `Set ${missing.join(', ')} to enable it.`,
    );
    this.name = 'IntegrationNotConfiguredError';
    this.integration = integration;
    this.missing = missing;
  }
}

/**
 * Throws unless the integration's credentials are present.
 * Call before any work whose only purpose is to feed that integration.
 */
export async function assertIntegrationConfigured(
  id: IntegrationId,
): Promise<void> {
  const { integrationStatus } = await import('@seed/integrations');
  const status = integrationStatus(id);
  if (!status.configured) {
    throw new IntegrationNotConfiguredError(id, status.missing);
  }
}
