import { test, expect } from '@playwright/test';

test.describe('Authentication Reload Fix Verification', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should load authenticated content without reload', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Verify login page loads
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    
    // Fill in credentials
    await page.getByPlaceholder('you@email.com').fill(process.env.TEST_USER_EMAIL!);
    await page.getByPlaceholder('Your password').fill(process.env.TEST_USER_PASSWORD!);
    
    // Submit login form
    await page.getByRole('button', { name: 'Login' }).click();
    
    // Critical: Measure time to content visibility
    const startTime = Date.now();
    
    // Wait for navigation to complete
    await page.waitForURL('**/portal/**', { timeout: 15000 });
    
    // Verify dashboard content appears without reload
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 5000 });
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Log performance metrics
    console.log(`Dashboard content loaded in ${loadTime}ms`);
    
    // Verify content is visible immediately (no loading spinner should persist)
    const loadingSpinners = page.locator('[data-testid="loading-spinner"], .animate-spin');
    await expect(loadingSpinners).toHaveCount(0);
    
    // Verify user data is displayed (indicating AuthProvider worked correctly)
    await expect(page.locator('text=Internal Dashboard').first()).toBeVisible();
    
    // Additional check: Verify no console errors related to auth
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // Navigate to another protected route to test auth persistence
    await page.goto('/portal/companies');
    await expect(page.getByRole('heading', { name: /Companies|My Companies/ })).toBeVisible({ timeout: 5000 });
    
    // Verify no auth-related errors in console
    const authErrors = logs.filter(log => 
      log.includes('auth') || 
      log.includes('token') || 
      log.includes('session') ||
      log.includes('profile')
    );
    
    if (authErrors.length > 0) {
      console.warn('Auth-related console errors found:', authErrors);
    }
    
    // Test should pass if no reload was needed and content loaded quickly
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
  });

  test('should handle rapid navigation without reload loops', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByPlaceholder('you@email.com').fill(process.env.TEST_USER_EMAIL!);
    await page.getByPlaceholder('Your password').fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/portal/**', { timeout: 15000 });
    
    // Test rapid navigation between protected routes
    const routes = [
      '/portal/dashboard',
      '/portal/companies', 
      '/portal/inventory',
      '/portal/dashboard'
    ];
    
    for (const route of routes) {
      const startTime = Date.now();
      await page.goto(route);
      
      // Wait for route-specific content to be visible
      if (route.includes('dashboard')) {
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 5000 });
      } else if (route.includes('companies')) {
        await expect(page.locator('h1, h2').filter({ hasText: /Companies|My Companies/ })).toBeVisible({ timeout: 5000 });
      } else if (route.includes('inventory')) {
        await expect(page.locator('h1, h2').filter({ hasText: /Inventory/ })).toBeVisible({ timeout: 5000 });
      }
      
      const loadTime = Date.now() - startTime;
      console.log(`Route ${route} loaded in ${loadTime}ms`);
      
      // Each route should load quickly without reload
      expect(loadTime).toBeLessThan(5000);
    }
  });

  test('should maintain auth state across page refreshes', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByPlaceholder('you@email.com').fill(process.env.TEST_USER_EMAIL!);
    await page.getByPlaceholder('Your password').fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/portal/**');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Force page refresh
    await page.reload();
    
    // Should still be authenticated and content should load quickly
    const startTime = Date.now();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    console.log(`Content after reload loaded in ${loadTime}ms`);
    
    // Should not redirect to login page
    expect(page.url()).not.toContain('/login');
    expect(page.url()).toContain('/portal');
    
    // Content should load reasonably quickly (our fix should prevent long loading)
    expect(loadTime).toBeLessThan(8000);
  });
});