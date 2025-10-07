# Repair Order PDF & Packaging Slip Enhancement Plan

## 0. Implementation Status (Oct 2025)
- New RO PDF template implemented directly inside the page using existing shared building blocks (no new shared components introduced).
- Existing route `app/portal/repair-orders/[id]/pdf/page.tsx` now renders the new layout and reads optional client-side overrides from `localStorage` key `ro_pdf_overrides_<RO_ID>`.
- Added an edit UI at `app/portal/repair-orders/[id]/pdf/edit` to input PDF overrides (ship invoice number, packing slip fields, financial breakdown) and to prefill Country of Origin by selecting a Part Number.
- Database migration for persistent fields is still pending (see section 3). The edit page persists overrides locally until migrations are applied.

## 1. Current State Assessment
- The repair order PDF page (`app/portal/repair-orders/[id]/pdf/page.tsx`) renders a generic layout with TASAVIA header via `PDFHeader`, company grid, items table, traceability blocks, certification summary, and default `PDFFinancialSummary` and `PDFFooter` components. The layout does not match the specific RO template shared (two-column header, packing slip section, certification declaration, etc.).
- Data is fetched client-side from Supabase using the authenticated browser client. The query joins `companies`, `company_addresses`, `company_contacts`, and `repair_order_items -> inventory -> pn_master_table`. Totals rely on `repair_orders.total_cost`; there are no dedicated fields for packing slip metadata or certification statements.
- Edit and creation pages (`app/portal/repair-orders/[id]/edit/RepairOrderEditClientPage.tsx`, `app/portal/repair-orders/new/NewRepairOrderClientPage.tsx`) allow selecting existing inventory records, capturing workscope, estimated cost, expected return date, remarks, and vendor. They do not expose packaging information (country of origin, end-use, AWB, dimensions) or direct part-number selection independent of inventory records.
- Purchase Order (PO) and Sales Order (SO) PDF modules provide precedent for: (1) server-side data hydration with enriched relationships, (2) structured packing slip PDFs (`app/portal/sales-orders/[id]/packing-slip/PackingSlipClientPage.tsx`), and (3) financial summaries implemented via shared components under `components/pdf/`.

