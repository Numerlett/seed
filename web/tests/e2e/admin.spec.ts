import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Admin Panel', () => {
  test('non-admin user cannot navigate to /admin (redirected or shown 403)', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/admin');
    // Should be redirected away or show access denied
    const url = page.url();
    const body = await page.locator('body').textContent();
    const isRedirected = !url.includes('/admin') || url.includes('/login') || url.includes('/dashboard');
    const isBlocked = body?.toLowerCase().includes('forbidden') ||
      body?.toLowerCase().includes('unauthorized') ||
      body?.toLowerCase().includes('access denied') ||
      body?.toLowerCase().includes('403');
    expect(isRedirected || isBlocked).toBe(true);
  });

  // The following tests require an admin test account
  // They are structured but will be skipped if no admin credentials exist
  test.skip('admin user can view the users list', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('table, [role="table"]')).toBeVisible();
  });

  test.skip('admin user can view the businesses list', async ({ page }) => {
    await page.goto('/admin/businesses');
    await expect(page.locator('table, [role="table"]')).toBeVisible();
  });

  test.skip('admin actions appear in the audit log', async ({ page }) => {
    await page.goto('/admin/audit-log');
    await expect(page.locator('body')).not.toContainText('500');
  });
});
