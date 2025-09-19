# Feedback v3 — Documents & PDF Context Plan (DDD)

## Context Overview
The Documents bounded context produces authoritative PDFs for purchase, sales/invoice, and repair orders. Feedback identifies the need to update layouts, remove redundant copy, add signatures, and adopt consistent naming aligned with order metadata.

## Bounded Context & Ubiquitous Language
- **Documents Context**: generates order PDFs via templates and integrates with Orders domain events.
- Shared terms: *Header/Footer Copy*, *Signature Block*, *Order Type*, *Document Naming Policy*.

## Aggregates & Services
- **DocumentTemplate Aggregate**: encapsulates header, body, footer sections per order type.
- **DocumentGenerationService**: consumes `OrderCreated` events, fetches domain data, and outputs PDFs.
- **DocumentNamingPolicy Value Object**: maps order type + number to exported file names.

## Domain Rules to Implement
1. **Template Optimization**
   - Remove obsolete header/footer text across all order templates; ensure shared components reflect revised design.
   - Introduce configurable signature block with required signatory fields.
2. **Naming Strategy**
   - Implement `DocumentNamingPolicy` such that:
     - Purchase Orders → `Purchase Order <number>`
     - Sales/Invoice Orders → `Invoice Order <number>`
     - Repair Orders → `Repair Order <number>`
   - Ensure numbering uses updated `OrderNumber` from Orders context.
3. **Resilience to Order Errors**
   - Guard against PDF generation triggering when order creation fails validation (currently causing cascading errors).
   - Add domain event filters or transactional outbox entries to ensure only committed orders produce documents.

## Application Services & Processes
- Update PDF rendering pipeline (`generateOrderDocument` use case) to consume new templates and naming policy.
- Add signature asset management (e.g., storing authorized signature image/metadata) with versioning.
- Provide admin configuration interface for future template adjustments if needed.

## Infrastructure & Testing
- Snapshot/regression tests for each order-type PDF verifying layout and naming conventions.
- Observability: log document generation requests/responses, capture failures with correlation IDs.
- Ensure storage bucket/file system retains backward-compatible paths after renaming policy change.

## Open Questions
- Who owns the signature image and how should updates be governed?
- Do legacy PDFs require retroactive renaming or only new documents?
- Are there localization requirements for document labels after header/footer removal?
