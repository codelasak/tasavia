### **Product Requirements Document: TASAVIA Internal Dashboard**

**Version: 1.2**
**Date: June 13, 2025**
**Prepared For:** TASAVIA

#### **Revision History**

  * **v1.2 (June 13, 2025):** Finalized requirements based on the sample PO PDF (`P25172.pdf`). Added a "Ship To/Consignee" address block, detailed cost fields (freight, misc charges), and line item numbers. Refined PO number format and PDF generation requirements.
  * **v1.1 (June 7, 2025):** Updated the Purchase Order section based on an initial schematic layout. Clarified UI behaviors like autocomplete, dropdowns, and auto-populated fields.
  * **v1.0 (June 1, 2025):** Initial draft.

### 1\. Introduction

#### 1.1. Purpose

This document outlines the product requirements for the TASAVIA Internal Dashboard. The dashboard aims to centralize and streamline key operational processes, including inventory management, purchase order processing, company data management, and part number referencing.

### 2\. Target Users

  * Inventory Managers
  * Purchasing Department Staff
  * Logistics/Shipping Coordinators
  * Company Administrators/Management

### 3\. User Stories

  * **US001 (Company Admin):** As a Company Administrator, I want to manage profiles for "My Companies" so that all internal company information is accurate for use in documents like POs.
  * **US002 (Company Admin):** As a Company Administrator, I want to manage profiles for external companies (vendors, customers) so that I can easily select them for transactions.
  * **US003 (All Users):** As a user, I want to view and search a master list of Part Numbers (PNs).
  * **US004 (Data Admin):** As a Data Administrator, I want to import a PN Master List from an Excel file to efficiently populate part data.
  * **US005 (Inventory Manager):** As an Inventory Manager, I want to view the current inventory to monitor stock levels and item details.
  * **US006 (Purchasing Staff):** As a Purchasing Staff member, I want to create new Purchase Orders to efficiently procure goods.
  * **US007 (Purchasing Staff):** As a Purchasing Staff member, I want to view a list of all Purchase Orders to track their progress.
  * [cite\_start]**US008 (Purchasing Staff):** As a Purchasing Staff member, I want to generate a PDF version of a Purchase Order to send to the vendor[cite: 1, 2, 3, 4, 5, 6, 7, 8].
  * **US009 (Logistics Coordinator):** As a Logistics Coordinator, I want to manage a list of "My Ship Via" companies so that shipping information is readily available for POs.
  * **US010 (All Users):** As a user, I want to search and filter all lists to find specific information quickly.

### 4\. Proposed Features

#### 4.1. My Companies Management

  * **F001:** CRUD (Create, Read, Update, Delete) functionality for "My Companies."
  * **F002:** List view displaying all "My Companies."
  * **F003:** Form for adding/editing "My Company" details.

#### 4.2. External Company Management (Vendors/Customers)

  * **F005:** CRUD functionality for external companies.
  * **F006:** List view displaying all external companies.
  * **F007:** Form for adding/editing external company details.

#### 4.3. PN Master Table Management

  * **F009:** CRUD functionality for Part Numbers (PNs).
  * **F010:** List view displaying all PNs with description and remarks.
  * **F011:** Functionality to import PN data from an Excel spreadsheet.

#### 4.4. Inventory Management

  * **F012:** View a comprehensive list of all inventory items.
  * **F013:** Search and filter inventory items.

