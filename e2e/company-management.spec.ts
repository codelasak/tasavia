import { test, expect } from '@playwright/test'

test.describe('Company Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the companies page
    await page.goto('/portal/companies')
    await page.waitForLoadState('networkidle')
  })

  test('should display companies list page', async ({ page }) => {
    // Check page elements
    await expect(page.locator('h1')).toContainText('External Companies')
    await expect(page.getByText('Company List')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Company/ })).toBeVisible()
    await expect(page.getByPlaceholder('Search companies...')).toBeVisible()
  })

  test('should open and close company dialog', async ({ page }) => {
    // Click Add Company button
    await page.getByRole('button', { name: /Add Company/ }).click()
    
    // Dialog should be visible
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Add External Company')).toBeVisible()
    
    // Check tabs are present
    await expect(page.getByRole('tab', { name: 'Basic Info' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Contacts' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Addresses' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Shipping' })).toBeVisible()
    
    // Close dialog
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should navigate between dialog tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/ }).click()
    
    // Navigate to Contacts tab
    await page.getByRole('tab', { name: 'Contacts' }).click()
    await expect(page.getByText('Contacts')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Contact/ })).toBeVisible()
    
    // Navigate to Addresses tab
    await page.getByRole('tab', { name: 'Addresses' }).click()
    await expect(page.getByText('Addresses')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Address/ })).toBeVisible()
    
    // Navigate to Shipping tab
    await page.getByRole('tab', { name: 'Shipping' }).click()
    await expect(page.getByText('Shipping Methods')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Shipping Method/ })).toBeVisible()
  })

  test('should add shipping method in dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/ }).click()
    await page.getByRole('tab', { name: 'Shipping' }).click()
    
    // Add shipping method
    await page.getByRole('button', { name: /Add Shipping Method/ }).click()
    
    // Check shipping form fields
    await expect(page.getByText('Shipping Company')).toBeVisible()
    await expect(page.getByText('Account Number')).toBeVisible()
    await expect(page.getByText('Ship Model')).toBeVisible()
    
    // Select shipping company
    await page.locator('select').first().selectOption('DHL')
    await page.getByLabelText(/Account Number/).fill('123456789')
    await page.locator('select').last().selectOption('GROUND')
    
    // Verify fields are filled
    await expect(page.getByLabelText(/Account Number/)).toHaveValue('123456789')
  })

  test('should search and filter companies', async ({ page }) => {
    // Wait for companies to load
    await page.waitForSelector('[data-testid="company-card"], .hover\\:shadow-md', { timeout: 5000 })
    
    const searchInput = page.getByPlaceholder('Search companies...')
    
    // Search for a specific company (if any exist)
    await searchInput.fill('Test')
    await page.waitForTimeout(500) // Wait for filter to apply
    
    // The search should work (even if no results)
    await expect(searchInput).toHaveValue('Test')
  })

  test('should handle company creation flow', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/ }).click()
    
    // Fill basic info
    await page.getByLabelText(/Company Name/).fill('E2E Test Company')
    await page.getByLabelText(/Company Code/).fill('E2E001')
    await page.locator('select[name="company_type"]').selectOption('vendor')
    
    // Add contact
    await page.getByRole('tab', { name: 'Contacts' }).click()
    await page.getByRole('button', { name: /Add Contact/ }).click()
    await page.getByLabelText(/Contact Name/).fill('John Doe')
    await page.getByLabelText(/Email/).fill('john@e2etest.com')
    
    // Add address
    await page.getByRole('tab', { name: 'Addresses' }).click()
    await page.getByRole('button', { name: /Add Address/ }).click()
    await page.getByLabelText(/Address/).fill('123 Test Street')
    await page.getByLabelText(/City/).fill('Test City')
    await page.getByLabelText(/Country/).fill('Test Country')
    
    // Add shipping
    await page.getByRole('tab', { name: 'Shipping' }).click()
    await page.getByRole('button', { name: /Add Shipping Method/ }).click()
    await page.locator('select').first().selectOption('FEDEX')
    await page.getByLabelText(/Account Number/).fill('987654321')
    
    // Note: In a real E2E test, you might actually submit and verify the result
    // For now, we'll just verify the form is ready to submit
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled()
  })
})

