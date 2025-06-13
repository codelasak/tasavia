# TASAVIA Internal Dashboard – Project Progress Tracker

## 1. Project Setup & Foundation
- [x] Review and clean up the Makerkit starter code (remove marketing/demo pages if not needed)
- [x] Set up environment variables for local development (`.env.local`)
- [x] Ensure Supabase local instance is running and accessible
- [x] Review and update Supabase schema to match TASAVIA requirements

## 2. Authentication & Authorization
- [x] Test Supabase authentication flow (sign up, sign in, password reset)
- [x] Set up user roles (Admin, Purchasing, Inventory, etc.) in Supabase (V1.1: RBAC)
- [x] Protect dashboard routes (require login)

## 3. Core Modules Implementation

### 3.1 My Companies Management
- [x]] Create CRUD API for "My Companies"
- [x]] Build UI: List, Create, Edit, Delete "My Companies"
- [x] Add search/filter to "My Companies" list

### 3.2 External Companies (Vendors/Customers)
- [x] Create CRUD API for external companies
- [x] Build UI: List, Create, Edit, Delete external companies
- [x] Add search/filter to external companies list

### 3.3 Part Number (PN) Master Table
- [x] Create CRUD API for PN Master Table
- [x] Build UI: List, Create, Edit, Delete PNs
- [x] Add search/filter to PN list
- [ ] Implement Excel import for PN Master List
- [ ] Provide template/instructions for Excel import

### 3.4 Inventory Management
- [x] Create API to fetch inventory list (join PN, PO, etc.)
- [x] Build UI: Inventory list view
- [x] Add search/filter to inventory list

### 3.5 Purchase Order (PO) Management
- [ ] Create API for PO CRUD (header + line items)
- [ ] Build UI: Create PO (form with line items, select companies, etc.)
- [ ] Build UI: PO list view
- [ ] Build UI: PO detail view
- [ ] Implement PDF generation for PO
- [ ] Add search/filter to PO list

### 3.6 My Ship Via Management
- [ ] Create CRUD API for "My Ship Via" companies
- [ ] Build UI: List, Create, Edit, Delete "My Ship Via"
- [ ] Add search/filter to "My Ship Via" list

## 4. Usability & Non-Functional
- [ ] Add pagination to all list views
- [ ] Ensure responsive design (desktop/tablet)
- [ ] Add error handling and user feedback (toasts, alerts)
- [ ] Test and optimize performance (loading states, queries)

## 5. Testing & QA
- [ ] Write unit tests for core logic
- [ ] Write e2e tests for main flows (sign in, CRUD, PO creation)
- [ ] Manual QA: Try all user stories

## 6. Documentation & Handover
- [ ] Update README with dashboard-specific info
- [ ] Document API endpoints and data model
- [ ] Add user guide for internal users