#### 4.5. Purchase Order (PO) Management

  * **F014: Create new Purchase Orders.** A form will capture PO details with the following field behavior:

      * **PO No:** System-generated automatically. [cite\_start]The format will be `P<YY><sequence>` (e.g., P25172)[cite: 1]. This field will be read-only.
      * **My Company:** Selectable via an autocomplete search on `My Company Code`. Name and Address will be auto-populated and read-only.
      * **Vendor (To):** Selectable via an autocomplete search on `Company Code`. [cite\_start]Name and Address will be auto-populated and read-only[cite: 1].
      * [cite\_start]**Ship To / Consignee Address:** A dedicated section on the form to enter a shipping address, which can be different from the "My Company" address[cite: 3]. [cite\_start]This will include free-text fields for Company Name, Address Details, Contact Person, Phone, and Email[cite: 3].
      * [cite\_start]**PO Date:** Selectable via a date-picker calendar[cite: 2]. Defaults to the current date.
      * [cite\_start]**Prepared By:** A free-text field that defaults to the name of the logged-in user but remains editable[cite: 2].
      * **Ship Via:** A dropdown populated from the `MY_SHIP_VIA` table. [cite\_start]When selected, it should display in the format "{Ship Company Name} \# {Account No}" (e.g., DHL \# 958175630)[cite: 3].
      * [cite\_start]**Payment Term:** A dropdown menu with options including `NET30`[cite: 3].
      * **Cost Fields:**
          * [cite\_start]`Freight/Forwarding Charge`: A number input for freight costs[cite: 7].
          * [cite\_start]`Misc Charge`: A number input for miscellaneous charges[cite: 7].
          * [cite\_start]`VAT (%)`: A number input for the VAT percentage[cite: 7].
      * [cite\_start]**Remarks:** Free text fields for general notes[cite: 5].
      * **PO Line Items:** Ability to add multiple line items, each including:
          * [cite\_start]`Item No`: Automatically numbered (1, 2, 3, ...)[cite: 4].
          * [cite\_start]`PN`: Selectable from the `PN_MASTER_TABLE` via autocomplete search[cite: 4].
          * [cite\_start]`Description`: Auto-populated from the selected PN[cite: 4].
          * [cite\_start]`SN`: Free-text field for Serial Number[cite: 4].
          * [cite\_start]`Condition`: A dropdown menu with options including `AR`[cite: 4].
          * [cite\_start]`Value ($)`: Number (decimal) input for unit price[cite: 4].

  * **F015:** List view of all Purchase Orders with status and key details.

  * **F016: PDF Generation for Purchase Orders.**

      * [cite\_start]A standardized PDF template will be used, matching the layout of `P25172.pdf`[cite: 1, 2, 3, 4, 5, 6, 7, 8].
      * [cite\_start]The PDF must include the "My Company" address block, the Vendor ("TO") address block, and the "Ship To/Consignee" address block[cite: 1, 3].
      * [cite\_start]The PDF must include a detailed cost summary: `Sub Total`, `Freight/Forwarding`, `Misc Charge`, `VAT`, and `Total NET`[cite: 7].

#### 4.6. My Ship Via Management

  * **F017:** CRUD functionality for "My Ship Via" companies.
  * **F018:** The table will include `Ship Company Name`, `Owner`, `Account No`, and `Ship Model`.

### 5\. Data Model

#### 5.1. MY\_COMPANIES

  * `my_company_id` (PK), `my_company_name`, `my_company_code`, `my_company_address`, `city`, `country`, etc.

#### 5.2. COMPANIES (External Vendors/Customers)

  * `company_id` (PK), `company_name`, `company_code`, `address`, `city`, `country`, etc.

#### 5.3. PN\_MASTER\_TABLE

  * `pn_id` (PK), `pn` (UNIQUE), `description`, `remarks`.

#### 5.4. MY\_SHIP\_VIA

  * `ship_via_id` (PK), `ship_company_name`, `owner`, `account_no` (NOT NULL), `ship_model`.

#### 5.5. PURCHASE\_ORDERS (PO Header)

  * `po_id` (UUID, PK)
  * [cite\_start]`po_number` (TEXT, UNIQUE, NOT NULL) /\* System generated, format: P\<YY\>\<sequence\> e.g., P25172 [cite: 1] \*/
  * `my_company_id` (UUID, FK)
  * `vendor_company_id` (UUID, FK)
  * [cite\_start]`po_date` (DATE, NOT NULL) [cite: 2]
  * [cite\_start]**`ship_to_company_name`** (TEXT, NULLABLE) [cite: 3]
  * [cite\_start]**`ship_to_address_details`** (TEXT, NULLABLE) [cite: 3]
  * [cite\_start]**`ship_to_contact_name`** (TEXT, NULLABLE) [cite: 3]
  * [cite\_start]**`ship_to_contact_phone`** (TEXT, NULLABLE) [cite: 3]
  * [cite\_start]**`ship_to_contact_email`** (TEXT, NULLABLE) [cite: 3]
  * [cite\_start]`prepared_by_name` (TEXT) [cite: 2]
  * [cite\_start]`currency` (TEXT, NOT NULL, default: 'USD') [cite: 7]
  * [cite\_start]`ship_via_id` (UUID, FK, NULLABLE) [cite: 3]
  * [cite\_start]`payment_term` (TEXT) [cite: 3]
  * [cite\_start]`remarks_1` (TEXT) [cite: 5]
  * [cite\_start]**`freight_charge`** (DECIMAL(10,2), default: 0.00) [cite: 7]
  * [cite\_start]**`misc_charge`** (DECIMAL(10,2), default: 0.00) [cite: 7]
  * [cite\_start]**`vat_percentage`** (DECIMAL(5,2), default: 0.00) [cite: 7]
  * [cite\_start]`total_amount` (DECIMAL(12,2)) /\* Auto-calculated: sum of line totals + charges + VAT [cite: 7] \*/
  * `status` (TEXT, NOT NULL, default: 'Draft')

#### 5.6. PO\_ITEMS (PO Line Items)

  * `po_item_id` (UUID, PK)
  * `po_id` (UUID, FK)
  * [cite\_start]**`line_number`** (INTEGER, NOT NULL) [cite: 4]
  * [cite\_start]`pn_id` (UUID, FK) [cite: 4]
  * [cite\_start]`description` (TEXT) [cite: 4]
  * [cite\_start]`sn` (TEXT) [cite: 4]
  * `quantity` (INTEGER, NOT NULL)
  * [cite\_start]`unit_price` (DECIMAL(10,2), NOT NULL) [cite: 4]
  * [cite\_start]`condition` (TEXT) [cite: 4]
  * `line_total` (DECIMAL(12,2) GENERATED ALWAYS AS (quantity \* unit\_price) STORED)

### 6\. Technical Stack

  * **Frontend:** Next.js
  * **UI Components:** Tailwind CSS
  * **Backend & Database:** Supabase (PostgreSQL, Authentication)
  * **PDF Generation:** `react-pdf/renderer` or similar library.
  * **Deployment:** AWS Amplify 

### 7\. Non-Functional Requirements

  * **Usability:** The application must be intuitive and user-friendly.
  * **Performance:** Fast page loads and efficient data handling.
  * **Security:** Secure user authentication and data access controls (Row Level Security).
  * **Reliability:** High availability with minimal downtime.
  * **Responsiveness:** Usable on desktop and tablet screens.