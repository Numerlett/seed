import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export type EmailDirectInput = {
  to: string;
  subject: string;
  html: string;
};

async function sendViaSmtp({ to, subject, html }: EmailDirectInput) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT);
  const mail = process.env.SMTP_MAIL;

  if (!host || !user || !pass || !port || !mail) {
    throw new Error('SMTP configuration is incomplete');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"SEED" <${mail}>`,
    to,
    subject,
    html,
  });
}

async function sendViaResend({ to, subject, html }: EmailDirectInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_MAIL;

  if (!apiKey) throw new Error('RESEND_API_KEY is not set');
  if (!from) throw new Error('RESEND_MAIL (from address) is not set');

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: `SEED <${from}>`,
    to,
    subject,
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

export async function sendEmailDirect(input: EmailDirectInput) {
  const provider = process.env.EMAIL_PROVIDER ?? 'smtp';

  if (provider === 'resend') return sendViaResend(input);
  if (provider === 'smtp') return sendViaSmtp(input);

  throw new Error(`Unknown EMAIL_PROVIDER "${provider}". Expected "smtp" or "resend".`);
}
