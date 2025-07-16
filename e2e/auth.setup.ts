import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL || 'user@example.com';
  const password = process.env.TEST_USER_PASSWORD || 'password';

  // Increase timeout for slow environments
  page.setDefaultTimeout(30000);

  await page.goto('/login', { waitUntil: 'networkidle' });
  
  // Wait for login form to be fully loaded
  await expect(page.getByPlaceholder('you@email.com')).toBeVisible({ timeout: 10000 });
  await expect(page.getByPlaceholder('Your password')).toBeVisible({ timeout: 10000 });

  // Fill in credentials using the correct placeholders
  await page.getByPlaceholder('you@email.com').fill(email);
  await page.getByPlaceholder('Your password').fill(password);
  
  // Click the login button and wait for navigation
  await Promise.all([
    page.waitForURL('**/portal/**', { timeout: 30000 }),
    page.getByRole('button', { name: 'Login' }).click()
  ]);
  
  // Wait for dashboard content to load with more flexible selectors
  try {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 15000 });
  } catch (error) {
    // Fallback: check for any dashboard-related content
    await expect(page.locator('h1, h2, h3').filter({ hasText: /dashboard|welcome/i }).first()).toBeVisible({ timeout: 15000 });
  }
  
  // Ensure we're on a portal page
  await expect(page).toHaveURL(/\/portal\//);

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
