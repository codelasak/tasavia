import { test, expect } from '@playwright/test';
import { supabase } from './lib/supabase';

test.describe('Purchase Orders', () => {
  let testCompanyId: number;
  let testPurchaseOrderId: string;

  test.beforeAll(async () => {
    // Create a test company for purchase orders
    const { data: company, error } = await supabase
      .from('my_companies')
      .insert([{
        my_company_name: `Test Company PO ${Date.now()}`,
        my_company_code: `TESTPO-${Date.now()}`,
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zip: '12345',
        country: 'USA'
      }])
      .select()
      .single();

    if (error) throw error;
    testCompanyId = company.id;
  });

  test.afterAll(async () => {
    // Cleanup test data
    if (testPurchaseOrderId) {
      await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', testPurchaseOrderId);
    }
    
    if (testCompanyId) {
      await supabase
        .from('my_companies')
        .delete()
        .eq('id', testCompanyId);
    }
  });

  test('should create a new purchase order', async ({ page }) => {
    await page.goto('/portal/purchase-orders');
    
    // Click New Purchase Order button
    await page.getByRole('button', { name: 'New Purchase Order' }).click();
    
    // Wait for the new purchase order page to load
    await expect(page.getByRole('heading', { name: 'New Purchase Order' })).toBeVisible();
    
    // Fill in purchase order details
    await page.getByLabel('PO Number').fill(`PO-${Date.now()}`);
    
    // Select company from dropdown
    await page.getByRole('combobox', { name: 'Company' }).click();
    await page.getByText('Test Company PO').click();
    
    // Fill additional fields
    await page.getByLabel('Ship Via').fill('UPS Ground');
    await page.getByLabel('Terms').fill('Net 30');
    
    // Save the purchase order
    await page.getByRole('button', { name: 'Create Purchase Order' }).click();
    
    // Verify we're redirected to the purchase order view
    await expect(page.getByRole('heading', { name: /Purchase Order #/ })).toBeVisible();
    
    // Extract the PO ID from URL for cleanup
    const url = page.url();
    const match = url.match(/purchase-orders\/([^\/]+)/);
    if (match) {
      testPurchaseOrderId = match[1];
    }
  });

  test('should view purchase order details', async ({ page }) => {
    // First create a purchase order to view
    const { data: po, error } = await supabase
      .from('purchase_orders')
      .insert([{
        po_number: `VIEW-PO-${Date.now()}`,
        company_id: testCompanyId,
        ship_via: 'FedEx',
        terms: 'Net 15',
        status: 'draft'
      }])
      .select()
      .single();

    if (error) throw error;
    
    await page.goto(`/portal/purchase-orders/${po.id}`);
    
    // Verify purchase order details are displayed
    await expect(page.getByText(`VIEW-PO-${Date.now()}`)).toBeVisible();
    await expect(page.getByText('FedEx')).toBeVisible();
    await expect(page.getByText('Net 15')).toBeVisible();
    
    // Cleanup
    await supabase.from('purchase_orders').delete().eq('id', po.id);
  });

  test('should edit a purchase order', async ({ page }) => {
    // Create a purchase order to edit
    const { data: po, error } = await supabase
      .from('purchase_orders')
      .insert([{
        po_number: `EDIT-PO-${Date.now()}`,
        company_id: testCompanyId,
        ship_via: 'UPS',
        terms: 'Net 30',
        status: 'draft'
      }])
      .select()
      .single();

    if (error) throw error;
    
    await page.goto(`/portal/purchase-orders/${po.id}/edit`);
    
    // Edit purchase order details
    await page.getByLabel('Ship Via').fill('FedEx Express');
    await page.getByLabel('Terms').fill('Net 15');
    
    // Save changes
    await page.getByRole('button', { name: 'Update Purchase Order' }).click();
    
    // Verify changes are saved
    await expect(page.getByText('FedEx Express')).toBeVisible();
    await expect(page.getByText('Net 15')).toBeVisible();
    
    // Cleanup
    await supabase.from('purchase_orders').delete().eq('id', po.id);
  });

  test('should generate PDF for purchase order', async ({ page }) => {
    // Create a purchase order for PDF generation
    const { data: po, error } = await supabase
      .from('purchase_orders')
      .insert([{
        po_number: `PDF-PO-${Date.now()}`,
        company_id: testCompanyId,
        ship_via: 'UPS Ground',
        terms: 'Net 30',
        status: 'approved'
      }])
      .select()
      .single();

    if (error) throw error;
    
    await page.goto(`/portal/purchase-orders/${po.id}`);
    
    // Click PDF generation button
    await page.getByRole('button', { name: 'Generate PDF' }).click();
    
    // Wait for PDF page to load
    await page.waitForURL(`**/purchase-orders/${po.id}/pdf`);
    await expect(page.getByText(`PDF-PO-${Date.now()}`)).toBeVisible();
    
    // Cleanup
    await supabase.from('purchase_orders').delete().eq('id', po.id);
  });

  test('should list all purchase orders', async ({ page }) => {
    await page.goto('/portal/purchase-orders');
    
    // Verify page loads and shows purchase orders list
    await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
    
    // Check if the table or list is present
    await expect(page.locator('[data-testid="purchase-orders-list"], table, .purchase-order-item')).toBeVisible();
  });
});