# Repository Guidelines

This guide helps contributors work effectively in this Next.js + TypeScript codebase.

## Project Structure & Modules
- `app/`: Next.js App Router (public site, `login/`, `portal/`, API routes under `app/api`).
- `components/`: Reusable UI and feature modules (e.g., `ui/`, `inventory/`, `purchase-orders/`).
- `lib/`: Utilities, types, and helpers. `hooks/`: Custom React hooks.
- `__tests__/`: Unit tests with Jest/RTL. `e2e/`: Playwright tests.
- `public/`: Static assets. `supabase/`: Database migrations and config.
- Path alias: import with `@/` (see `tsconfig.json`).

## Build, Test, and Development
- `npm run dev`: Start local server at `http://localhost:3000`.
- `npm run build`: Production build with Next.js.
- `npm run start`: Serve the built app.
- `npm run lint`: ESLint checks using `next/core-web-vitals`.
- `npm test`: Run Jest unit tests. `npx playwright test`: Run E2E tests.

## Coding Style & Naming
- TypeScript, strict mode on. Use ES modules.
- Components: PascalCase files (e.g., `ErrorBoundary.tsx`). Hooks: camelCase in `hooks/`.
- Folders and routes: kebab-case (e.g., `app/forgot-password`).
- 2-space indentation; prefer functional, typed React components.
- Keep imports path-aliased with `@/` for local modules.

## Testing Guidelines
- Frameworks: Jest + React Testing Library; Playwright for E2E.
- Locations: unit tests in `__tests__/` named `*.test.ts(x)`; E2E in `e2e/`.
- Coverage: global 85% minimum; higher thresholds enforced for key files (see `jest.config.js`).
- Commands: `npm test` (unit), `npx playwright test` (E2E). Ensure tests cleanly mock browser APIs (see `jest.setup.js`).

## Commit & Pull Requests
- Commit messages: imperative, concise, and scoped (e.g., "Fix …", "Refactor …", "Enhance …").
- Include rationale and notable changes; group related edits.
- PRs must include: clear description, linked issue (if any), screenshots for UI changes, and notes on tests/coverage.
- CI expectations: lint passes, unit tests green with coverage thresholds, E2E critical paths pass locally.

## Security & Configuration
- Secrets: never commit `.env`; copy from `.env.example` and use `.env.local`.
- Supabase: ensure URLs/keys set in env before running locally and in CI.
- Review middleware and API routes in `app/` for auth and data access patterns.

## Architecture Notes
- UI built with Radix + Tailwind; state via React and TanStack Query where appropriate.
- PDFs and reports live under `components/pdf/`; keep layouts reusable and typed.
