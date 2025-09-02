-- Add quantity to sales_order_items to support line totals and quantity tracking
ALTER TABLE public.sales_order_items
ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

-- Optionally maintain line_total on insert/update if desired (uncomment to use triggers)
-- CREATE OR REPLACE FUNCTION public.compute_sales_order_item_total()
-- RETURNS trigger AS $$
-- BEGIN
--   NEW.line_total := COALESCE(NEW.quantity, 1) * COALESCE(NEW.unit_price, 0);
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- DROP TRIGGER IF EXISTS trg_compute_so_item_total ON public.sales_order_items;
-- CREATE TRIGGER trg_compute_so_item_total
-- BEFORE INSERT OR UPDATE ON public.sales_order_items
-- FOR EACH ROW EXECUTE FUNCTION public.compute_sales_order_item_total();

