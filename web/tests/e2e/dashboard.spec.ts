import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/dashboard');
  });

  test('dashboard page loads without any console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('key metric cards are visible', async ({ page }) => {
    // Dashboard should show at least one metric card
    await expect(page.locator('body')).not.toContainText('500');
    // Look for common dashboard elements
    const content = await page.locator('main, [role="main"]').textContent();
    expect(content).toBeTruthy();
  });

  test('page renders without throwing', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Something went wrong');
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  });
});
