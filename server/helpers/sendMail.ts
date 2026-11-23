import { sendEmail } from '../lib/dispatch';

/**
 * Sends a transactional email.
 *
 * Delegates to `sendEmail` from `server/lib/dispatch`, which keeps the caller
 * mode-agnostic — inline in serverless, queued in long-running — and refuses
 * up front when no email provider is configured.
 */
export default async function sendMail({
  to,
  subject,
  content,
}: {
  to: string;
  subject: string;
  content: string;
}) {
  await sendEmail({ to, subject, html: content });
}
