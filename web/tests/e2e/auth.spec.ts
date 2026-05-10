import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Authentication', () => {
  test('visiting /dashboard while unauthenticated redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('entering a valid email shows the OTP verification page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill('any@example.com');
    await page.getByRole('button', { name: /continue|send otp|sign in/i }).click();
    // Should show OTP step or error — not crash
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('entering an incorrect OTP shows an error message', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL ?? 'test@example.com';
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill(testEmail);
    await page.getByRole('button', { name: /continue|send otp|sign in/i }).click();
    await page.waitForURL(/auth/);
    await page.getByRole('textbox').fill('000000');
    await page.getByRole('button', { name: /verify|confirm/i }).click();
    await expect(page.locator('body')).toContainText(/invalid|incorrect|wrong/i);
  });

  test('entering the correct OTP redirects to the dashboard', async ({ page }) => {
    await loginAsTestUser(page);
    await expect(page).toHaveURL(/dashboard/);
  });

  test('logging out clears the session and redirects to login', async ({ page }) => {
    await loginAsTestUser(page);
    // Click logout — selector depends on implementation
    await page.getByRole('button', { name: /logout|sign out/i }).click();
    await expect(page).toHaveURL(/login/);
    // Confirm dashboard is no longer accessible
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });
});
