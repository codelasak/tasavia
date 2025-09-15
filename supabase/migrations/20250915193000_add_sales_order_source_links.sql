-- Add header-level source linkage from SO -> PO/RO
-- Ensures every sales order is created from exactly one source

begin;

alter table public.sales_orders
  add column if not exists source_purchase_order_id uuid references public.purchase_orders(po_id) on update cascade on delete set null,
  add column if not exists source_repair_order_id uuid references public.repair_orders(repair_order_id) on update cascade on delete set null;

-- Enforce at most one of the two is non-null (allows existing rows with both null)
alter table public.sales_orders
  drop constraint if exists sales_orders_at_most_one_source_chk,
  add constraint sales_orders_at_most_one_source_chk
    check ( not (source_purchase_order_id is not null and source_repair_order_id is not null) );

-- Helpful indexes
create index if not exists idx_sales_orders_source_po on public.sales_orders(source_purchase_order_id);
create index if not exists idx_sales_orders_source_ro on public.sales_orders(source_repair_order_id);

commit;