import type { EmailDirectInput } from '@seed/integrations';

export type SendEmailInput = EmailDirectInput;

/**
 * Send an email.
 * - Serverless: sends synchronously via SMTP.
 * - Long-running: enqueues to BullMQ; the email worker delivers it.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (process.env.DEPLOYMENT_MODE === 'serverless') {
    const { sendEmailDirect } = await import('@seed/integrations');
    await sendEmailDirect(input);
    return;
  }
  const { getEmailQueue } = await import('@seed/jobs');
  await getEmailQueue().add('send', input);
}
