export type SendWhatsAppInput = {
  to: string;
  message: string;
  templateId?: string;
  mediaUrl?: string;
};

/**
 * Send a WhatsApp message.
 * - Serverless: sends synchronously via the configured provider.
 * - Long-running: enqueues to BullMQ; the whatsapp worker delivers it.
 */
export async function sendWhatsApp(input: SendWhatsAppInput): Promise<void> {
  if (process.env.DEPLOYMENT_MODE === 'serverless') {
    const { sendWhatsApp: sendWhatsAppDirect } = await import(
      '@seed/integrations'
    );
    await sendWhatsAppDirect(input);
    return;
  }
  const { getWhatsappQueue } = await import('@seed/jobs');
  await getWhatsappQueue().add('send', input);
}
