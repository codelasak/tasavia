# Feedback v3 — Company & Identity Context Plan (DDD)

## Context Overview
Tasavia's Company Management bounded context handles lifecycle for internal and external companies as well as user-facing profile data. Recent feedback highlights missing domain rules when creating companies and presenting profile identity information.

## Bounded Context & Ubiquitous Language
- **Company Management Context**: governs `Company`, `ExternalCompany`, `Address`, and related UI flows.
- **Identity Context** (integration): authoritative source for `Profile` display names surfaced in the portal.
- Shared terms: *External Company Code*, *Address State*, *Profile Display Name*, *Company Creation Wizard*.

## Current Code Observations
- `components/companies/CompanyDialog.tsx:215` generates “unique” external company codes in the browser via random prefixes and Supabase lookups, providing no idempotent server-side guarantee if the request retries or concurrent users collide.
- `components/companies/CompanyDialog.tsx:1416` renders address forms without a `state` input, and downstream projections default the value to `null` (see `app/portal/sales-orders/[id]/packing-slip/page.tsx:62`), confirming the column/backfill requested in feedback is still missing.
- `components/profile/ProfileForm.tsx:50` simply echoes the `accounts.name` field fetched via REST; there is no normalization to the canonical “First Last” format (e.g., “Salih İnci”) nor any subscription to upstream identity changes.

## Aggregates & Entities
- **Company Aggregate**: encapsulates legal name, contact info, address, and relationships to orders.
- **ExternalCompany** variant: requires generated external code and reference to originating purchase orders.
- **Address Value Object**: must include `state` and enforce validation per country.
- **Profile Projection**: read model consumed by portal; must align with upstream identity attributes.

## Domain Rules to Implement
1. **External Company Code Generation**
   - Ensure `ExternalCompanyCodeService` generates unique, idempotent codes at creation.
   - Persist generated codes within aggregate and expose via read models.
   - Add compensating actions for failures during company creation transactions.
2. **Address State Requirement**
   - Extend `Address` VO with `state` attribute, validations, and localization rules.
   - Backfill persisted data with state information; provide migration script and admin tooling for missing states.
3. **Company Creation UI Alignment**
   - Harmonize *New Company* and *New External Company* flows with shared form components in `@/components/ui/forms`.
   - Enforce domain validation at the application layer, surfacing consistent error handling.
4. **Profile Display Name Consistency**
   - Sync profile read model to ensure canonical format `"Salih İnci"` (First Last) from Identity context.
   - Introduce domain event subscription (`ProfileUpdated`) to refresh cached profile details in portal.

## Application Services & Interfaces
- Update `CreateExternalCompanyCommandHandler` to orchestrate code generation and rollback on failure.
- Introduce `UpdateCompanyAddressService` with state validation and downstream synchronization (orders, invoices).
- Implement `SyncProfileProjectionJob` to pull identity data and invalidate stale cache entries.
- Add UI composition root that maps domain errors to form-level messages.

## Infrastructure & Integration Impacts
- Database migration adding `state` column to company addresses; ensure non-null constraint after backfill.
- Message bus subscription for identity changes (Kafka/SQS topic TBD).
- Audit logging for company creation success/failure with generated codes.

## Testing Strategy
- Unit tests for `ExternalCompanyCodeService` uniqueness, retry behavior, and failure paths.
- Integration tests covering company creation workflows (internal/external) via application services and HTTP handlers.
- Contract tests between portal UI and company APIs to validate new payload shape (`state`, profile name fields).

## Open Questions
- Do legacy external companies require retroactive code generation? Define migration scope.
- What is the authoritative list of states per country? Confirm with domain experts.
- Should profile display names be editable locally, or strictly sourced from Identity context?
