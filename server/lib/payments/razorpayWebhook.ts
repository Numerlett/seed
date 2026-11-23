import type { Request, Response } from 'express';
import { logger } from '../../helpers/logger';
import { settlePaymentLink } from '../../modules/payments/controllers/index';

/**
 * Razorpay webhook receiver.
 *
 * Mounted with a raw body parser, because the signature is an HMAC over the
 * exact bytes Razorpay sent — `express.json()` would discard them and every
 * verification would fail.
 *
 * Responses follow the provider's retry contract: 2xx means "do not send this
 * again". A payload we cannot use (unknown event, unknown link) is still a 2xx,
 * since retrying it forever would not help. Only a genuine server-side failure
 * returns 5xx, which is the case where a retry might actually succeed.
 */
export async function razorpayWebhookHandler(req: Request, res: Response) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not set');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  const signature = req.header('x-razorpay-signature');
  if (!signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  // express.raw leaves a Buffer; anything else means the route was mounted
  // after a body parser and the bytes needed for verification are gone.
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    logger.error(
      'Razorpay webhook body is not raw. The route must be mounted before express.json().',
    );
    return res.status(500).json({ error: 'Webhook misconfigured' });
  }

  const { verifyWebhookSignature } = await import('@seed/integrations');
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    // Do not say which part failed: a forged request learns nothing here.
    logger.warn('Razorpay webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event: {
    event?: string;
    payload?: {
      payment_link?: { entity?: { id?: string } };
      payment?: { entity?: { id?: string; method?: string; created_at?: number } };
    };
  };
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Malformed JSON' });
  }

  // Only the paid event moves money. The others (created, expired, failed)
  // are acknowledged so the provider stops resending them.
  if (event.event !== 'payment_link.paid') {
    return res.status(200).json({ ok: true, ignored: event.event ?? 'unknown' });
  }

  const linkId = event.payload?.payment_link?.entity?.id;
  const paymentEntity = event.payload?.payment?.entity;
  if (!linkId || !paymentEntity?.id) {
    logger.warn({ event: event.event }, 'Razorpay paid event missing ids');
    return res.status(200).json({ ok: true, ignored: 'incomplete payload' });
  }

  try {
    const result = await settlePaymentLink({
      providerLinkId: linkId,
      providerPaymentId: paymentEntity.id,
      method: paymentEntity.method,
      paidAt: paymentEntity.created_at
        ? new Date(paymentEntity.created_at * 1000)
        : new Date(),
    });

    if (result.applied) {
      logger.info({ linkId, paymentId: paymentEntity.id }, 'Payment link settled');
    } else {
      logger.info(
        { linkId, paymentId: paymentEntity.id, reason: result.reason },
        'Payment link webhook was a no-op',
      );
    }

    return res.status(200).json({ ok: true, applied: result.applied });
  } catch (error) {
    // Recording failed for a reason a retry may resolve, so ask for one.
    logger.error({ err: error, linkId }, 'Failed to settle payment link');
    return res.status(500).json({ error: 'Could not record payment' });
  }
}
