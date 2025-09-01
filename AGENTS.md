# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router (public site). Includes `login/`, `portal/`, and API routes under `app/api/`.
- `components/`: Reusable UI and features (e.g., `ui/`, `inventory/`, `purchase-orders/`, `pdf/`).
- `lib/`: Utilities, types, helpers. `hooks/`: Custom React hooks.
- `__tests__/`: Jest/RTL unit tests. `e2e/`: Playwright tests.
- `public/`: Static assets. `supabase/`: DB migrations/config.
- Path alias: import local code via `@/…` (see `tsconfig.json`).

## Build, Test, and Development Commands
- `npm run dev`: Start local server at `http://localhost:3000`.
- `npm run build`: Production build with Next.js.
- `npm run start`: Serve the built app.
- `npm run lint`: ESLint checks (`next/core-web-vitals`).
- `npm test`: Run Jest unit tests.
- `npx playwright test`: Run Playwright E2E tests.

## Coding Style & Naming Conventions
- Language: TypeScript (strict), ES modules, 2-space indentation.
- Components: PascalCase files (e.g., `ErrorBoundary.tsx`). Hooks in `hooks/` use camelCase.
- Routes/folders: kebab-case (e.g., `app/forgot-password`).
- Prefer functional, typed React components. Keep imports path-aliased with `@/`.

## Testing Guidelines
- Frameworks: Jest + React Testing Library; Playwright for E2E.
- Locations: unit tests in `__tests__/` named `*.test.ts(x)`; E2E in `e2e/`.
- Coverage: global 85% minimum; higher thresholds for key files (see `jest.config.js`).
- Mock browser APIs where needed (see `jest.setup.js`).

## Commit & Pull Request Guidelines
- Commits: imperative, concise, scoped (e.g., "Fix …", "Refactor …", "Enhance …").
- PRs: clear description, linked issue (if any), screenshots for UI changes, and notes on tests/coverage.
- CI expectations: lint passes, unit tests green with coverage thresholds, and critical E2E paths pass locally.

## Security & Configuration
- Secrets: never commit `.env`; copy from `.env.example` to `.env.local`.
- self hosted Supabase: set URLs/keys for local dev and CI before running.
- Review middleware and `app/api` routes for auth and data access patterns.

## Architecture Notes
- UI: Radix + Tailwind; state via React and TanStack Query where appropriate.
- PDFs/reports: under `components/pdf/`; keep layouts reusable and typed.

