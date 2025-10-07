-- Repair Order PDF/Packing/Financial fields and item pricing
-- Safe to run multiple times (IF NOT EXISTS used)

begin;

-- Header/meta + packing + financials on repair_orders
alter table public.repair_orders
  add column if not exists ship_invoice_number text,
  add column if not exists ship_to_company_id uuid
    references public.companies(company_id)
    on update cascade on delete set null,
  add column if not exists end_use_country text,
  add column if not exists country_of_origin text,
  add column if not exists freighter_awb text,
  add column if not exists dimensions_note text,
  add column if not exists subtotal numeric(12,2),
  add column if not exists misc_charge numeric(12,2),
  add column if not exists freight_charge numeric(12,2),
  add column if not exists vat_percentage numeric(5,2) default 0,
  add column if not exists vat_amount numeric(12,2),
  add column if not exists total_net numeric(12,2);

-- Helpful index for ship-to company
create index if not exists idx_repair_orders_ship_to_company
  on public.repair_orders(ship_to_company_id);

-- Non-negative amounts check (optional but recommended)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'repair_orders_amounts_nonneg_chk'
  ) then
    alter table public.repair_orders
      add constraint repair_orders_amounts_nonneg_chk
      check (
        (subtotal       is null or subtotal       >= 0) and
        (misc_charge    is null or misc_charge    >= 0) and
        (freight_charge is null or freight_charge >= 0) and
        (vat_amount     is null or vat_amount     >= 0) and
        (total_net      is null or total_net      >= 0)
      );
  end if;

  -- VAT percentage within 0..100
  if not exists (
    select 1 from pg_constraint where conname = 'repair_orders_vat_pct_range_chk'
  ) then
    alter table public.repair_orders
      add constraint repair_orders_vat_pct_range_chk
      check (vat_percentage is null or (vat_percentage >= 0 and vat_percentage <= 100));
  end if;
end $$;

-- Backfill new totals from existing total_cost if present
update public.repair_orders
set
  subtotal = coalesce(subtotal, total_cost),
  total_net = coalesce(total_net, total_cost)
where total_cost is not null;

-- Item-level pricing support for RO items (PRICE column in PDF)
alter table public.repair_order_items
  add column if not exists unit_price numeric(12,2),
  add column if not exists line_total numeric(12,2);

commit;

