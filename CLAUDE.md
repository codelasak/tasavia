# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start Next.js development server on http://localhost:3000
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Testing
- `npm run test` - Run Jest unit tests
- `npx playwright test` - Run E2E tests (requires dev server to be running)
- `npx playwright test --ui` - Run Playwright tests with UI mode
- `npm run test -- --watch` - Run Jest tests in watch mode
- `npm run test -- --coverage` - Run tests with coverage report



### Single Test Execution
- `npm run test -- --testNamePattern="specific test name"` - Run specific Jest test
- `npx playwright test auth-flow.spec.ts` - Run specific E2E test file
- `npm run test -- app/portal/purchase-orders/__tests__/` - Run tests in specific directory

## Application Architecture

### High-Level Structure
This is a **dual-purpose Next.js 13+ application** using the App Router:
- **Public Website**: Marketing site at root route (`/`)
- **Internal Portal**: Authenticated dashboard at `/portal` for business operations

### Core Technology Stack
- **Framework**: Next.js 13.5.1 with App Router and Server Components
- **Database**: self hosted Supabase (PostgreSQL) with real-time features
- **Authentication**: self hosted Supabase Auth with phone-based OTP verification
- **UI**: Radix UI primitives + Tailwind CSS + shadcn/ui components
- **State Management**: React Hook Form + TanStack Query for server state
- **Validation**: Zod schemas for type-safe form validation
- **Testing**: Jest + React Testing Library + Playwright for E2E

### Application Layers

#### 1. Authentication & Authorization
- **Authentication Strategy**: Phone-based OTP using Supabase Auth + Twilio
- **Session Management**: Supabase sessions with automatic refresh
- **Route Protection**: All `/portal` routes require authentication
- **Authorization**: Role-based access control implemented via database policies

#### 2. Database Architecture
- **Primary Entities**: Companies, Purchase Orders, Sales Orders, Repair Orders, Inventory Items, Part Numbers
- **Company Relationships**: Dual company system - "My Companies" (internal) and "Companies" (external vendors/customers)
- **Order Workflows**: Complete lifecycle management from creation to completion with PDF generation
- **Inventory Integration**: Purchase/Sales order completion automatically creates inventory records

#### 3. Portal Module Structure
Each major business function is organized as a feature module:

**Purchase Orders** (`/portal/purchase-orders`):
- Create, edit, view, and generate PDF purchase orders
- Line item management with dynamic calculations
- Vendor selection and ship-to address handling
- Status workflow with completion modal that creates inventory items

**Sales Orders** (`/portal/sales-orders`):
- Complete sales order management with ATA 106 compliance
- PDF generation and packing slip creation
- Multi-currency support (USD, EUR, GBP, TL)
- Integration with inventory for stock tracking

**Company Management** (`/portal/companies`, `/portal/my-companies`):
- Internal company profiles with addresses and contacts
- External vendor/customer management
- Address management for shipping destinations

**Inventory Management** (`/portal/inventory`):
- Real-time inventory tracking
- Part number association
- Stock level monitoring
- Integration with order completion workflows

### Key Architectural Patterns

#### 1. Server/Client Component Separation
- **Server Components**: Data fetching, initial page rendering, SEO optimization
- **Client Components**: Interactive forms, real-time updates, state management
- **Hybrid Pattern**: Server components for data, client components for interactivity

#### 2. Form Architecture
- **Large Forms Pattern**: Complex multi-section forms (Purchase/Sales Orders)
- **Dynamic Arrays**: Line items management using React Hook Form `useFieldArray`
- **Real-time Calculations**: Automatic total calculations with form watching
- **Validation Strategy**: Client-side Zod validation + server-side database constraints

#### 3. PDF Generation System
- **Reusable Components**: Shared PDF layout components for consistent formatting
- **Document Types**: Purchase Orders, Sales Orders, Packing Slips, ATA 106 certificates
- **Company Branding**: Dynamic company information and logo integration

#### 4. Error Handling & User Feedback
- **Toast Notifications**: Success/error feedback using Sonner
- **Form Validation**: Real-time field validation with error display
- **Loading States**: Comprehensive loading indicators for async operations
- **Error Boundaries**: React Error Boundaries for graceful failure handling

### Database Schema Key Points
- **UUID Primary Keys**: All entities use UUID for security and scalability
- **Soft Deletes**: Important entities use status fields rather than hard deletes
- **Audit Trails**: Created/updated timestamps and user tracking
- **Relationships**: Proper foreign key constraints with CASCADE policies
- **Row Level Security**: Supabase RLS policies for data access control

### Performance Considerations
- **Image Optimization**: Next.js Image component with unoptimized setting for deployment flexibility
- **Bundle Optimization**: Webpack configuration for client-side compatibility
- **Real-time Updates**: Selective use of Supabase real-time features
- **Caching Strategy**: Server Component caching with `force-dynamic` where needed

### Security Implementation
- **Authentication**: Multi-factor authentication via phone OTP
- **Authorization**: Database-level Row Level Security policies
- **Input Validation**: Zod schemas prevent malformed data
- **XSS Prevention**: React's built-in sanitization + Content Security Policy
- **SQL Injection**: Prevented through Supabase client parameterized queries

### Mobile Responsiveness
- **Mobile-First Design**: Tailwind CSS with responsive breakpoints
- **Bottom Navigation**: Mobile-specific navigation for portal
- **Touch Optimized**: Form fields and buttons sized for mobile interaction
- **Adaptive Layouts**: Different layouts for desktop/mobile views

## Development Workflow Notes

### Component Development
- Follow existing component patterns in `/components` directory
- Use shadcn/ui components as base, extend with custom styling
- Implement proper TypeScript interfaces for all props
- Include proper loading and error states

### Form Development
- Use React Hook Form with Zod validation for all forms
- Implement proper field validation and error display
- Include optimistic UI updates where appropriate
- Add proper accessibility attributes (ARIA labels, etc.)

### Database Integration
- Use Supabase client consistently across the application
- Implement proper error handling for database operations
- Follow existing patterns for data fetching and mutations
- Use TypeScript database types from `lib/supabase/database.types.ts`

### Testing Strategy
- Write unit tests for utility functions and complex components
- Include integration tests for form submissions and data flows
- Use Playwright for critical user journey testing
- Mock Supabase client in tests using `__mocks__` directory

### Environment Configuration
Required environment variables for development:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- Additional Twilio configuration for SMS OTP functionality