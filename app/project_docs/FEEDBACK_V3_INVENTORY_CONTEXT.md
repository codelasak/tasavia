# Feedback v3 — Inventory Context Plan (DDD)

## Context Overview
The Inventory bounded context manages item availability, depot tracking, and integration with orders. Current feedback identifies terminology mismatches and runtime errors when accessing specific inventory records.

## Bounded Context & Ubiquitous Language
- **Inventory Context**: aggregates `InventoryItem`, `StockStatus`, and projections consumed by the portal.
- Language adjustments: *In Stock* replaces legacy label *In Depot* to align with customer terminology.
- Integrations: Orders context for inventory reservation and UI for browsing item details.

## Current Code Observations
- Physical status labels still render “At Depot” in the badges and filters (`components/inventory/DualStatusBadges.tsx:41-44`, `app/portal/inventory/inventory-list.tsx:287-289`), so the requested “In Stock” terminology change has not shipped.
- Inventory detail pages fall back to a generic toast on any Supabase failure, returning “Failed to fetch inventory item” instead of a domain-specific error (`app/portal/inventory/[id]/page.tsx:42-115`).
- Delete flows share the same generic handler, reinforcing the need for explicit domain guard clauses (`app/portal/inventory/[id]/page.tsx:72-85`).

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

## Testing Strategy
- Unit tests for label translation logic ensuring `StockStatus` renders `In Stock`.
- Integration tests hitting `/portal/inventory/:id` with valid and invalid IDs to verify graceful handling.
- Add regression test ensuring inventory items linked to orders still render after order workflow changes.

## Open Questions
- Does “In Stock” need localization support for other languages?
- Are there inventory records missing mandatory relationships (e.g., purchase order link) causing the current crash?
