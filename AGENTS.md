# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router (public site) with `login/`, `portal/`, and API routes under `app/api/`.
- `components/`: Reusable UI and features (e.g., `ui/`, `inventory/`, `purchase-orders/`, `pdf/`).
- `lib/`: Utilities, types, helpers. `hooks/`: Custom React hooks.
- `__tests__/`: Jest/RTL unit tests. `e2e/`: Playwright tests.
- `public/`: Static assets. `supabase/`: DB migrations/config.
- Path alias: import via `@/...` (see `tsconfig.json`). Example: `import Button from '@/components/ui/Button'`.

## Build, Test, and Development Commands
- `npm run dev`: Start local server at `http://localhost:3000`.
- `npm run build`: Create production build.
- `npm run start`: Serve the built app.
- `npm run lint`: Run ESLint (`next/core-web-vitals`).
- `npm test`: Run Jest unit tests.
- `npx playwright test`: Run Playwright E2E tests.

## Coding Style & Naming Conventions
- TypeScript (strict), ES modules, 2-space indentation.
- Components use PascalCase (e.g., `ErrorBoundary.tsx`); hooks use camelCase; routes/folders use kebab-case (e.g., `app/forgot-password`).
- Prefer functional, typed React components; keep imports path-aliased with `@/`.

## Testing Guidelines
- Frameworks: Jest + React Testing Library; Playwright for E2E.
- File naming: `__tests__/**/*.test.ts(x)` and `e2e/**`.
- Coverage: global 85% minimum; higher thresholds for key files (see `jest.config.js`).
- Mock browser APIs in `jest.setup.js` when needed.

## Commit & Pull Request Guidelines
- Commits: imperative, concise, scoped (e.g., "Fix auth redirect", "Refactor inventory table", "Enhance PDF layout").
- PRs: include a clear description, linked issue (if any), screenshots for UI changes, and notes on tests/coverage.
- CI expectations: lint clean, unit tests green with coverage thresholds, critical E2E paths pass locally.

## Security & Configuration
- Never commit `.env`; copy from `.env.example` to `.env.local`.
- Self-hosted Supabase: set URLs/keys for local dev and CI.
- Review middleware and `app/api` routes for auth and data access.

## Architecture Notes
- UI: Radix + Tailwind; state via React and TanStack Query where appropriate.
- PDFs/reports: under `components/pdf/`; keep layouts reusable and typed.
