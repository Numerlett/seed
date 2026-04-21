import axios from 'axios';

/**
 * Messaging adapters: SMS via MSG91/Twilio, WhatsApp via Gupshup/Twilio.
 * Configure via env: MSG91_AUTH_KEY, MSG91_SENDER_ID, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 *   TWILIO_FROM_NUMBER, GUPSHUP_API_KEY, GUPSHUP_SRC_NAME, WHATSAPP_FROM
 */

export async function sendSms(params: { to: string; message: string }) {
  const provider = process.env.SMS_PROVIDER || 'msg91';

  if (provider === 'twilio') {
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        From: process.env.TWILIO_FROM_NUMBER || '',
        To: params.to,
        Body: params.message,
      }),
      {
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID || '',
          password: process.env.TWILIO_AUTH_TOKEN || '',
        },
      },
    );
    return;
  }

  // Default: MSG91
  await axios.get('https://api.msg91.com/api/v5/flow/', {
    params: {
      authkey: process.env.MSG91_AUTH_KEY,
      mobiles: params.to.replace('+', ''),
      message: params.message,
      sender: process.env.MSG91_SENDER_ID,
      route: '4',
    },
  });
}

export async function sendWhatsApp(params: {
  to: string;
  message: string;
  templateId?: string;
  mediaUrl?: string;
}) {
  const provider = process.env.WHATSAPP_PROVIDER || 'twilio';

  if (provider === 'gupshup') {
    await axios.post(
      'https://api.gupshup.io/sm/api/v1/msg',
      new URLSearchParams({
        channel: 'whatsapp',
        source: process.env.GUPSHUP_SRC_NAME || '',
        destination: params.to,
        message: JSON.stringify({ type: 'text', text: params.message }),
        'src.name': process.env.GUPSHUP_SRC_NAME || '',
      }),
      {
        headers: {
          apikey: process.env.GUPSHUP_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    return;
  }

  // Default: Twilio WhatsApp
  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    new URLSearchParams({
      From: `whatsapp:${process.env.TWILIO_FROM_NUMBER}`,
      To: `whatsapp:${params.to}`,
      Body: params.message,
      ...(params.mediaUrl ? { MediaUrl: params.mediaUrl } : {}),
    }),
    {
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID || '',
        password: process.env.TWILIO_AUTH_TOKEN || '',
      },
    },
  );
}
