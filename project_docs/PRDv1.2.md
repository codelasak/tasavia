# Product Requirements Document: TASAVIA Internal Dashboard

**Version: 1.2**  
**Date: July 2, 2025**  
**Prepared For:** TASAVIA

## Revision History

- **v1.2 (July 2, 2025)**: Updated requirements based on current implementation state. Added comprehensive authentication system, admin panel, user management, password reset functionality, profile management, and enhanced security features. Updated technical stack and database schema based on actual implementation.
- **v1.1 (June 13, 2025)**: Finalized requirements based on the sample PO PDF. Added Ship To/Consignee address block, detailed cost fields, and line item numbers.
- **v1.0 (June 1, 2025)**: Initial draft.

## 1. Introduction

### 1.1. Purpose

This document outlines the product requirements for the TASAVIA Internal Dashboard, a comprehensive business operations management platform. The dashboard centralizes and streamlines key operational processes, including inventory management, purchase order processing, company data management, part number referencing, user management, and administrative functions.

### 1.2. Project Overview

The project delivers a modern, integrated web platform built using Next.js for the frontend and Supabase for the backend. It serves two primary functions:

1. **Public Website**: A redesigned tasavia.com serving as a professional marketing and information hub
2. **Internal Portal**: A secure, feature-rich dashboard at /portal for authorized personnel

## 2. Target Users

### 2.1. Primary Users
- **Super Administrators**: Full system access and user management
- **Administrators**: User management and system configuration
- **Inventory Managers**: Inventory tracking and management
- **Purchasing Department Staff**: Purchase order creation and management
- **Logistics/Shipping Coordinators**: Shipping and fulfillment management
- **Standard Users**: Basic operational access

### 2.2. Authentication Methods
- Email/Password authentication
- Phone/OTP authentication via Twilio
- Admin-controlled user creation (no public registration)

## 3. Enhanced User Stories

### 3.1. Authentication & User Management
- **US101**: As a Super Administrator, I want to create and manage admin accounts so that I can delegate user management responsibilities.
- **US102**: As an Administrator, I want to create, edit, and delete user accounts so that I can manage system access.
- **US103**: As an Administrator, I want to reset user passwords so that I can help users regain access.
- **US104**: As a User, I want to reset my own password via email so that I can regain access independently.
- **US105**: As a User, I want to manage my profile information so that my account details are current.
- **US106**: As a User, I want to authenticate using either email or phone number so that I have flexible login options.

### 3.2. Core Business Operations
- **US201**: As a Company Administrator, I want to manage "My Companies" profiles for accurate document generation.
- **US202**: As a Company Administrator, I want to manage external company profiles for transaction processing.
- **US203**: As a User, I want to search and filter the master Part Numbers list for efficient part lookup.
- **US204**: As an Inventory Manager, I want to track inventory levels and item details for stock management.
- **US205**: As Purchasing Staff, I want to create and manage Purchase Orders for procurement operations.
- **US206**: As Purchasing Staff, I want to generate PDF Purchase Orders for vendor communication.
- **US207**: As a Logistics Coordinator, I want to manage shipping companies for fulfillment operations.

## 4. Enhanced Features

### 4.1. Authentication & Security System
- **F101**: Multi-factor authentication with email/password and phone/OTP options
- **F102**: Role-based access control (RBAC) with three tiers: User, Admin, Super Admin
- **F103**: Secure password reset workflow with email verification
- **F104**: Admin-controlled user creation and management
- **F105**: Session management with automatic logout
- **F106**: Row Level Security (RLS) policies for data protection

### 4.2. User Management & Administration
- **F201**: Comprehensive admin panel for user management
- **F202**: User creation form with role assignment
- **F203**: Password reset functionality for administrators
- **F204**: User profile management with picture upload
- **F205**: User search and filtering capabilities
- **F206**: Account status management (Active, Inactive, Suspended)

### 4.3. Core Business Features
- **F301**: My Companies CRUD operations with address management
- **F302**: External Companies management with contact details
- **F303**: Part Numbers master catalog with search capabilities
- **F304**: Inventory management with location and condition tracking
- **F305**: Purchase Order creation with line items and cost calculations
- **F306**: PDF generation for Purchase Orders
- **F307**: Ship Via companies management

