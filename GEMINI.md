# TASAVIA Dashboard Gemini Context

This document provides a comprehensive overview of the TASAVIA Dashboard project for the Gemini AI assistant.

## Project Overview

The TASAVIA Dashboard is a full-stack web application built with Next.js and Supabase. It serves two primary purposes:

1.  **Public-Facing Website:** A modern, professional website to showcase the company's services and provide contact information.
2.  **Internal Portal:** A secure, authenticated portal for managing internal business operations, including inventory, purchase orders, and company data.

The application is well-structured, using modern web development practices and a robust set of libraries.

## Tech Stack

*   **Framework:** Next.js 13.5.1
*   **Language:** TypeScript
*   **Backend:** Supabase (PostgreSQL, Auth, Realtime)
*   **UI:**
    *   React 18.2.0
    *   Radix UI for accessible components
    *   Tailwind CSS for styling
    *   `class-variance-authority` (CVA) for component variants
*   **State Management:** React Query (`@tanstack/react-query`)
*   **Forms:** React Hook Form with Zod for validation
*   **Testing:**
    *   Jest for unit tests
    *   Playwright for end-to-end tests

## Building and Running

The following commands are used to build, run, and test the project:

*   **Development:** `npm run dev`
*   **Production Build:** `npm run build`
*   **Start Production Server:** `npm run start`
*   **Linting:** `npm run lint`
*   **Unit Tests:** `npm run test`
*   **End-to-End Tests:** `npx playwright test`

## Development Conventions

*   **Authentication:** Handled via middleware (`middleware.ts`) and Supabase Auth. All routes under `/portal` are protected.
*   **UI Components:** Built with Radix UI and styled with Tailwind CSS. The `class-variance-authority` library is used to create consistent and reusable component variants.
*   **Styling:** The project uses Tailwind CSS for all styling.
*   **State Management:** Server state is managed with React Query, which is a best practice for fetching, caching, and updating data from the backend.
*   **Forms:** Forms are built with React Hook Form and validated with Zod, which provides a robust and type-safe way to handle user input.
*   **Image Optimization:** Next.js image optimization is disabled (`unoptimized: true` in `next.config.js`).
*   **Linting:** ESLint is used for code quality, but it is configured to be ignored during builds.

## Project Structure

*   `app/`: The main application directory, following the Next.js App Router structure.
    *   `app/api/`: API routes for server-side logic.
    *   `app/portal/`: All routes for the internal portal.
*   `components/`: Reusable React components.
    *   `components/ui/`: Base UI components built with Radix UI and Tailwind CSS.
*   `hooks/`: Custom React hooks.
*   `lib/`: Utility functions, Supabase client, and other shared logic.
*   `supabase/`: Supabase-related files.
    *   `supabase/migrations/`: Database migration files.
*   `e2e/`: Playwright end-to-end tests.
*   `__tests__/`: Jest unit tests.

## Database

The database is managed by Supabase and uses PostgreSQL. The schema is managed through migration files located in the `supabase/migrations` directory. Key tables include:

*   `companies`
*   `inventory`
*   `purchase_orders`
*   `purchase_order_items`
*   `part_numbers`

The migrations show a history of changes to the database, including the addition of new tables, columns, and constraints.

## Continuous Integration

The project uses GitHub Actions for Continuous Integration (CI). The CI pipeline is defined in `.github/workflows/ci.yml` and consists of two main jobs:

1.  **`lint_and_unit`:** This job lints the code, runs unit tests, and creates a production build of the application.
2.  **`e2e`:** This job runs the Playwright end-to-end tests to ensure that critical user flows are working correctly.

The CI pipeline is triggered on every push and pull request to the repository.
