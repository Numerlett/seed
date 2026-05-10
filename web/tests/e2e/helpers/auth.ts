import { Page } from '@playwright/test';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_BASE_URL ?? 'http://localhost:8080';

/**
 * Performs the full OTP login flow programmatically.
 * Calls the server API directly to get the OTP, then submits it via the UI.
 * Requires TEST_MAIL and TEST_OTP env vars to be configured on the server.
 */
export async function loginAsTestUser(page: Page) {
  const testEmail = process.env.TEST_USER_EMAIL ?? 'test@example.com';

  // Navigate to login
  await page.goto('/login');

  // Enter email
  await page.getByRole('textbox', { name: /email/i }).fill(testEmail);
  await page.getByRole('button', { name: /continue|send otp|sign in/i }).click();

  // Wait for OTP input to appear
  await page.waitForURL(/auth/);

  // Use test OTP (configured in server via TEST_OTP env)
  const testOtp = process.env.TEST_OTP ?? '123456';
  await page.getByRole('textbox').fill(testOtp);
  await page.getByRole('button', { name: /verify|confirm/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/);
}