### 4.4. Enhanced UI/UX Features
- **F401**: Responsive design for desktop, tablet, and mobile
- **F402**: Modern component library (ShadCN/UI)
- **F403**: Real-time notifications and error handling
- **F404**: Advanced search and filtering across all modules
- **F405**: Dashboard with key metrics and quick actions
- **F406**: Color-coded role badges and status indicators

## 5. Enhanced Data Model

### 5.1. Authentication & User Management Tables

#### accounts
- `id` (UUID, PK) - Links to auth.users
- `email` (TEXT, UNIQUE)
- `phone` (TEXT, UNIQUE)
- `full_name` (TEXT)
- `profile_picture_url` (TEXT)
- `login_method` (TEXT) - 'email' or 'phone'
- `account_status` (TEXT) - 'active', 'inactive', 'suspended'
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### user_roles
- `id` (UUID, PK)
- `user_id` (UUID, FK to accounts.id)
- `role_id` (UUID, FK to roles.id)
- `assigned_at` (TIMESTAMP)
- `assigned_by` (UUID, FK to accounts.id)

#### roles
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE) - 'user', 'admin', 'super_admin'
- `description` (TEXT)
- `permissions` (JSONB)

### 5.2. Business Operations Tables

#### my_companies
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `code` (TEXT, UNIQUE)
- `tax_id` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### companies
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `code` (TEXT, UNIQUE)
- `tax_id` (TEXT)
- `company_type` (TEXT) - 'vendor', 'customer', 'both'
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### company_addresses
- `id` (UUID, PK)
- `company_id` (UUID, FK)
- `company_type` (TEXT) - 'my_company' or 'company'
- `address_type` (TEXT) - 'billing', 'shipping', 'main'
- `address_line_1` (TEXT)
- `address_line_2` (TEXT)
- `city` (TEXT)
- `state` (TEXT)
- `postal_code` (TEXT)
- `country` (TEXT)
- `is_primary` (BOOLEAN, DEFAULT false)

