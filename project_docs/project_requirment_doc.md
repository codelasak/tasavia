Product Requirements Document: TASAVIA Internal Dashboard
Version: 1.0
Date: June 1, 2025
Prepared For: TASAVIA
Prepared By: Eshagh

1. Introduction
1.1. Purpose
This document outlines the product requirements for the TASAVIA Internal Dashboard. The dashboard aims to centralize and streamline key operational processes, including inventory management, purchase order processing, company data management, and part number referencing.

1.2. Project Overview
The TASAVIA Internal Dashboard will be a web-based application developed using Next.js for the frontend and Supabase for the backend and database. It will provide authorized TASAVIA personnel with tools to manage and track critical business information efficiently.

1.3. Problem Statement
Currently, TASAVIA may be relying on manual processes, spreadsheets, or disparate systems for managing inventory, purchase orders, and related company/part data. This can lead to inefficiencies, data inaccuracies, difficulties in tracking, and increased operational overhead. The TASAVIA Internal Dashboard will address these challenges by providing a unified, user-friendly platform.

1.4. Goals and Objectives
Streamline Operations: Simplify and accelerate the processes of inventory tracking, purchase order creation, and data management.

Centralize Data: Provide a single source of truth for information related to "My Companies," external companies (vendors/customers), part numbers (PN), inventory, and purchase orders.

Improve Accuracy: Reduce manual data entry errors and ensure data consistency across modules.

Enhance Visibility: Offer clear views and easy access to inventory levels, PO statuses, and company details.

Enable Efficiency: Allow for quick creation of Purchase Orders, including PDF printing for external communication.

Facilitate Data Management: Support importing data, such as PN lists from Excel.

2. Target Users
Inventory Managers: Responsible for tracking stock levels, managing inventory status, and ensuring parts availability.

Purchasing Department Staff: Responsible for creating and managing purchase orders, liaising with vendors.

Logistics/Shipping Coordinators: Responsible for managing shipping information and coordinating dispatches/receipts.

Company Administrators/Management: Responsible for overseeing operations, managing company data, and requiring access to consolidated reports or information.

