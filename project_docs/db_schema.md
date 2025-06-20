-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accounts (
  id uuid NOT NULL,
  name text,
  picture_url text,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.announcements (
  title text NOT NULL,
  content text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  date timestamp with time zone NOT NULL DEFAULT now(),
  views integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Önemli'::text,
  CONSTRAINT announcements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.companies (
  company_name text NOT NULL,
  company_code text UNIQUE,
  default_ship_via_company_name text,
  default_ship_account_no text,
  company_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_type text DEFAULT 'vendor'::text CHECK (company_type = ANY (ARRAY['vendor'::text, 'customer'::text, 'both'::text])),
  CONSTRAINT companies_pkey PRIMARY KEY (company_id)
);
CREATE TABLE public.company_addresses (
  company_id uuid NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text,
  zip_code text,
  country text,
  address_id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_ref_type text NOT NULL DEFAULT 'my_companies'::text,
  CONSTRAINT company_addresses_pkey PRIMARY KEY (address_id),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES public.my_companies(my_company_id),
  CONSTRAINT fk_company_companies FOREIGN KEY (company_id) REFERENCES public.companies(company_id)
);
CREATE TABLE public.company_contacts (
  company_id uuid NOT NULL,
  email text,
  phone text,
  role text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  contact_name text NOT NULL,
  contact_id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_ref_type text NOT NULL DEFAULT 'my_companies'::text,
  is_primary boolean NOT NULL DEFAULT false,
  CONSTRAINT company_contacts_pkey PRIMARY KEY (contact_id),
  CONSTRAINT fk_company_contact FOREIGN KEY (company_id) REFERENCES public.my_companies(my_company_id),
  CONSTRAINT fk_company_contacts_companies FOREIGN KEY (company_id) REFERENCES public.companies(company_id)
);
CREATE TABLE public.inventory (
  pn_id uuid NOT NULL,
  po_price numeric,
  po_id_original uuid,
  po_number_original text,
  remarks text,
  status text,
  location text,
  inventory_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  serial_number text,
  total_value numeric DEFAULT ((quantity)::numeric * unit_cost),
  condition text DEFAULT 'New'::text,
  quantity integer DEFAULT 1,
  unit_cost numeric DEFAULT 0.00,
  notes text,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id),
  CONSTRAINT inventory_pn_id_fkey FOREIGN KEY (pn_id) REFERENCES public.pn_master_table(pn_id),
  CONSTRAINT inventory_po_id_original_fkey FOREIGN KEY (po_id_original) REFERENCES public.purchase_orders(po_id)
);
CREATE TABLE public.my_companies (
  my_company_name text NOT NULL,
  my_company_code text NOT NULL UNIQUE,
  my_company_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT my_companies_pkey PRIMARY KEY (my_company_id)
);
CREATE TABLE public.my_ship_via (
  ship_company_name text NOT NULL,
  owner text,
  account_no text NOT NULL,
  ship_model text,
  ship_via_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT my_ship_via_pkey PRIMARY KEY (ship_via_id)
);
CREATE TABLE public.pn_master_table (
  pn text NOT NULL UNIQUE,
  description text,
  remarks text,
  pn_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pn_master_table_pkey PRIMARY KEY (pn_id)
);
CREATE TABLE public.po_items (
  po_id uuid NOT NULL,
  pn_id uuid NOT NULL,
  sn text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  condition text,
  po_item_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  line_total numeric DEFAULT ((quantity)::numeric * unit_price),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  line_number integer NOT NULL,
  CONSTRAINT po_items_pkey PRIMARY KEY (po_item_id),
  CONSTRAINT po_items_pn_id_fkey FOREIGN KEY (pn_id) REFERENCES public.pn_master_table(pn_id),
  CONSTRAINT po_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(po_id)
);
CREATE TABLE public.purchase_orders (
  my_company_id uuid NOT NULL,
  vendor_company_id uuid NOT NULL,
  prepared_by_user_id uuid,
  prepared_by_name text,
  ship_via_id uuid,
  ship_account_no_override text,
  payment_term text,
  awb_no text,
  remarks_1 text,
  remarks_2 text,
  po_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  po_date date NOT NULL DEFAULT CURRENT_DATE,
  currency text NOT NULL DEFAULT 'USD'::text,
  total_amount numeric DEFAULT 0.00,
  status text NOT NULL DEFAULT 'Draft'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  po_number text NOT NULL DEFAULT generate_po_number() UNIQUE,
  ship_to_company_name text,
  ship_to_address_details text,
  ship_to_contact_name text,
  ship_to_contact_phone text,
  ship_to_contact_email text,
  freight_charge numeric DEFAULT 0.00,
  misc_charge numeric DEFAULT 0.00,
  vat_percentage numeric DEFAULT 0.00,
  subtotal numeric DEFAULT 0.00,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (po_id),
  CONSTRAINT purchase_orders_my_company_id_fkey FOREIGN KEY (my_company_id) REFERENCES public.my_companies(my_company_id),
  CONSTRAINT purchase_orders_ship_via_id_fkey FOREIGN KEY (ship_via_id) REFERENCES public.my_ship_via(ship_via_id),
  CONSTRAINT purchase_orders_vendor_company_id_fkey FOREIGN KEY (vendor_company_id) REFERENCES public.companies(company_id)
);
CREATE TABLE public.roles (
  role_name text NOT NULL UNIQUE,
  description text,
  role_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  CONSTRAINT roles_pkey PRIMARY KEY (role_id)
);
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id)
);