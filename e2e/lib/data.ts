import { supabase } from './supabase';

// --- My Companies --- //

export async function createMyCompany(companyData: { name: string; address?: string; city?: string; state?: string; zip?: string; country?: string; my_company_code?: string; }) {
  const { name, my_company_code, ...rest } = companyData;
  // Always provide a unique my_company_code if not supplied
  const code = my_company_code || `CODE-${name.replace(/\s+/g, '').toUpperCase()}-${Date.now()}`;
  const { data, error } = await supabase
    .from('my_companies')
    .insert([{ my_company_name: name, my_company_code: code, ...rest }])
    .select()
    .single();

  if (error) {
    console.error('Error creating my_company:', error);
    throw error;
  }

  return data;
}

export async function deleteMyCompany(companyId: number) {
  const { error } = await supabase
    .from('my_companies')
    .delete()
    .eq('id', companyId);

  if (error) {
    console.error('Error deleting my_company:', error);
    throw error;
  }
}

// --- Purchase Orders --- //

export async function createPurchaseOrder(orderData: { 
  po_number: string; 
  company_id: number; 
  ship_via?: string; 
  terms?: string; 
  status?: string; 
}) {
  const { data, error } = await supabase
    .from('purchase_orders')
    .insert([{ 
      status: 'draft',
      ...orderData 
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating purchase order:', error);
    throw error;
  }

  return data;
}

export async function deletePurchaseOrder(orderId: string) {
  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', orderId);

  if (error) {
    console.error('Error deleting purchase order:', error);
    throw error;
  }
}

// --- Inventory --- //

export async function createInventoryItem(itemData: {
  item_name: string;
  part_number: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  location?: string;
}) {
  const { data, error } = await supabase
    .from('inventory')
    .insert([{
      quantity: 0,
      unit_price: 0,
      ...itemData
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }

  return data;
}

export async function deleteInventoryItem(itemId: number) {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
}

// --- Part Numbers --- //

export async function createPartNumber(partData: {
  part_number: string;
  description?: string;
  manufacturer?: string;
  category?: string;
  unit_of_measure?: string;
  standard_cost?: number;
}) {
  const { data, error } = await supabase
    .from('part_numbers')
    .insert([{
      standard_cost: 0,
      ...partData
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating part number:', error);
    throw error;
  }

  return data;
}

export async function deletePartNumber(partId: number) {
  const { error } = await supabase
    .from('part_numbers')
    .delete()
    .eq('id', partId);

  if (error) {
    console.error('Error deleting part number:', error);
    throw error;
  }
}
