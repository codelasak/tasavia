import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'user@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'password';

  await page.goto('/login');

  // Fill in credentials using the correct placeholders
  await page.getByPlaceholder('you@email.com').fill(email);
  await page.getByPlaceholder('Your password').fill(password);
  
  // Click the login button
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for navigation to complete - the app redirects to /portal/dashboard
  await page.waitForURL('**/portal/**', { timeout: 15000 });
  
  // Wait for dashboard content to load
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  
  // Also verify we can see some dashboard content to ensure full page load
  await expect(page.locator('text=Internal Dashboard').first()).toBeVisible();

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
