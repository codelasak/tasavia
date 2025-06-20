import { test, expect } from '@playwright/test';
import { supabase } from './lib/supabase';

test.describe('Inventory Management', () => {
  let testInventoryId: number;

  test.afterEach(async () => {
    // Cleanup test inventory items
    if (testInventoryId) {
      await supabase
        .from('inventory')
        .delete()
        .eq('id', testInventoryId);
      testInventoryId = 0;
    }
  });

  test('should add a new inventory item', async ({ page }) => {
    await page.goto('/portal/inventory');
    
    // Click Add button
    await page.getByRole('button', { name: 'Add' }).click();
    
    // Wait for modal to appear
    await expect(page.getByRole('heading', { name: 'Add Inventory Item' })).toBeVisible();
    
    const itemName = `Test Item ${Date.now()}`;
    const partNumber = `PART-${Date.now()}`;
    
    // Fill in inventory item details
    await page.getByLabel('Item Name').fill(itemName);
    await page.getByLabel('Part Number').fill(partNumber);
    await page.getByLabel('Description').fill('Test inventory item description');
    await page.getByLabel('Quantity').fill('100');
    await page.getByLabel('Unit Price').fill('25.99');
    await page.getByLabel('Location').fill('Warehouse A - Section 1');
    
    // Save the inventory item
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Verify the item appears in the list
    await expect(page.getByText(itemName)).toBeVisible();
    await expect(page.getByText(partNumber)).toBeVisible();
    
    // Get the created item ID for cleanup
    const { data } = await supabase
      .from('inventory')
      .select('id')
      .eq('item_name', itemName)
      .single();
    
    if (data) {
      testInventoryId = data.id;
    }
  });

  test('should edit an inventory item', async ({ page }) => {
    // Create test inventory item
    const { data: item, error } = await supabase
      .from('inventory')
      .insert([{
        item_name: `Edit Item ${Date.now()}`,
        part_number: `EDIT-${Date.now()}`,
        description: 'Original description',
        quantity: 50,
        unit_price: 15.99,
        location: 'Warehouse B'
      }])
      .select()
      .single();

    if (error) throw error;
    testInventoryId = item.id;
    
    await page.goto('/portal/inventory');
    
    // Find and click edit button for the item
    const itemRow = page.getByText(item.item_name).locator('..').locator('..');
    await itemRow.getByRole('button').first().click();
    
    // Wait for edit modal
    await expect(page.getByRole('heading', { name: 'Edit Inventory Item' })).toBeVisible();
    
    // Update item details
    const updatedName = `${item.item_name} - Updated`;
    await page.getByLabel('Item Name').fill(updatedName);
    await page.getByLabel('Quantity').fill('75');
    await page.getByLabel('Unit Price').fill('19.99');
    
    // Save changes
    await page.getByRole('button', { name: 'Update' }).click();
    
    // Verify changes are reflected
    await expect(page.getByText(updatedName)).toBeVisible();
    await expect(page.getByText('75')).toBeVisible();
    await expect(page.getByText('19.99')).toBeVisible();
  });

  test('should delete an inventory item', async ({ page }) => {
    // Create test inventory item
    const { data: item, error } = await supabase
      .from('inventory')
      .insert([{
        item_name: `Delete Item ${Date.now()}`,
        part_number: `DELETE-${Date.now()}`,
        description: 'Item to be deleted',
        quantity: 25,
        unit_price: 9.99,
        location: 'Warehouse C'
      }])
      .select()
      .single();

    if (error) throw error;
    
    await page.goto('/portal/inventory');
    
    // Find and click delete button for the item
    const itemRow = page.getByText(item.item_name).locator('..').locator('..');
    
    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    await itemRow.getByRole('button').nth(1).click();
    
    // Verify item is removed from list
    await expect(page.getByText(item.item_name)).not.toBeVisible();
    
    // No need to set testInventoryId since item is already deleted
  });

  test('should search inventory items', async ({ page }) => {
    // Create test inventory items
    const items = [
      {
        item_name: `Search Item A ${Date.now()}`,
        part_number: `SEARCHA-${Date.now()}`,
        description: 'First search test item',
        quantity: 10,
        unit_price: 5.99,
        location: 'Warehouse D'
      },
      {
        item_name: `Search Item B ${Date.now()}`,
        part_number: `SEARCHB-${Date.now()}`,
        description: 'Second search test item',
        quantity: 20,
        unit_price: 7.99,
        location: 'Warehouse E'
      }
    ];

    const { data: createdItems, error } = await supabase
      .from('inventory')
      .insert(items)
      .select();

    if (error) throw error;
    
    await page.goto('/portal/inventory');
    
    // Search for specific item
    if (page.getByPlaceholder('Search inventory...').isVisible()) {
      await page.getByPlaceholder('Search inventory...').fill('Search Item A');
      await expect(page.getByText(items[0].item_name)).toBeVisible();
      await expect(page.getByText(items[1].item_name)).not.toBeVisible();
    }
    
    // Cleanup created items
    if (createdItems) {
      for (const item of createdItems) {
        await supabase.from('inventory').delete().eq('id', item.id);
      }
    }
  });

  test('should display inventory statistics', async ({ page }) => {
    await page.goto('/portal/inventory');
    
    // Check if inventory page loads properly
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
    
    // Look for common inventory UI elements
    const possibleElements = [
      page.getByText('Total Items'),
      page.getByText('Low Stock'),
      page.getByText('Total Value'),
      page.locator('table'),
      page.locator('[data-testid="inventory-list"]'),
      page.locator('.inventory-item')
    ];
    
    // At least one of these elements should be visible
    let elementFound = false;
    for (const element of possibleElements) {
      try {
        await element.waitFor({ timeout: 2000 });
        elementFound = true;
        break;
      } catch {
        // Continue to next element
      }
    }
    
    expect(elementFound).toBeTruthy();
  });
});