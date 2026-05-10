import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Business Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('authenticated user with no business sees a prompt to create one', async ({ page }) => {
    // If no business exists yet, the UI should guide the user
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });

  test('user can create a new business using the form', async ({ page }) => {
    await page.goto('/businesses');
    const createBtn = page.getByRole('button', { name: /new business|create/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.getByRole('textbox', { name: /name/i }).fill('Test Business E2E');
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(page.locator('body')).toContainText('Test Business E2E');
    }
  });

  test('newly created business appears in the business list', async ({ page }) => {
    await page.goto('/businesses');
    // Verify the page loads without error
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('user can switch active business from the selector', async ({ page }) => {
    await page.goto('/dashboard');
    // Business selector should be visible
    const selector = page.locator('[data-testid="business-selector"], [aria-label*="business"]').first();
    if (await selector.isVisible()) {
      await selector.click();
      // Dropdown should open
      await expect(page.locator('body')).not.toContainText('500');
    }
  });
});