3. User Stories
US001 (Company Admin): As a Company Administrator, I want to create, view, update, and delete profiles for "My Companies" (TASAVIA's entities), so that all internal company information is accurate and up-to-date for use in documents like POs.

US002 (Company Admin): As a Company Administrator, I want to create, view, update, and delete profiles for external companies (vendors, customers), so that I can easily select and manage their details for transactions.

US003 (All Users): As a user, I want to view a master list of Part Numbers (PNs) with their descriptions and remarks, so I can quickly find and reference part information.

US004 (Data Admin): As a Data Administrator, I want to import a PN Master List from an Excel file, so I can efficiently populate or update the system with existing part data.

US005 (Inventory Manager): As an Inventory Manager, I want to view the current inventory, including PN, description, serial number, PO price, PO number, remarks, and status, so I can monitor stock levels and item details.

US006 (Purchasing Staff): As a Purchasing Staff member, I want to create new Purchase Orders by selecting my company, the vendor, adding part numbers with quantities and prices, and specifying terms, so I can efficiently procure goods.

US007 (Purchasing Staff): As a Purchasing Staff member, I want to view a list of all Purchase Orders with their status, so I can track their progress.

US008 (Purchasing Staff): As a Purchasing Staff member, I want to generate a PDF version of a Purchase Order, so I can easily print it or send it to the vendor.

US009 (Logistics Coordinator): As a Logistics Coordinator, I want to manage a list of "My Ship Via" companies, including their account numbers and shipping models, so that this information is readily available for POs and shipments.

US010 (All Users): As a user, I want to search and filter lists (e.g., companies, PNs, inventory, POs), so I can find specific information quickly.

4. Proposed Features
4.1. Dashboard Overview (Future Enhancement - V1.1)
A landing page displaying key metrics, recent activities, or quick links to frequently used modules.

4.2. My Companies Management
F001: CRUD (Create, Read, Update, Delete) functionality for "My Companies."

F002: List view displaying all "My Companies" with key details (Name, Code, City, Country).

F003: Form for adding/editing "My Company" details as per the MY_COMPANIES table structure.

F004: Search and filter capabilities for the "My Companies" list.

4.3. External Company Management (Vendors/Customers)
F005: CRUD functionality for external companies.

F006: List view displaying all external companies with key details (Name, Code, City, Country).

F007: Form for adding/editing external company details as per the COMPANY_TABLE structure.

F008: Search and filter capabilities for the external companies list.

4.4. PN Master Table Management
F009: CRUD functionality for Part Numbers (PNs).

F010: List view displaying all PNs with description and remarks.

F011: Form for adding/editing PN details.

F012: Functionality to import PN data from an Excel spreadsheet.

The system should provide a template or clear instructions on the required Excel format.

Error handling for import process (e.g., duplicate PNs, missing required fields).

F013: Search and filter capabilities for the PN Master list.

4.5. Inventory Management
F014: View a comprehensive list of all inventory items.

Display fields: PN, Description, SN, PO Price, PO No, Remarks, Status.

F015: Search and filter inventory items by PN, SN, Status, etc.

F016: (V1.1) Functionality to add new inventory items (potentially linked to PO receiving).

F017: (V1.1) Functionality to update inventory item details, especially status and remarks.

4.6. Purchase Order (PO) Management
F018: Create new Purchase Orders.

Form to select "My Company" (issuing entity) and "External Company" (vendor).

Fields for PO header information: PO No (system-generated or manual with uniqueness check), Date, Prepared By, Currency, Ship Via Company & Account, Payment Term, AWB No, Remarks 1, Remarks 2.

Ability to add multiple line items to a PO. Each line item includes:

PN (selectable from PN Master Table, auto-populating description).

Description (editable if needed).

SN (Serial Number - if applicable at PO creation, otherwise at receiving).

Quantity.

Condition.

Unit Price.

Total Price (auto-calculated).

F019: List view of all Purchase Orders.

Display key PO information: PO No, My Company Name, Vendor Name, Date, Total Amount, Status (e.g., Draft, Issued, Partially Received, Received, Cancelled).

F020: View details of a specific Purchase Order.

F021: Edit existing Purchase Orders (primarily for drafts or with restrictions based on status).

F022: Delete Purchase Orders (primarily for drafts).

F023: PDF Generation for Purchase Orders.

A standardized PO template will be used.

The PDF should include all relevant PO header and line item details.

Option to download or print the PDF.

F024: Search and filter POs by PO No, Vendor, Date, Status, etc.

F025: (V1.1) Functionality to update PO status (e.g., from Draft to Issued, link to inventory receiving).

4.7. My Ship Via Management
F026: CRUD functionality for "My Ship Via" companies (shipping carriers used by TASAVIA).

F027: List view displaying all "My Ship Via" companies with Owner, Account No, and Ship Model.

F028: Form for adding/editing "My Ship Via" details.

F029: Search and filter capabilities for the "My Ship Via" list.

4.8. User Authentication and Authorization
F030: Secure user login mechanism.

F031: (V1.1) Role-based access control (RBAC) to restrict access to certain modules or functionalities based on user roles (e.g., Admin, Purchasing, Inventory).

5. Data Model
The following tables will be implemented in Supabase (PostgreSQL). Primary Keys (PK) and Foreign Keys (FK) are indicated.

5.1. MY_COMPANIES
* `my_company_id` (UUID, PK, default: uuid_generate_v4())
* `my_company_name` (TEXT, NOT NULL)
* `my_company_code` (TEXT, UNIQUE, NOT NULL)
* `my_company_address` (TEXT)
* `zip_code` (TEXT)
* `city` (TEXT)
* `country` (TEXT)
* `contact_name` (TEXT)
* `email` (TEXT, format: email)
* `phone` (TEXT)
* `created_at` (TIMESTAMPTZ, default: now())
* `updated_at` (TIMESTAMPTZ, default: now())

5.2. COMPANIES (External Vendors/Customers)
* `company_id` (UUID, PK, default: uuid_generate_v4())
* `company_name` (TEXT, NOT NULL)
* `company_code` (TEXT, UNIQUE)
* `address` (TEXT)
* `zip_code` (TEXT)
* `city` (TEXT)
* `country` (TEXT)
* `contact_name` (TEXT)
* `email` (TEXT, format: email)
* `phone` (TEXT)
* `default_ship_via_company_name` (TEXT)
* `default_ship_account_no` (TEXT)
* `created_at` (TIMESTAMPTZ, default: now())
* `updated_at` (TIMESTAMPTZ, default: now())

5.3. PN_MASTER_TABLE (Part Number Master)
* `pn_id` (UUID, PK, default: uuid_generate_v4())
* `pn` (TEXT, NOT NULL, UNIQUE)
* `description` (TEXT)
* `remarks` (TEXT)
* `created_at` (TIMESTAMPTZ, default: now())
* `updated_at` (TIMESTAMPTZ, default: now())

5.4. MY_SHIP_VIA
* `ship_via_id` (UUID, PK, default: uuid_generate_v4())
* `ship_company_name` (TEXT, NOT NULL)
* `owner` (TEXT) /* Clarification: Who is the owner? TASAVIA entity or contact person? */
* `account_no` (TEXT, NOT NULL)
* `ship_model` (TEXT) /* E.g., Express, Ground, Freight */
* `created_at` (TIMESTAMPTZ, default: now())
* `updated_at` (TIMESTAMPTZ, default: now())

5.5. INVENTORY
* `inventory_id` (UUID, PK, default: uuid_generate_v4())
* `pn_id` (UUID, FK references `PN_MASTER_TABLE(pn_id)`, NOT NULL)
* `sn` (TEXT) /* Serial Number, unique per PN if applicable */
* `po_price` (DECIMAL(10,2)) /* Price at which it was purchased */
* `po_id_original` (UUID, FK references `PURCHASE_ORDERS(po_id)`, NULLABLE) /* Original PO if directly from purchase */
* `po_number_original` (TEXT) /* Denormalized original PO number for quick reference */
* `remarks` (TEXT)
* `status` (TEXT, e.g., 'Available', 'Reserved', 'In Use', 'Under Maintenance', 'Sold')
* `location` (TEXT, NULLABLE) /* Physical location if needed */
* `created_at` (TIMESTAMPTZ, default: now())
* `updated_at` (TIMESTAMPTZ, default: now())
* CONSTRAINT `unique_pn_sn` UNIQUE (`pn_id`, `sn`) /* Ensure SN is unique for a given PN if SN is used */

5.6. PURCHASE_ORDERS (PO Header)
* `po_id` (UUID, PK, default: uuid_generate_v4())
* `po_number` (TEXT, UNIQUE, NOT NULL) /* Can be system generated or manually entered */
* `my_company_id` (UUID, FK references `MY_COMPANIES(my_company_id)`, NOT NULL)
* `vendor_company_id` (UUID, FK references `COMPANIES(company_id)`, NOT NULL)
* `po_date` (DATE, NOT NULL, default: current_date)
* `prepared_by_user_id` (UUID, FK references `auth.users(id)`, NULLABLE) /* Link to Supabase auth user */
* `prepared_by_name` (TEXT) /* Fallback or if user not in system */
* `currency` (TEXT, NOT NULL, default: 'USD') /* e.g., USD, EUR, TRY */
* `ship_via_id` (UUID, FK references `MY_SHIP_VIA(ship_via_id)`, NULLABLE)
* `ship_account_no_override` (TEXT, NULLABLE) /* If different from default My Ship Via account */
* `payment_term` (TEXT)
* `awb_no` (TEXT) /* Air Waybill Number */
* `remarks_1` (TEXT)
* `remarks_2` (TEXT)
* `total_amount` (DECIMAL(12,2), default: 0.00) /* Auto-calculated from PO_ITEMS */
* `status` (TEXT, NOT NULL, default: 'Draft') /* e.g., 'Draft', 'Submitted', 'Approved', 'Partially Received', 'Received', 'Cancelled' */
* `created_at` (TIMESTAMPTZ, default: now())
* `updated_at` (TIMESTAMPTZ, default: now())

5.7. PO_ITEMS (PO Line Items)
* `po_item_id` (UUID, PK, default: uuid_generate_v4())
* `po_id` (UUID, FK references `PURCHASE_ORDERS(po_id)` ON DELETE CASCADE, NOT NULL)
* `pn_id` (UUID, FK references `PN_MASTER_TABLE(pn_id)`, NOT NULL)
* `description_override` (TEXT) /* If different from PN_MASTER_TABLE.description */
* `sn` (TEXT) /* Serial Number, if applicable per item on PO. Often assigned at receiving. */
* `quantity` (INTEGER, NOT NULL, CHECK (quantity > 0))
* `unit_price` (DECIMAL(10,2), NOT NULL, CHECK (unit_price >= 0))
* `condition` (TEXT) /* e.g., 'New', 'Used', 'Refurbished' */
* `line_total` (DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED) /* Auto-calculated */
* `created_at` (TIMESTAMPTZ, default: now())
* `updated_at` (TIMESTAMPTZ, default: now())

6. Technical Stack
Frontend: Next.js (React framework)

UI Components: Tailwind CSS (or a component library like Shadcn/UI, Material UI, Ant Design - to be decided)

Backend & Database: Supabase (PostgreSQL, Authentication, Storage, Edge Functions if needed)

PDF Generation: A library like react-pdf/renderer (client-side) or pdfmake (client/server-side), or a Supabase Edge Function using a Node.js PDF library.

State Management: React Context API, Zustand, or Redux Toolkit (based on complexity).

Deployment: Vercel (for Next.js) or Supabase hosting options.

7. Non-Functional Requirements
Usability: The application must be intuitive, user-friendly, and require minimal training. Clear navigation and consistent UI design.

Performance:

Page load times should be under 3 seconds for typical operations.

List views with large datasets should support pagination and efficient searching/filtering.

Scalability: The system should be able to handle a growing number of users, records, and transactions without significant degradation in performance. Supabase provides good scalability options.

Security:

Secure authentication for all users.

Implementation of Supabase Row Level Security (RLS) to ensure users can only access and modify data they are authorized for.

Protection against common web vulnerabilities (XSS, CSRF, SQL Injection - largely handled by Supabase and Next.js best practices).

Reliability & Availability: The application should be highly available with minimal downtime.

Data Integrity: Mechanisms to ensure data accuracy and consistency (e.g., input validation, foreign key constraints).

Maintainability: Code should be well-structured, commented, and follow best practices to facilitate future updates and maintenance.

Browser Compatibility: Support for latest versions of major browsers (Chrome, Firefox, Safari, Edge).

Responsiveness: The application should be responsive and usable on various screen sizes, primarily desktop and tablet.

8. Success Metrics
Task Completion Rate: Percentage of users successfully completing key tasks (e.g., creating a PO, finding a PN).

Time on Task: Reduction in time taken to complete key tasks compared to previous methods.

User Adoption Rate: Number of active users and frequency of use.

Data Accuracy: Reduction in data entry errors and inconsistencies.

User Satisfaction: Measured through surveys or feedback sessions (e.g., Net Promoter Score - NPS).

Reduction in Manual Work: Quantifiable decrease in time spent on manual data management.

9. Future Considerations (Out of Scope for V1)
Advanced Reporting & Analytics: Customizable reports, data visualization.

Real-time Notifications: Alerts for low stock, PO status changes, etc.

Barcode/QR Code Integration: For inventory management (scanning items in/out).

Full Audit Trails: Comprehensive logging of all data changes and user actions.

Integration with Accounting Software: Exporting PO data or financial information.

Multi-language Support.

Document Management: Attaching files (e.g., invoices, shipping docs) to POs or inventory items.

10. Open Questions/Clarifications Needed
Clarify the meaning/use of OWNER field in MY_SHIP_VIA table.

Clarify the meaning/use of SHIP_MODEL field in MY_SHIP_VIA table.

Specifics of the PO Number generation (fully automatic, prefix + sequence, manual with validation?).

Detailed requirements for the PO PDF template layout and content.

Workflow for PO approval, if any, before it's considered 'Issued'.

Handling of different units of measure for PNs if applicable.

Specific requirements for Excel import (column mapping, error handling details).

This PRD serves as a foundational document and may be updated as the project progresses and more details emerge.