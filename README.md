# TASAVIA Dashboard

A modern, integrated web platform for TASAVIA's internal operations management and public website.
Developer: Eshagh Shahnavazi - eshagh.me
## Overview

TASAVIA Dashboard is a Next.js application that serves dual purposes:
- **Public Website**: Professional marketing and information hub at the root route
- **Internal Portal**: Secure dashboard at `/portal` for managing business operations

## Features

### Public Website
- Modern landing page with company information
- Service offerings and capabilities showcase
- Contact information and professional presence

### Internal Portal
- **Company Management**: Manage internal and external company profiles
- **Inventory Management**: Track stock levels, view items, and manage inventory
- **Purchase Orders**: Create, view, edit, and generate PDF purchase orders
- **Part Numbers**: Master list of part numbers with search functionality
- **Ship Via**: Manage shipping companies and logistics information
- **Dashboard**: Overview of key business metrics and quick access to features

## Tech Stack

- **Frontend**: Next.js 13.5.1, React 18.2.0, TypeScript
- **Backend**: Supabase (PostgreSQL database, authentication, real-time features)
- **UI Components**: Radix UI primitives with custom styling
- **Styling**: Tailwind CSS with custom animations
- **Forms**: React Hook Form with Zod validation
- **PDF Generation**: React-PDF
- **Testing**: Jest, React Testing Library, Playwright for E2E

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tasavia
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run database migrations:
```bash
# Apply migrations in the supabase/migrations folder
supabase db push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest unit tests
- `npx playwright test` - Run E2E tests

## Project Structure

```
├── app/                    # Next.js 13 app directory
│   ├── page.tsx           # Public landing page
│   ├── login/             # Authentication pages
│   └── portal/            # Internal dashboard routes
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (Radix UI)
│   ├── auth/             # Authentication components
│   └── [feature]/        # Feature-specific components
├── lib/                  # Utility functions and configurations
├── hooks/                # Custom React hooks
├── supabase/             # Database migrations
├── e2e/                  # Playwright E2E tests
└── project_docs/         # Project documentation
```

## Authentication

The application uses Supabase Auth for secure user authentication. Users must log in to access the internal portal at `/portal`.

## Database Schema

The application uses PostgreSQL via Supabase with tables for:
- Companies (internal and external)
- Inventory items
- Purchase orders and line items
- Part numbers
- Shipping companies
- User profiles

See `project_docs/db_schema.md` for detailed schema information.

## Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npx playwright test
```

E2E tests cover critical user flows including authentication, navigation, CRUD operations, and PDF generation.

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting changes

## License

Private project for TASAVIA internal use.