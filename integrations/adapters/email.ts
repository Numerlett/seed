import nodemailer from 'nodemailer';

export type EmailDirectInput = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Send an email synchronously via SMTP.
 * Configure via env: SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_MAIL.
 */
export async function sendEmailDirect({
  to,
  subject,
  html,
}: EmailDirectInput) {
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
