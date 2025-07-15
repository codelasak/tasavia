# Purchase Orders API Documentation

## Overview
Complete API documentation for the TASAVIA Purchase Orders module, covering all endpoints, data models, and workflows.

## Table of Contents
- [Data Models](#data-models)
- [API Endpoints](#api-endpoints)
- [Business Logic](#business-logic)
- [Security & Validation](#security--validation)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Data Models

### PurchaseOrder
```typescript
interface PurchaseOrder {
  po_id: string;                    // UUID primary key
  po_number: string;                // Auto-generated (P25001, P25002...)
  my_company_id: string;            // FK to my_companies
  vendor_company_id: string;        // FK to companies
  po_date: string;                  // ISO date string
  ship_to_company_name?: string;    // Ship-to company name
  ship_to_address_details?: string; // Formatted address
  ship_to_contact_name?: string;    // Contact person
  ship_to_contact_phone?: string;   // Contact phone
  ship_to_contact_email?: string;   // Contact email
  prepared_by_name: string;         // User who created PO
  currency: string;                 // USD, EUR, GBP, TL
  ship_via_id?: string;            // FK to my_ship_via
  payment_term?: string;           // NET30, COD, etc.
  remarks_1?: string;              // Additional notes
  freight_charge: number;          // Default 0.00
  misc_charge: number;             // Default 0.00
  vat_percentage: number;          // Default 0.00
  subtotal: number;                // Calculated field
  total_amount: number;            // Final total
  status: 'Draft' | 'Sent' | 'Acknowledged' | 'Completed' | 'Cancelled';
  created_at: string;              // ISO timestamp
  updated_at: string;              // ISO timestamp
}
```

### POItem
```typescript
interface POItem {
  po_item_id: string;              // UUID primary key
  po_id: string;                   // FK to purchase_orders
  line_number: number;             // Sequential line number
  pn_id: string;                   // FK to pn_master_table
  description: string;             // Item description
  sn?: string;                     // Serial number
  quantity: number;                // Quantity ordered
  unit_price: number;              // Price per unit
  condition?: string;              // AR, SVC, AS-IS, OHC, etc.
  line_total: number;              // Calculated: quantity * unit_price
  created_at: string;              // ISO timestamp
  updated_at: string;              // ISO timestamp
}
```

### Company Information
```typescript
interface MyCompany {
  my_company_id: string;
  my_company_name: string;
  my_company_code: string;
  company_addresses: CompanyAddress[];
  company_contacts: CompanyContact[];
}

interface ExternalCompany {
  company_id: string;
  company_name: string;
  company_code: string;
  company_addresses: CompanyAddress[];
  company_contacts: CompanyContact[];
}

interface CompanyAddress {
  address_line1: string;
  address_line2?: string;
  city?: string;
  country?: string;
}

interface CompanyContact {
  contact_name: string;
  email?: string;
  phone?: string;
}
```

## API Endpoints

### GET /portal/purchase-orders
**Purpose**: Retrieve all purchase orders  
**Auth**: Required  
**Query Parameters**: None  
**Response**: Array of PurchaseOrder with company details

```sql
SELECT 
  po.*,
  my_company.my_company_name,
  my_company.my_company_code,
  vendor.company_name,
  vendor.company_code
FROM purchase_orders po
JOIN my_companies my_company ON po.my_company_id = my_company.my_company_id
JOIN companies vendor ON po.vendor_company_id = vendor.company_id
ORDER BY po.created_at DESC
```

### GET /portal/purchase-orders/[id]
**Purpose**: Retrieve specific purchase order  
**Auth**: Required  
**Parameters**: `id` - Purchase order UUID  
**Response**: Detailed PurchaseOrder with related data

```sql
SELECT 
  po.*,
  my_company.*,
  vendor.*,
  ship_company.*
FROM purchase_orders po
LEFT JOIN my_companies my_company ON po.my_company_id = my_company.my_company_id
LEFT JOIN companies vendor ON po.vendor_company_id = vendor.company_id  
LEFT JOIN my_ship_via ship_company ON po.ship_via_id = ship_company.ship_via_id
WHERE po.po_id = $1
```

### POST /portal/purchase-orders/new
**Purpose**: Create new purchase order  
**Auth**: Required  
**Body**: PurchaseOrderCreateRequest  
**Response**: Created PurchaseOrder with generated po_number

**Business Logic**:
1. Validate all required fields
2. Calculate subtotal from line items
3. Calculate VAT and total amounts
4. Generate PO number (format: P{YY}{sequence})
5. Create purchase order record
6. Create line item records
7. Return complete PO data

### PUT /portal/purchase-orders/[id]/edit
**Purpose**: Update existing purchase order  
**Auth**: Required  
**Parameters**: `id` - Purchase order UUID  
**Body**: PurchaseOrderUpdateRequest  
**Response**: Updated PurchaseOrder

**Business Logic**:
1. Validate ownership and permissions
2. Delete existing line items
3. Recalculate totals
4. Update purchase order
5. Create new line items
6. Handle status-specific logic (completion workflow)

### DELETE /portal/purchase-orders/[id]
**Purpose**: Delete purchase order  
**Auth**: Required  
**Parameters**: `id` - Purchase order UUID  
**Response**: Success confirmation

**Business Logic**:
1. Check for inventory references
2. Delete line items first (FK constraint)
3. Delete purchase order
4. Handle referential integrity errors

## Business Logic

### PO Number Generation
```sql
CREATE OR REPLACE FUNCTION generate_po_number() RETURNS TEXT AS $$
DECLARE
    year_suffix TEXT;
    next_sequence INTEGER;
    po_number TEXT;
BEGIN
    year_suffix := LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2, '0');
    year_suffix := RIGHT(year_suffix, 2);
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_sequence
    FROM purchase_orders
    WHERE po_number LIKE 'P' || year_suffix || '%';
    
    po_number := 'P' || year_suffix || LPAD(next_sequence::TEXT, 3, '0');
    
    RETURN po_number;
END;
$$ LANGUAGE plpgsql;
```

### Cost Calculations
```typescript
// Subtotal calculation
const subtotal = items.reduce((sum, item) => 
  sum + (item.quantity * item.unit_price), 0
);

// VAT calculation
const vatAmount = subtotal * (vat_percentage / 100);

// Total calculation
const total = subtotal + freight_charge + misc_charge + vatAmount;
```

### Status Workflow
```
Draft → Sent → Acknowledged → Completed
  ↓       ↓         ↓           ↓
Cancelled (from any status)
```

**Status Transitions**:
- **Draft**: Editable, can be sent or cancelled
- **Sent**: Read-only, awaiting vendor acknowledgment
- **Acknowledged**: Vendor confirmed, ready for completion
- **Completed**: Creates inventory items, minimal editing
- **Cancelled**: Terminal state, archived

### Completion Workflow
When PO status changes to "Completed":
1. Validate line items exist
2. Create inventory records for each line item
3. Set inventory fields:
   - `pn_id` from line item
   - `quantity` from line item
   - `unit_cost` from line item unit_price
   - `condition` from line item
   - `po_id_original` reference
   - `po_number_original` reference

## Security & Validation

### Authentication
All endpoints require valid Supabase session with active user account.

### Authorization
Row Level Security (RLS) policies control data access:
```sql
-- Purchase orders accessible to authenticated users
CREATE POLICY "purchase_orders_select" ON purchase_orders
  FOR SELECT TO authenticated
  USING (true);

-- Only users can create/update their own purchase orders
CREATE POLICY "purchase_orders_insert" ON purchase_orders
  FOR INSERT TO authenticated
  WITH CHECK (true);
```

### Input Validation
**Server-side validation using Zod schemas**:
```typescript
const purchaseOrderSchema = z.object({
  my_company_id: z.string().min(1, 'My company is required'),
  vendor_company_id: z.string().min(1, 'Vendor is required'),
  po_date: z.date(),
  currency: z.enum(['USD', 'EURO', 'TL', 'GBP']),
  items: z.array(poItemSchema).min(1, 'At least one item is required'),
  // ... other fields
});

const poItemSchema = z.object({
  pn_id: z.string().min(1, 'Part number is required'),
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be positive'),
});
```

### Data Sanitization
- HTML input sanitization for text fields
- SQL injection prevention through parameterized queries
- File upload restrictions for attachments

## Error Handling

### Common Error Responses
```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}
```

### Error Codes
- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **422**: Unprocessable Entity - Validation errors
- **500**: Internal Server Error - System error

### Business Logic Errors
```typescript
// Foreign key constraint violations
if (error.code === '23503') {
  return { error: 'REFERENCE_ERROR', message: 'Referenced record not found' };
}

// Unique constraint violations  
if (error.code === '23505') {
  return { error: 'DUPLICATE_ERROR', message: 'Record already exists' };
}

// Check constraint violations
if (error.code === '23514') {
  return { error: 'VALIDATION_ERROR', message: 'Invalid data format' };
}
```

## Examples

### Create Purchase Order
```typescript
const newPO = {
  my_company_id: "123e4567-e89b-12d3-a456-426614174000",
  vendor_company_id: "234e5678-e89b-12d3-a456-426614174001", 
  po_date: "2025-01-15",
  prepared_by_name: "John Smith",
  currency: "USD",
  payment_term: "NET30",
  freight_charge: 50.00,
  vat_percentage: 8.5,
  items: [
    {
      pn_id: "345e6789-e89b-12d3-a456-426614174002",
      description: "Aircraft Engine Component",
      quantity: 2,
      unit_price: 1500.00,
      condition: "AR"
    }
  ]
};

const response = await fetch('/api/purchase-orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newPO)
});
```

### Update Purchase Order
```typescript
const updates = {
  status: "Sent",
  remarks_1: "Updated delivery requirements",
  items: [
    // Updated line items array
  ]
};

const response = await fetch(`/api/purchase-orders/${poId}`, {
  method: 'PUT', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updates)
});
```

### Delete Purchase Order
```typescript
const response = await fetch(`/api/purchase-orders/${poId}`, {
  method: 'DELETE'
});

if (response.ok) {
  console.log('Purchase order deleted successfully');
} else {
  const error = await response.json();
  console.error('Delete failed:', error.message);
}
```

---

**Last Updated**: January 2025  
**API Version**: v1.2  
**Maintainer**: Development Team