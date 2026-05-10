import { sendEmailDirect } from '@seed/integrations';

/**
 * Backwards-compatible inline email sender.
 * For new feature code, prefer `sendEmail` from `server/lib/dispatch` so the
 * caller stays mode-agnostic (inline in serverless, queued in long-running).
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
  await sendEmailDirect({ to, subject, html: content });
}
