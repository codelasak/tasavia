# TASAVIA Supabase Database Schema

Below is the current schema for the TASAVIA Internal Dashboard as implemented in Supabase.

---

## Table: my_companies
**Description:** Stores TASAVIA's internal company entities.
```sql
CREATE TABLE my_companies (
  my_company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  my_company_name TEXT NOT NULL,
  my_company_code TEXT UNIQUE NOT NULL,
  my_company_address TEXT,
  zip_code TEXT,
  city TEXT,
  country TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Table: companies
**Description:** Stores external companies (vendors/customers).
```sql
CREATE TABLE companies (
  company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  company_code TEXT UNIQUE,
  address TEXT,
  zip_code TEXT,
  city TEXT,
  country TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  default_ship_via_company_name TEXT,
  default_ship_account_no TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Table: pn_master_table
**Description:** Master list of part numbers (PNs).
```sql
CREATE TABLE pn_master_table (
  pn_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pn TEXT NOT NULL UNIQUE,
  description TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Table: my_ship_via
**Description:** Shipping companies used by TASAVIA.
```sql
CREATE TABLE my_ship_via (
  ship_via_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ship_company_name TEXT NOT NULL,
  owner TEXT,
  account_no TEXT NOT NULL,
  ship_model TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Table: purchase_orders
**Description:** Purchase order headers.
```sql
CREATE TABLE purchase_orders (
  po_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT UNIQUE NOT NULL,
  my_company_id UUID NOT NULL REFERENCES my_companies(my_company_id),
  vendor_company_id UUID NOT NULL REFERENCES companies(company_id),
  po_date DATE NOT NULL DEFAULT current_date,
  prepared_by_user_id UUID,
  prepared_by_name TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  ship_via_id UUID REFERENCES my_ship_via(ship_via_id),
  ship_account_no_override TEXT,
  payment_term TEXT,
  awb_no TEXT,
  remarks_1 TEXT,
  remarks_2 TEXT,
  total_amount DECIMAL(12,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Table: po_items
**Description:** Line items for each purchase order.
```sql
CREATE TABLE po_items (
  po_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
  pn_id UUID NOT NULL REFERENCES pn_master_table(pn_id),
  description_override TEXT,
  sn TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  condition TEXT,
  line_total DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Table: inventory
**Description:** Inventory items, linked to PNs and POs.
```sql
CREATE TABLE inventory (
  inventory_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pn_id UUID NOT NULL REFERENCES pn_master_table(pn_id),
  sn TEXT,
  po_price DECIMAL(10,2),
  po_id_original UUID REFERENCES purchase_orders(po_id),
  po_number_original TEXT,
  remarks TEXT,
  status TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_pn_sn UNIQUE (pn_id, sn)
);
```

---

## Table: roles
**Description:** Defines user roles for RBAC.
```sql
CREATE TABLE roles (
  role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_name TEXT UNIQUE NOT NULL,
  description TEXT
);
```

---

## Table: user_roles
**Description:** Assigns roles to users (many-to-many with auth.users).
```sql
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);
```