## 2. Target Template Requirements Recap
- **Header:** two-column layout with TASAVIA branding on the left and RO number/date/invoice meta on the right. Specific typography and color accents (blue logo, red highlights) must match the provided sample.
- **Recipient Blocks:** "TO" and "SHIP TO/CONSIGNEE" columns with consistent address data and red emphasis for counterpart details.
- **Items Table:** columns (Item, Description, P/N, S/N, Workscope, Price) with gray header row, red typography for key values, and reserved blank rows.
- **Certification Declaration:** full-width gray header and static declaration text.
- **Packing Slip Section:** grey header plus structured key-value rows (End-Use/Buyer Country, Country of Origin, Freighter AWB #, Dimensions L×W×H || Gr. Wgt/Kgs) with selective red emphasis.
- **Footer:** return address block (red text) and financial summary (Sub Total, Misc Charge, Freight/Forwarding, VAT, Total NET), followed by signature and confirmation fields.

## 3. Data Model & API Enhancements
1. **Repair Order Core Table (`repair_orders`):**
   - Add columns for `ship_invoice_number`, `end_use_country`, `country_of_origin`, `freighter_awb`, `dimensions_note`, `subtotal_amount`, `misc_charge_amount`, `freight_charge_amount`, `vat_percentage`, `vat_amount_override`, and `total_net_amount` to align with pricing and packing slip sections.
   - Introduce `ship_to_company_id` separate from vendor to support different consignee destinations.
   - Store `certification_requirement` (default "TCCA RELEASE") and `declaration_text` override to keep template flexible.
2. **Repair Order Items (`repair_order_items`):**
   - Add `unit_price` and `line_total` fields to populate the Price column per item. Ensure `pn_id` reference is optional when using inventory selection for traceability.
3. **Packaging Slip Metadata:**
   - Introduce `repair_order_packaging` table keyed by `repair_order_id` to capture multi-row packing records if future expansion is needed (e.g., multiple boxes). Columns: `end_use_country`, `country_of_origin`, `freighter_awb`, `dimensions`, `gross_weight_kg`, `notes`.
   - Alternatively, if single-record suffices, reuse columns on `repair_orders` but encapsulate in a JSONB `packing_slip` column for flexibility (store fields for AWB, dimensions, gross weight, pallet count).
4. **Part Number Selection:**
   - Allow `repair_order_items` to reference `pn_master_table` directly (via new `pn_id` foreign key) when no inventory record exists. Maintain existing `inventory_id` optional (nullable) but enforce at least one of `inventory_id` or `pn_id`.
   - Update Supabase policies and views to permit fetching part metadata for authorized roles.
5. **Server-Side Fetching:**
   - Mirror PO PDF approach by introducing a server-side loader (`app/portal/repair-orders/[id]/pdf/page.tsx` -> async fetch) to reduce client dependencies and ensure deterministic data for PDF generation.

## 4. Form & UI Adjustments
1. **Edit/New Repair Order Forms:**
   - Add sections for **Shipment & Packing Details** (fields: Ship Invoice Number, End-Use Country, Country of Origin, Freighter AWB, Dimensions, Gross Weight) and **Financial Summary Overrides** (Subtotal, Misc Charge, Freight/Forwarding, VAT %, Total Net). Validate currency consistency and auto-calc totals with ability to override.
   - Introduce **Part Selection Modal** that lets users search `pn_master_table` (filter by PN, description, ATA chapter). Provide option to create item using part number only or link to inventory. On selection, auto-populate description and allow manual S/N entry.
   - Update item grid to capture `unit_price`, `workscope`, `serial_number`, and `price_notes`. Derive `line_total` (qty assumed 1; allow override for multiples if required).
   - Display packaging slip preview block similar to PO/SO forms for live feedback.
2. **Validation & UX:**
   - Use `zod` schemas aligning with new DB fields. Ensure required red-accent fields per template (e.g., part number, workscope) have clear validation messaging.
   - Provide computed VAT/Total Net summary using shared `FinancialSummary` hook to mirror PO module behavior.

## 5. PDF Template Redesign Tasks
1. **Create Dedicated Repair Order PDF Component:**
   - Build `RepairOrderPdfClientPage` (similar to PO) that composes `PDFLayout` but uses bespoke sections to mirror the provided template: two-column header, recipient columns, item table with styled rows, certification block, packing slip block, footer with return address + totals, signature row.
   - Introduce reusable subcomponents if necessary (`RepairOrderHeader`, `RepairOrderPackingSlip`, `RepairOrderFooter`) under `components/pdf/repair-orders/` to keep template logic isolated.
   - Support optional blank rows by calculating difference between minimum rows (e.g., 4) and actual items.
   - Highlight data in red using Tailwind utility classes (e.g., `text-red-600`). Use `Image` for TASAVIA logo from `/public/tasavia-logo-black.png` as in PO PDF.
2. **Data Binding:**
   - Map new data fields (Ship Invoice, Date, Certification text, Packing slip values) to respective sections. Fallback gracefully when optional fields missing (display placeholders or blank lines).
   - Render packaging slip rows with dashed underline or blank cells for manual fill when values absent.
3. **Signature & Confirmation Row:**
   - Extend `PDFSignatureBlock` or craft custom grid to match template: left cell for authorized signature (include scanned signature image if stored), right cell for confirmation field.

## 6. Packaging Slip Generation & Integration
1. **Standalone Packing Slip View:**
   - Provide `/portal/repair-orders/[id]/packing-slip` route replicating Sales Order packing slip logic but sourcing new packaging fields. Allows printing slip independently of RO.
   - Reuse `PDFLayout` with `documentType="PACKING SLIP"` and ensure fields align with template.
2. **Automated Data Sync:**
   - When editing packaging fields in RO form, persist to both repair order record and packaging slip structure. Consider event triggers or Supabase functions to keep aggregated totals consistent.
   - Update compliance package generator (`lib/compliance-package-generator.ts`) to include RO packing slip data when building document bundles.

## 7. Implementation Phases
1. **Discovery & Schema Updates (DB Migration):**
   - Draft Supabase migration adding new columns/tables and adjust policies. Provide backfill script to populate existing ROs with default values (e.g., copy vendor address into Ship To).
2. **API & Data Layer:**
   - Update server loaders for RO view/edit/pdf routes to fetch new relations and computed totals. Ensure type definitions reflect additional fields.
3. **Form Enhancements:**
   - Extend React Hook Form schemas, add UI sections, implement part number search modal (could reuse `InventoryItemPicker` with PN mode).
   - Add derived calculations for subtotal/total net; ensure currency formatting consistent with PO module.
4. **PDF Redesign:**
   - Build new PDF components with template styling; incorporate new data fields. Add screenshot-based regression manual QA.
5. **Packing Slip Route:**
   - Introduce dedicated page and ensure accessible via RO detail view (button similar to PO/SO).
6. **Testing & QA:**
   - Write unit tests for data transformation helpers (e.g., packaging slip mapping). Add Playwright scenario verifying PDF view renders required sections. QA with sample data to match provided template visually.

## 8. Risks & Mitigations
- **Data Completeness:** Existing records may lack packaging fields. Mitigate with defaults and admin prompts when exporting PDF.
- **Template Pixel Fidelity:** Tailwind-based layout may require fine-tuning for print; plan design review with provided sample, leveraging print preview tests.
- **Part Number vs Inventory Complexity:** Ensure business rules allow part-only entries without affecting stock. Possibly create placeholder inventory records or adjust downstream workflows accordingly.
- **Performance:** Server-side PDF data fetch should cache judiciously; consider using `dynamic = 'force-dynamic'` similar to PO to avoid stale info.

## 9. Acceptance Criteria
- New repair order PDF visually matches provided template (layout, colors, fields) across Chrome print preview.
- Edit/new RO forms capture and persist packaging slip and pricing data, including direct part number selection.
- Packaging slip route produces same data as embedded section and is accessible for print.
- Compliance package generator includes updated RO data without regression in PO/SO flows.
- All new fields validated and surfaced via Supabase migrations with rollback scripts.
