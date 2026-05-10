export type SendSmsInput = { to: string; message: string };

/**
 * Send an SMS.
 * - Serverless: sends synchronously via the configured provider.
 * - Long-running: enqueues to BullMQ; the sms worker delivers it.
 */
export async function sendSms(input: SendSmsInput): Promise<void> {
  if (process.env.DEPLOYMENT_MODE === 'serverless') {
    const { sendSms: sendSmsDirect } = await import('@seed/integrations');
    await sendSmsDirect(input);
    return;
  }
  const { getSmsQueue } = await import('@seed/jobs');
  await getSmsQueue().add('send', input);
}
