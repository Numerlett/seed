import otpEmailTemplate from './otpEmailTemplate';
import welcomeEmailTemplate from './welcomeEmailTemplate';
import { Request, Response } from 'express';

export const emailTemplateHandler = (req: Request, res: Response) => {
  const { type } = req.query;

  if (type === 'welcome') {
    return res.send(
      welcomeEmailTemplate({
        to: 'test@example.com',
      }),
    );
  } else if (type === 'otp') {
    return res.send(
      otpEmailTemplate({
        otp: '123456',
        to: 'test@example.com',
        exp: new Date(),
      }),
    );
  } else {
    return res.status(400).send(`
      <div style="text-align: center;">
        <h1>Invalid email template type</h1> 
        <p>Please provide a valid email template type</p>
        
        <p>Available templates:</p>
        <a href="/email-template?type=welcome"><button>Welcome Email</button></a>
        <a href="/email-template?type=otp"><button>OTP Email</button></a>
      </div>
      `);
  }
};
