import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('should navigate through main portal pages', async ({ page }) => {
    // Start at portal dashboard
    await page.goto('/portal');
    
    // Verify dashboard loads with proper content
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.locator('text=Internal Dashboard').first()).toBeVisible();
    
    // Navigate to My Companies
    await page.goto('/portal/my-companies');
    await expect(page.getByRole('heading', { name: 'My Companies' })).toBeVisible();
    await expect(page.locator('text=Company List')).toBeVisible();
    
    // Navigate to Purchase Orders
    await page.goto('/portal/purchase-orders');
    await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
    
    // Navigate to Inventory  
    await page.goto('/portal/inventory');
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
    
    // Navigate to Part Numbers
    await page.goto('/portal/part-numbers');
    await expect(page.getByRole('heading', { name: 'Part Numbers' })).toBeVisible();
  });

  test('should display page components correctly', async ({ page }) => {
    await page.goto('/portal/my-companies');
    
    // Check if Add button is present
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
    
    // Check if search is present
    await expect(page.getByPlaceholder('Search companies...')).toBeVisible();
    
    // Check if the page loads without errors
    const errors = page.locator('.error, [data-testid="error"]');
    await expect(errors).toHaveCount(0);
  });

  test('should open and close company dialog', async ({ page }) => {
    await page.goto('/portal/my-companies');
    
    // Click Add button
    await page.getByRole('button', { name: 'Add' }).click();
    
    // Check if dialog opens
    await expect(page.getByRole('heading', { name: 'Add My Company' })).toBeVisible();
    
    // Close dialog with Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Check if dialog closes
    await expect(page.getByRole('heading', { name: 'Add My Company' })).not.toBeVisible();
  });

  test('should handle authentication state', async ({ page }) => {
    // Verify we're authenticated and can access portal
    await page.goto('/portal');
    
    // Should not redirect to login
    expect(page.url()).toContain('/portal');
    
    // Should show dashboard content
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});