# Feedback v3 — Inventory Context Plan (DDD)

## Context Overview
The Inventory bounded context manages item availability, depot tracking, and integration with orders. Current feedback identifies terminology mismatches and runtime errors when accessing specific inventory records.

## Bounded Context & Ubiquitous Language
- **Inventory Context**: aggregates `InventoryItem`, `StockStatus`, and projections consumed by the portal.
- Language adjustments: *In Stock* replaces legacy label *In Depot* to align with customer terminology.
- Integrations: Orders context for inventory reservation and UI for browsing item details.

## Current Code Observations
- Physical status labels previously rendered “At Depot” in badges, selectors, and filters. These are now updated to “In Stock” to match the requested terminology.
- Inventory detail page crashed due to a mix of (a) joining `pn_master_table` via PostgREST implicit relationship (ambiguous in this schema) and (b) referencing non-existent fields (`quantity`, `unit_cost`, `total_value`) and wrong columns (`serial_number` instead of `sn`, `notes` instead of `remarks`).
- Delete flows share the same generic handler, reinforcing the need for explicit domain guard clauses (`app/portal/inventory/[id]/page.tsx:72-85`).

## Implemented Changes
- Terminology: replaced “At Depot/Depot” with “In Stock”.
  - `components/inventory/DualStatusBadges.tsx:42,275`
  - `components/inventory/InventoryDialog.tsx:258`
  - `app/portal/inventory/inventory-list.tsx:287`
  - `lib/types/inventory.ts:217,224` (display labels for common combinations)
  - Tests updated: `__tests__/lib/types/inventory.test.ts:16-33`
- Inventory detail fix (`/portal/inventory/[id]`):
  - Avoided implicit relationship joins; fetches `inventory` then fetches `pn_master_table` by `pn_id`.
  - Corrected fields: use `sn`, `po_price`, and `remarks`; removed assumptions about `quantity`, `unit_cost`, `total_value`.
  - Shows quantity as `1` and computes totals defensively.
  - File: `app/portal/inventory/[id]/page.tsx`

## Aggregates & Entities
- **InventoryItem Aggregate**: holds stock quantity, locations, and linked purchase order information.
- **InventoryView Projection**: supports portal detail pages; needs robust error handling when items are missing or corrupted.

## Domain Rules to Implement
1. **Terminology Alignment**
   - Update domain translation resources and UI bindings to display `In Stock` label while preserving internal status codes.
   - Communicate change to reporting/analytics to ensure consistent vocabulary.
2. **Inventory Detail Reliability**
   - Investigate `portal/inventory/{id}` failure (`get something wrong`) and trace to repository or projection inconsistencies.
   - Add domain guard clauses for missing items, returning explicit `InventoryItemNotFound` domain errors handled by UI.
   - Validate data integrity for referenced purchase orders or stock locations to prevent cascading failures.

## Application Services & Interfaces
- Update inventory query handlers to map domain errors to HTTP 404/422 responses with actionable messages.
- Enhance logging around inventory detail fetches to detect corruption or authorization issues.

## Infrastructure Considerations
- If failure stems from stale projections, introduce rebuild job or event reprocessing for affected item IDs.
- Monitor inventory detail endpoint with observability dashboards to catch recurrence.

## Suggested SQL Additions (for Supabase)
- Add a single-item RPC to mirror the list RPC and simplify detail queries:

  Function: `get_inventory_item_with_part(inv_id uuid)`
  - Returns one row with `inventory` columns and an embedded JSON `pn_master_table` (pn, description).
  - See migration snippet in the task handoff below.

## Testing Strategy
- Unit tests for label translation logic ensuring `StockStatus` renders `In Stock`.
- Integration tests hitting `/portal/inventory/:id` with valid and invalid IDs to verify graceful handling.
- Add regression test ensuring inventory items linked to orders still render after order workflow changes.

## Open Questions
- Does “In Stock” need localization support for other languages?
- Are there inventory records missing mandatory relationships (e.g., purchase order link) causing the current crash?