#### company_contacts
- `id` (UUID, PK)
- `company_id` (UUID, FK)
- `company_type` (TEXT) - 'my_company' or 'company'
- `contact_type` (TEXT) - 'primary', 'billing', 'technical'
- `first_name` (TEXT)
- `last_name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `title` (TEXT)
- `is_primary` (BOOLEAN, DEFAULT false)

#### pn_master_table
- `id` (UUID, PK)
- `pn` (TEXT, UNIQUE, NOT NULL)
- `description` (TEXT)
- `remarks` (TEXT)
- `category` (TEXT)
- `manufacturer` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### inventory
- `id` (UUID, PK)
- `pn_id` (UUID, FK to pn_master_table.id)
- `serial_number` (TEXT)
- `condition` (TEXT) - 'AR', 'OH', 'SV', 'RP'
- `location` (TEXT)
- `quantity` (INTEGER, DEFAULT 1)
- `unit_cost` (DECIMAL(10,2))
- `total_value` (DECIMAL(12,2))
- `received_date` (DATE)
- `notes` (TEXT)

#### purchase_orders
- `id` (UUID, PK)
- `po_number` (TEXT, UNIQUE, NOT NULL) - Format: P<YY><sequence>
- `my_company_id` (UUID, FK to my_companies.id)
- `vendor_company_id` (UUID, FK to companies.id)
- `po_date` (DATE, NOT NULL)
- `ship_to_company_name` (TEXT)
- `ship_to_address_details` (TEXT)
- `ship_to_contact_name` (TEXT)
- `ship_to_contact_phone` (TEXT)
- `ship_to_contact_email` (TEXT)
- `prepared_by_name` (TEXT)
- `currency` (TEXT, DEFAULT 'USD')
- `ship_via_id` (UUID, FK to my_ship_via.id)
- `payment_term` (TEXT)
- `remarks` (TEXT)
- `freight_charge` (DECIMAL(10,2), DEFAULT 0.00)
- `misc_charge` (DECIMAL(10,2), DEFAULT 0.00)
- `vat_percentage` (DECIMAL(5,2), DEFAULT 0.00)
- `subtotal` (DECIMAL(12,2))
- `vat_amount` (DECIMAL(12,2))
- `total_amount` (DECIMAL(12,2))
- `status` (TEXT, DEFAULT 'Draft')
- `created_by` (UUID, FK to accounts.id)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### po_items
- `id` (UUID, PK)
- `po_id` (UUID, FK to purchase_orders.id)
- `line_number` (INTEGER, NOT NULL)
- `pn_id` (UUID, FK to pn_master_table.id)
- `description` (TEXT)
- `serial_number` (TEXT)
- `quantity` (INTEGER, NOT NULL, DEFAULT 1)
- `unit_price` (DECIMAL(10,2), NOT NULL)
- `condition` (TEXT)
- `line_total` (DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED)

#### my_ship_via
- `id` (UUID, PK)
- `ship_company_name` (TEXT, NOT NULL)
- `owner` (TEXT)
- `account_no` (TEXT, NOT NULL)
- `ship_model` (TEXT)
- `contact_email` (TEXT)
- `contact_phone` (TEXT)
- `tracking_url_template` (TEXT)

## 6. Enhanced Technical Stack

### 6.1. Frontend
- **Framework**: Next.js 14.x with App Router
- **Language**: TypeScript
- **UI Library**: ShadCN/UI components
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **Notifications**: Sonner toast library
- **State Management**: React Hooks and Context API

### 6.2. Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **File Storage**: Supabase Storage
- **SMS/OTP**: Twilio Verify API
- **PDF Generation**: React-PDF or similar

### 6.3. Testing & Quality
- **Unit Testing**: Jest with React Testing Library
- **E2E Testing**: Playwright
- **Type Checking**: TypeScript
- **Linting**: ESLint
- **Code Formatting**: Prettier

### 6.4. Deployment & Infrastructure
- **Hosting**: Vercel or AWS Amplify
- **CI/CD**: GitHub Actions
- **Monitoring**: Built-in error boundaries and logging
- **Environment**: Environment-based configuration

## 7. Security Requirements

### 7.1. Authentication Security
- Multi-factor authentication support
- Secure session management
- Password strength requirements
- Account lockout policies
- Secure password reset workflow

### 7.2. Authorization Security
- Role-based access control (RBAC)
- Row Level Security (RLS) policies
- API endpoint protection
- Admin verification for sensitive operations
- Audit logging for administrative actions

### 7.3. Data Security
- Input validation and sanitization
- SQL injection protection
- XSS prevention
- CSRF protection
- Secure file upload handling

## 8. Performance Requirements

### 8.1. Response Times
- Page load times < 3 seconds
- API response times < 500ms
- Search results < 1 second
- PDF generation < 5 seconds

### 8.2. Scalability
- Support for 100+ concurrent users
- Database optimization for large datasets
- Efficient pagination and filtering
- Caching strategies for frequently accessed data

## 9. Usability Requirements

### 9.1. User Experience
- Intuitive navigation with consistent UI patterns
- Responsive design for multiple device types
- Accessible design following WCAG guidelines
- Clear error messages and user feedback
- Progressive disclosure of complex features

### 9.2. Administrative Experience
- Streamlined user management workflows
- Bulk operations for administrative tasks
- Comprehensive audit trails
- System health monitoring dashboard
- Automated backup and recovery procedures

## 10. Integration Requirements

### 10.1. External Integrations
- Twilio for SMS/OTP services
- Email service provider for notifications
- File storage for document management
- Potential ERP system integration

### 10.2. Internal Integrations
- Single sign-on (SSO) capabilities
- API endpoints for mobile applications
- Export capabilities for reporting
- Webhook support for real-time notifications

## 11. Maintenance & Support Requirements

### 11.1. System Maintenance
- Regular security updates and patches
- Database maintenance and optimization
- Performance monitoring and tuning
- Backup and disaster recovery procedures

### 11.2. User Support
- User documentation and training materials
- Administrative guides and procedures
- Technical support procedures
- Change management processes

## 12. Future Enhancements

### 12.1. Planned Features
- Mobile application development
- Advanced reporting and analytics
- Workflow automation capabilities
- Integration with external systems
- Multi-language support

### 12.2. Scalability Considerations
- Microservices architecture migration
- Advanced caching strategies
- Load balancing implementation
- Global content delivery network (CDN)

---

**Document Prepared By**: Development Team  
**Review Status**: Final  
**Next Review Date**: September 2, 2025