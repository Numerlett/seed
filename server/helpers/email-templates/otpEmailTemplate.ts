const otpEmailTemplate = ({
  otp,
  to,
  exp,
}: {
  otp: string;
  to: string;
  exp: Date;
}) => {
  const frontendUrl = process.env.FRONTEND_URL;

  // Format expiry date
  const formatExpiry = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const day = isToday ? 'Today' : date.getDate().toString().padStart(2, '0');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = months[date.getMonth()];

    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${day}${!isToday ? ' ' + month : ''} ${hours}:${minutes}:${seconds} ${ampm}`;
  };

  const expiryFormatted = formatExpiry(exp);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #fafafa;">
      <div style="max-width: 32rem; margin-left: auto; margin-right: auto; margin-top: 3rem; margin-bottom: 3rem; padding-left: 1rem; padding-right: 1rem;">
        <div style="background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 0.5rem; overflow: hidden;">
          <div style="padding-left: 2rem; padding-right: 2rem; padding-top: 2rem; padding-bottom: 1.5rem;">
            <div style="margin-bottom: 1.5rem;">
              <div style="font-size: 1.5rem; line-height: 2rem; font-weight: 700; color: #171717; margin-bottom: 0.75rem; text-align: center;">SEED</div>
              <h1 style="font-size: 1.25rem; line-height: 1.75rem; font-weight: 600; color: #171717; margin: 0;">Verify your email</h1>
              <p style="font-size: 0.875rem; line-height: 1.25rem; color: #525252; margin-top: 0.5rem; margin-bottom: 0; margin-left: 0; margin-right: 0;">
                A sign in attempt requires verification
              </p>
            </div>

            <div style="border-top: 1px solid #e5e5e5; padding-top: 1.5rem;">
              <p style="font-size: 0.875rem; line-height: 1.25rem; color: #404040; margin: 0; margin-bottom: 1.5rem;">
                Enter the following code to verify your account <span style="font-weight: 500; color: #171717;">${to}</span>
              </p>

              <div style="background-color: #fafafa; border: 1px solid #e5e5e5; border-radius: 0.375rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <div style="text-align: center;">
                  <div style="font-size: 32px; line-height: 1; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-weight: 600; color: #171717; letter-spacing: 0.3em; user-select: all;">${otp}</div>
                  <div style="font-size: 0.75rem; line-height: 1rem; color: #737373; margin-top: 0.75rem;">Expires ${expiryFormatted}</div>
                </div>
              </div>

              <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e5e5;">
                <p style="font-size: 0.75rem; line-height: 1rem; color: #737373; margin: 0;">
                  If you didn't attempt to sign in but received this email, please ignore it or 
                  <a href="${frontendUrl}/support" target="_blank" style="color: #171717; text-decoration: underline;">contact support</a> if you have concerns.
                </p>
              </div>
            </div>
          </div>

          <div style="background-color: #fafafa; padding-left: 2rem; padding-right: 2rem; padding-top: 1rem; padding-bottom: 1rem; border-top: 1px solid #e5e5e5;">
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; line-height: 1rem; color: #737373;">
              <span>© ${new Date().getFullYear()} Seed</span>
              <div>
                <a href="${frontendUrl}" target="_blank" style="color: #525252; text-decoration: none; margin-right: 0.75rem;">Home</a>
                <a href="${frontendUrl}/support" target="_blank" style="color: #525252; text-decoration: none;">Support</a>
              </div>
            </div>
          </div>
        </div>

        <p style="text-align: center; font-size: 0.75rem; line-height: 1rem; color: #a3a3a3; margin-top: 1.5rem;">
          This email was sent to ${to}
        </p>
      </div>
    </body>
    </html>
  `;
};

export default otpEmailTemplate;