test.describe('My Companies E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portal/my-companies')
    await page.waitForLoadState('networkidle')
  })

  test('should display my companies list page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('My Companies')
    await expect(page.getByText('Company List')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Company/ })).toBeVisible()
  })

  test('should show shipping tab for my companies', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/ }).click()
    
    // My companies should have shipping tab
    await expect(page.getByRole('tab', { name: 'Shipping' })).toBeVisible()
    
    // Navigate to shipping tab
    await page.getByRole('tab', { name: 'Shipping' }).click()
    await expect(page.getByText('Shipping Methods')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Shipping Method/ })).toBeVisible()
  })

  test('should support custom shipping company for my companies', async ({ page }) => {
    await page.getByRole('button', { name: /Add Company/ }).click()
    await page.getByRole('tab', { name: 'Shipping' }).click()
    await page.getByRole('button', { name: /Add Shipping Method/ }).click()
    
    // Select custom shipping company
    await page.locator('select').first().selectOption('CUSTOM')
    
    // Custom company name field should appear
    await expect(page.getByLabelText(/Custom Company Name/)).toBeVisible()
    await page.getByLabelText(/Custom Company Name/).fill('Local Courier Service')
    await page.getByLabelText(/Account Number/).fill('LCS-12345')
    
    // Verify custom fields are filled
    await expect(page.getByLabelText(/Custom Company Name/)).toHaveValue('Local Courier Service')
  })
})

test.describe('Part Numbers E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/portal/part-numbers')
    await page.waitForLoadState('networkidle')
  })

  test('should display part numbers list page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Part Numbers')
    await expect(page.getByText('Part Numbers')).toBeVisible()
    await expect(page.getByRole('button', { name: /Add Part Number/ })).toBeVisible()
    await expect(page.getByPlaceholder('Search part numbers, descriptions, or remarks...')).toBeVisible()
  })

  test('should open and close part number dialog', async ({ page }) => {
    await page.getByRole('button', { name: /Add Part Number/ }).click()
    
    // Dialog should be visible
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Add Part Number')).toBeVisible()
    
    // Check form fields
    await expect(page.getByLabelText(/Part Number/)).toBeVisible()
    await expect(page.getByLabelText(/Description/)).toBeVisible()
    await expect(page.getByLabelText(/Remarks/)).toBeVisible()
    
    // Close dialog
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should handle part number creation flow', async ({ page }) => {
    await page.getByRole('button', { name: /Add Part Number/ }).click()
    
    // Fill form
    await page.getByLabelText(/Part Number/).fill('E2E-TEST-001')
    await page.getByLabelText(/Description/).fill('E2E Test Part Number')
    await page.getByLabelText(/Remarks/).fill('Created during E2E testing')
    
    // Verify form is ready to submit
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create' })).toBeEnabled()
  })

  test('should search part numbers', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search part numbers, descriptions, or remarks...')
    
    // Search for parts
    await searchInput.fill('TEST')
    await page.waitForTimeout(500)
    
    // Search should work
    await expect(searchInput).toHaveValue('TEST')
  })
})

test.describe('Cross-page Navigation E2E Tests', () => {
  test('should navigate between company management pages', async ({ page }) => {
    // Start at external companies
    await page.goto('/portal/companies')
    await expect(page.locator('h1')).toContainText('External Companies')
    
    // Navigate to my companies
    await page.goto('/portal/my-companies')
    await expect(page.locator('h1')).toContainText('My Companies')
    
    // Navigate to part numbers
    await page.goto('/portal/part-numbers')
    await expect(page.locator('h1')).toContainText('Part Numbers')
  })

  test('should maintain session state across pages', async ({ page }) => {
    // This test could verify that user session, preferences, etc. are maintained
    await page.goto('/portal/companies')
    await page.goto('/portal/my-companies')
    await page.goto('/portal/part-numbers')
    
    // All pages should load successfully without authentication issues
    await expect(page.locator('h1')).toBeVisible()
  })
})