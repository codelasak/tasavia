import { test, expect } from '@playwright/test';
import { createMyCompany, deleteMyCompany } from './lib/data';
import { supabase } from './lib/supabase';

test.describe('My Companies CRUD', () => {
  let company: any;

  test.beforeEach(async ({ page }) => {
    // Navigate to the My Companies page before each test
    await page.goto('/portal/my-companies');
  });

  test('should allow a user to add a new company', async ({ page }) => {
    const newCompanyName = `Test Co ${Date.now()}`;
    const newCompanyCode = `CODE-${Date.now()}`;

    // Click the 'Add' button 
    await page.getByRole('button', { name: 'Add' }).click();

    // Wait for the modal to appear
    await page.getByRole('heading', { name: 'Add My Company' }).waitFor({ state: 'visible' });

    // Fill basic company information
    await page.getByLabel('Company Name').fill(newCompanyName);
    await page.getByLabel('Company Code').fill(newCompanyCode);

    // Add a contact by clicking the "Add Contact" button
    await page.getByRole('button', { name: 'Add Contact' }).click();
    
    // Fill contact information
    await page.getByLabel('Contact Name').fill('Test Contact');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Phone').fill('555-1234');

    // Add an address by clicking the "Add Address" button
    await page.getByRole('button', { name: 'Add Address' }).click();
    
    // Fill address information  
    await page.getByLabel('Address').fill('123 Test St');
    await page.getByLabel('Zip Code').fill('12345');
    await page.getByLabel('City').fill('Testville');
    await page.getByLabel('Country').fill('USA');

    // Save the new company
    await page.getByRole('button', { name: 'Create' }).click();

    // Wait for the modal to close and page to update
    await page.waitForTimeout(2000);

    // Assert that the new company is visible in the list
    await expect(page.getByRole('heading', { name: 'My Companies' })).toBeVisible();
    await expect(page.getByText(newCompanyName)).toBeVisible();

    // Cleanup: Find the company in the database and delete it
    const { data } = await supabase.from('my_companies').select('my_company_id').eq('my_company_name', newCompanyName).single();
    if (data) {
      await supabase.from('my_companies').delete().eq('my_company_id', data.my_company_id);
    }
  });

  test('should allow a user to edit a company', async ({ page }) => {
    // Arrange: Create a company to edit via database
    const originalName = `Edit Co ${Date.now()}`;
    const originalCode = `EDITCO-${Date.now()}`;
    
    const { data: newCompany } = await supabase
      .from('my_companies')
      .insert([{
        my_company_name: originalName,
        my_company_code: originalCode
      }])
      .select()
      .single();

    company = newCompany;
    await page.reload(); // Reload to see the new company

    const updatedName = `${originalName} - Edited`;

    // Wait for the company to appear in the list
    await expect(page.getByText(originalName)).toBeVisible();

    // Find the edit button for this specific company
    const companyRow = page.locator(`text=${originalName}`).locator('../../../..');
    await companyRow.getByRole('button').first().click();

    // Wait for edit modal
    await page.getByRole('heading', { name: 'Edit My Company' }).waitFor({ state: 'visible' });

    // Change the name
    await page.getByLabel('Company Name').fill(updatedName);
    await page.getByRole('button', { name: 'Update' }).click();

    // Wait for modal to close and page to update
    await page.waitForTimeout(2000);

    // Assert: Check for the updated name
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText(originalName)).not.toBeVisible();

    // Cleanup
    if (company) {
      await supabase.from('my_companies').delete().eq('my_company_id', company.my_company_id);
    }
  });

  test('should allow a user to delete a company', async ({ page }) => {
    // Arrange: Create a company to delete via database
    const companyNameToDelete = `Delete Co ${Date.now()}`;
    const companyCodeToDelete = `DELETECO-${Date.now()}`;
    
    const { data: newCompany } = await supabase
      .from('my_companies')
      .insert([{
        my_company_name: companyNameToDelete,
        my_company_code: companyCodeToDelete
      }])
      .select()
      .single();

    company = newCompany;
    await page.reload(); // Reload to see the new company

    // Wait for the company to appear in the list
    await expect(page.getByText(companyNameToDelete)).toBeVisible();

    // Find the delete button for this specific company
    const companyRow = page.locator(`text=${companyNameToDelete}`).locator('../../../..');
    
    // Set up dialog handler before clicking
    page.on('dialog', dialog => dialog.accept());
    await companyRow.getByRole('button').nth(1).click();

    // Wait for deletion to complete
    await page.waitForTimeout(2000);

    // Assert: Check that the company is gone
    await expect(page.getByText(companyNameToDelete)).not.toBeVisible();
    
    // No cleanup needed since company should be deleted
    company = null;
  });
});
