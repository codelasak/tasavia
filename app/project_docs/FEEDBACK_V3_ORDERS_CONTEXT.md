# Feedback v3 — Orders & Authorization Context Plan (DDD)

## Context Overview
The Orders bounded context orchestrates Purchase Orders, Sales/Invoice Orders, and Repair Orders, ensuring traceability from inventory sourcing through billing and documentation. Feedback reveals gaps in numbering policies, data propagation, and authorization flows that must be addressed within the domain model.

## Bounded Context & Ubiquitous Language
- **Orders Context**: aggregates `Order` with subtypes `PurchaseOrder`, `InvoiceOrder`, `RepairOrder`.
- Key language: *Obtained From*, *Order Number*, *Customer Purchase Order Number*, *Reference Number*, *Contact Number*, *End Use Country*, *RO Authorization*.
- Integrations: Inventory context (line items), Company context (customer/external company data).

## Aggregates & Value Objects
- **Order Aggregate Root**: maintains order metadata, numbering, line items, and links to companies.
- **OrderNumber Value Object**: enforces numbering policy and uniqueness per order type starting at `25300`.
- **OrderLine Item**: references inventory items with quantity validation.
- **ReferenceNumber Value Object**: composed from external company code + source purchase order identifier.

## Domain Rules to Implement
1. **Unified Numbering Policy**
   - Introduce `OrderNumberPolicyService` seeded at `25300` with atomic increments per order type.
   - Update aggregate creation invariants to require a generated number before persistence.
2. **Obtained From Auto-resolution**
   - When creating orders, hydrate purchasing company (`Obtained From`) from selected purchase order or customer relation.
3. **Invoice Order Workflow Corrections**
   - Enforce customer selection as first step; derive `End Use Country` and `Contact Number` from customer aggregate.
   - Pull eligible inventory lines tied to the selected purchase order; populate order lines automatically.
   - Require `Customer Purchase Order Number` (mark as mandatory field) before order confirmation.
   - Compose `ReferenceNumber` via domain service combining external company code & purchase order reference.
4. **Quantity & Location Validation**
   - Allow `location` to be optional/ignored when not part of the domain; ensure UI does not send invalid values.
   - Refine quantity validation to handle numeric parsing and inventory availability checks, returning domain errors instead of generic failures.
5. **Repair Order Authorization (RO)**
   - Audit authorization policies (roles/permissions) for `RepairOrder` commands; adjust guards to align with business rules.
   - Log and expose meaningful authorization errors for troubleshooting.
6. **Error Propagation & Consistency**
   - Prevent partial persistence when domain validation fails (currently leading to ghost invoice entries and PDF errors).
   - Emit domain events (`OrderCreated`, `OrderCreationFailed`) for downstream consumers (PDF generation, invoicing).

## Application Services & Processes
- Update `CreateInvoiceOrderCommandHandler` to orchestrate new workflow steps and validations.
- Implement `GenerateOrderNumberDomainService` with transactional locking (DB sequence or distributed lock).
- Add `ResolveObtainedFromService` bridging company and order contexts.
- Extend authorization middleware to handle Repair Order privileges and audit results.

## Integration & Infrastructure Concerns
- Database migration to store unified numbering sequences and reference numbers.
- Update API schemas to include required fields (customer purchase order number, reference number components).
- Ensure inventory reservation logic respects new purchase-order-linked sourcing.

## Testing Strategy
- Unit tests for numbering policy, reference number composition, and workflow validation rules.
- Integration tests simulating invoice order creation from UI through domain layer, including failure scenarios.
- Authorization tests verifying Repair Order access for relevant roles.
- Regression tests to confirm PDFs are not generated when order creation fails.

## Open Questions
- Confirm whether existing orders need renumbering or only new orders adopt the `25300` baseline.
- Define fallback behavior when inventory lines cannot be auto-populated (e.g., missing purchase order link).
- Determine required audit reporting for authorization denials.
