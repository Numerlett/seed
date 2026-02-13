import sendMail from '../sendMail';

const welcomeEmailTemplate = ({ to }: { to: string }) => {
  const frontendUrl = process.env.FRONTEND_URL;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to SEED</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #fafafa;">
      <div style="max-width: 32rem; margin-left: auto; margin-right: auto; margin-top: 3rem; margin-bottom: 3rem; padding-left: 1rem; padding-right: 1rem;">
        <div style="background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 0.5rem; overflow: hidden;">
          <div style="padding-left: 2rem; padding-right: 2rem; padding-top: 2rem; padding-bottom: 1.5rem;">
            <div style="margin-bottom: 1.5rem;">
              <div style="font-size: 1.5rem; line-height: 2rem; font-weight: 700; color: #171717; margin-bottom: 0.75rem; text-align: center;">SEED</div>
              <h1 style="font-size: 1.25rem; line-height: 1.75rem; font-weight: 600; color: #171717; margin: 0;">Welcome to SEED! 🌱</h1>
              <p style="font-size: 0.875rem; line-height: 1.25rem; color: #525252; margin-top: 0.5rem; margin-bottom: 0; margin-left: 0; margin-right: 0;">
                We're excited to have you on board
              </p>
            </div>

            <div style="border-top: 1px solid #e5e5e5; padding-top: 1.5rem;">
              <p style="font-size: 0.875rem; line-height: 1.25rem; color: #404040; margin: 0; margin-bottom: 1.5rem;">
                Hi there! Your account has been successfully created and you're all set to get started with SEED.
              </p>

              <div style="background-color: #fafafa; border: 1px solid #e5e5e5; border-radius: 0.375rem; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h2 style="font-size: 0.875rem; line-height: 1.25rem; font-weight: 600; color: #171717; margin: 0; margin-bottom: 0.75rem;">What's next?</h2>
                <ul style="font-size: 0.875rem; line-height: 1.25rem; color: #404040; margin: 0; padding-left: 1.25rem;">
                  <li style="margin-top: 0.5rem;">Complete your profile to personalize your experience</li>
                  <li style="margin-top: 0.5rem;">Explore the dashboard and discover features</li>
                  <li style="margin-top: 0.5rem;">Create your first business to start managing inventory</li>
                  <li style="margin-top: 0.5rem;">Check out our help center if you need guidance</li>
                </ul>
              </div>

              <a 
                href="${frontendUrl}/dashboard" 
                style="display: block; text-align: center; background-color: #171717; color: #ffffff; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; padding-top: 0.625rem; padding-bottom: 0.625rem; padding-left: 1rem; padding-right: 1rem; border-radius: 0.375rem; text-decoration: none; max-width: 100%;"
              >
                Get Started
              </a>

              <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e5e5e5;">
                <p style="font-size: 0.75rem; line-height: 1rem; color: #737373; margin: 0;">
                  Need help getting started? Visit our 
                  <a href="${frontendUrl}/support" target="_blank" style="color: #171717; text-decoration: underline;">support center</a> 
                  or reply to this email with any questions.
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

export const sendWelcomeEmail = async (to: string) => {
  await sendMail({
    to,
    subject: 'Welcome to SEED',
    content: welcomeEmailTemplate({ to }),
  });
};

export default welcomeEmailTemplate;
