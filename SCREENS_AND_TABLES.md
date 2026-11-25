# Crestara CRM — Complete System Blueprint: Portals, Screens & Database Tables

> **Comprehensive Reference Specification & Architectural Audit**  
> Covers all authentication flows, the Internal Staff Portal, the External Customer Portal, every screen and interactive modal, every PostgreSQL database table, and every UI data grid.

---

## 1. Executive Architecture & Dual-Persona Portals

Crestara CRM is architected around a **dual-persona role model** backed by **Supabase Auth & PostgreSQL** and powered by **Vue 3 + Frappe UI + Tailwind CSS**:

```
                              ┌───────────────────────────────────┐
                              │     Authentication & Security     │
                              │    (/login, /reset-password)      │
                              └─────────────────┬─────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
    ┌─────────────────────────────────┐                   ┌─────────────────────────────────┐
    │     Internal Staff Portal       │                   │     External Customer Portal    │
    │     (/dashboard, /clients...)   │                   │     (/portal/*)                 │
    ├─────────────────────────────────┤                   ├─────────────────────────────────┤
    │ Roles: Administrator, Staff     │                   │ Role: Customer                  │
    │ Shell: DesktopLayout (>= 768px) │                   │ Shell: CustomerLayout           │
    │        MobileLayout (< 768px)   │                   │        CustomerBottomNav        │
    │ Navigation: AppSidebar (260px)  │                   │ Clean B2B client dashboard,     │
    │ Teleported LayoutHeader actions │                   │ self-service invoice settlement,│
    │ High-density telemetry & tables │                   │ official receipt downloads.     │
    └─────────────────────────────────┘                   └─────────────────────────────────┘
```

### Core Portals & Layout Shells

1. **Authentication Shell (`EmptyLayout`)**:
   - Used for standalone authentication and onboarding pages: `/login`, `/reset-password`, `/onboarding`, `/welcome`, and `/not-permitted`.
   - Full-canvas responsive wrapper with uninhibited vertical scrolling (`h-full w-full overflow-y-auto`).

2. **Internal Staff Portal Shell (`DesktopLayout` / `MobileLayout`)**:
   - Routes: `/dashboard`, `/clients`, `/clients/:clientId`, `/invoices`, `/invoices/:invoiceId`, `/transactions`, `/inventory`, `/reminders`, `/calendar`, `/tasks`, `/business-settings`.
   - Restricted to authenticated users whose resolved role is `Administrator` or `Staff`.
   - **Desktop (>= 768px)**: 260px collapsible `AppSidebar` on the left, sticky `AppHeader` across the top (with teleported `#left-header` title/breadcrumbs and `#right-header` contextual action buttons), and a high-density scrollable canvas.
   - **Mobile (< 768px)**: Slim mobile header, sliding drawer navigation, and dynamic click-count prioritized bottom navigation bar (`MobileBottomNav`).

3. **External Customer Portal Shell (`CustomerLayout`)**:
   - Routes: `/portal`, `/portal/purchases`, `/portal/calendar`, `/portal/account`.
   - Dedicated client-facing layout with brand logo, top navigation links (*Dashboard, Purchases, Calendar, My Account*), notification badge, profile dropdown, and mobile bottom navigation (`CustomerBottomNav`).
   - Strict Row-Level Security (RLS) guarantees that customer users can **only query and view their own records**.

---

## 2. Complete Screen-by-Screen Rundown

### A. Authentication & Onboarding Screens

#### 1. Login & Registration Screen
* **Route**: `/login`
* **Component**: [`frontend/src/pages/Login.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Login.vue)
* **Layout**: `EmptyLayout`
* **Features & Workflows**:
  * **Brand Header**: Displays company logo (`/crestara_logo.png`) and dynamic mode titles.
  * **Mode Switcher Tabs**:
    * **Sign In Tab**: Email input, password input with show/hide password toggle, "Remember me" persistence checkbox (reads/writes encrypted state via `authHelpers.js`), "Forgot password?" shortcut link, and submit button.
    * **Sign Up Tab**: Full Name input, Email input, Password, and Confirm Password (with live comparison validator indicator), creating a new Supabase account provisioned with default role `Customer`.
    * **Forgot Password Mode**: Email input with "Send Reset Link" button triggering Supabase password recovery email.
  * **Role-Based Post-Login Routing**:
    * If resolved role is `Customer` → redirected to `/portal`.
    * If resolved role is `Administrator` or `Staff` → redirected to `/dashboard`.
  * **Footer**: Fixed link to *"Powered by redcupseries"*.

---

#### 2. Password Reset Screen
* **Route**: `/reset-password`
* **Component**: [`frontend/src/pages/ResetPassword.vue`](file:///E:/crestara%20CRM/frontend/src/pages/ResetPassword.vue)
* **Layout**: `EmptyLayout`
* **Features & Workflows**:
  * **Request Recovery Mode**: Form to submit account email address to receive password reset link.
  * **Recovery Session Mode**: Detects Supabase recovery access tokens from URL hash (`#access_token=...&type=recovery`). Provides New Password and Confirm Password inputs with 6-character minimum validation.
  * **Success State Banner**: Green confirmation banner alerting user that credentials have been updated, with direct button to return to `/login`.

---

#### 3. Onboarding & Welcome Screens
* **Routes**: `/onboarding` & `/welcome`
* **Components**: [`frontend/src/pages/PersonaForm.vue`](file:///E:/crestara%20CRM/frontend/src/pages/PersonaForm.vue) & [`frontend/src/pages/Welcome.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Welcome.vue)
* **Layout**: `EmptyLayout`
* **Features**:
  * **`/onboarding`**: Initial setup wizard questionnaire for fresh administrative deployments. Sets `crm_persona_captured` in localStorage and bypasses subsequent visits to `/dashboard`.
  * **`/welcome`**: Getting-started hub allowing administrators to generate 10 sample CRM records or link external email integrations.

---

### B. Internal Staff Portal Screens

#### 4. Executive Telemetry Dashboard
* **Route**: `/dashboard`
* **Component**: [`frontend/src/pages/Dashboard.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Dashboard.vue)
* **Layout**: `DesktopLayout` / `MobileLayout`
* **Header Controls**: "Refresh" button, "Edit Layout" toggle (Admins & Managers), and "New Invoice" primary button.
* **Date Range Controls**: Presets dropdown (*Last 7 Days, Last 30 Days, Last 90 Days, This Quarter, This Year, All Time*) with date range picker and active period badge.
* **Telemetry Grid (20-column responsive)**:
  * Total Settled Revenue
  * Outstanding Receivables by Status
  * Paid vs. Overdue Invoices ratio
  * Average Collection Time (DSO)
* **Operations Section**:
  * **Urgent Overdue Watchlist**: Delinquent customer accounts showing balance due and a 1-click **"Remind"** button.
  * **Recent Cash Settlements**: Stream of settled customer payments with receipt reference, client name, payment date/method, and green `+Amount`.
* **Edit Layout Mode**: Drag-and-drop tile repositioning, Add Chart Modal, and Reset to Default button.

---

#### 5. Clients & Organizations Master
* **Route**: `/clients` (Aliases: `/organizations`)
* **Component**: [`frontend/src/pages/Clients.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Clients.vue)
* **Layout**: `DesktopLayout` / `MobileLayout`
* **Header Controls**: Total client count badge, Pending Approvals badge (if change requests exist), and **"Add Client"** button.
* **Tabs**:
  1. **All Clients**: Master table and mobile adaptive cards.
  2. **Pending Approvals**: Queue of client-submitted corporate and tax change requests requiring staff review.
  3. **Change Request History**: Audit log of reviewed, approved, or rejected profile modification requests.
* **Filter Bar**: Global search bar across company name, contact person, email, and tax ID.
* **Responsive Mode (< 768px)**: Switches to touch-first adaptive client cards with 1-tap phone dialer and email links.

---

#### 6. Client 360 Detail Profile
* **Route**: `/clients/:clientId`
* **Component**: [`frontend/src/pages/Client.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Client.vue)
* **Layout**: `DesktopLayout` / `MobileLayout`
* **Header**: Back to Clients button, Client Logo/Avatar badge, Company Name, Status Pill (*Active, Inactive, Suspended*), Industry/Legal Structure, **"Issue Invoice"**, **"Upgrade to Staff"**, and **"Edit Client"** buttons.
* **Pending Verification Banner**: Alerts staff when a client has submitted changes to corporate or tax details.
* **Overview Cards Grid**:
  * **Corporate Registry Card**: CRN (Company Registration Number) with 1-click copy, Tax ID / TIN / EIN with 1-click copy, VAT Number, and Official Website link.
  * **Primary Contact Person Card**: Full Name, Job Title, Email (`mailto:` link), Phone (`tel:` link), and National ID/Passport Number.
  * **Commercial & Terms Card**: Default Currency, Default Payment Terms (*Net 15, Net 30, etc.*), Preferred Payment Method, Credit Limit, and Discount Rate.
* **Addresses Grid**: Structured Billing Address and Shipping/Service Address.
* **Client Financials & Ledger**: Financial overview metric cards (Total Invoiced, Total Settled, Balance Outstanding) and a dedicated table of all invoices issued to this client.

---

#### 7. Invoices Master Hub
* **Route**: `/invoices`
* **Component**: [`frontend/src/pages/Invoices/Invoices.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Invoices/Invoices.vue)
* **Layout**: `DesktopLayout` / `MobileLayout`
* **Header Controls**: Refresh button and **"Create Invoice"** primary action.
* **KPI Metrics Ribbon**:
  1. **Total Revenue**: Total cash settled through payments.
  2. **Outstanding Balance**: Total balance due across open accounts.
  3. **Overdue Invoices**: Count of invoices past payment deadline.
  4. **Paid Invoices**: Count of fully completed invoices.
* **Filter Bar**:
  * Status filter tabs with real-time counters (*All, Draft, Issued, Partially paid, Paid, Overdue, Cancelled*).
  * Client dropdown filter.
  * Search bar for invoice numbers or client names.
* **Data Presentation**: High-density desktop table with live countdown badges (*"Due in 3 days"*, *"Overdue by 5 days"*), accompanied by mobile adaptive cards.

---

#### 8. Invoice Document Detail & Creation
* **Routes**: `/invoices/:invoiceId` & `/invoices/new`
* **Component**: [`frontend/src/pages/Invoices/InvoiceDetail.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Invoices/InvoiceDetail.vue)
* **Layout**: `DesktopLayout` / `MobileLayout` (Printable with `@media print`)
* **Header Actions**:
  * **Mark as Paid in Full** (1-click settlement)
  * **Record Payment** (Partial or full payment modal)
  * **View Official Receipt** (Opens commercial receipt modal)
  * **Preview & Print** (Formatted print stylesheet & PDF export)
  * **Send to WhatsApp** (Opens pre-formatted message with PDF link)
  * **Email Invoice** (Direct SMTP transmission with PDF attachment)
  * **Send Payment Reminder** (Customizable reminder email)
  * **Schedule in Calendar** (Links event or due date to Calendar)
  * **Cancel Invoice** / **Save Changes**
* **Invoice Form Canvas**:
  * Company logo and seller metadata from Business Settings.
  * Client selector with automatic population of billing address and contact details.
  * Invoice Number, Issue Date, Due Date, Payment Terms, and Currency.
  * **Line Items Table**: Code / SKU, Item Name, Description, Quantity, Unit Price, Taxable toggle, and computed Line Amount.
  * **Totals Summary**: Subtotal, Discount %, Tax Amount, Total Amount, Amount Paid, and Balance Due.
  * **Embedded Payments Ledger**: Lists all payments recorded against this invoice.
  * **Footer & Terms**: Notes and bank wire instructions.

---

#### 9. Cash Settlements & Transactions Ledger
* **Route**: `/transactions`
* **Component**: [`frontend/src/pages/Transactions/Transactions.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Transactions/Transactions.vue)
* **Layout**: `DesktopLayout` / `MobileLayout`
* **Header**: Live **Total Settled** revenue figure.
* **Filters**: Payment method selector (*All, Credit Card, Stripe, Bank Wire Transfer*) and search bar.
* **Ledger View**: Comprehensive table recording all inbound customer payments, linked invoice numbers, payment dates, settlement methods, amounts, and receipt view buttons.

---

#### 10. Inventory & Services Catalog
* **Route**: `/inventory`
* **Component**: [`frontend/src/pages/Inventory/Inventory.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Inventory/Inventory.vue)
* **Layout**: `DesktopLayout` / `MobileLayout`
* **Header Controls**: Item counter and **"Add Product / Service"** modal launcher.
* **Low Stock Alert Banner**: Visual warning when physical goods drop below their configured low-stock threshold.
* **Filters**: Item Type (*Products Only, Services Only, Low Stock Warnings*) and Category filter dropdowns.
* **Data Table**: Item image thumbnail, SKU code, Item Name, Category, Type badge, Selling Price, Gross Margin % (Administrator only), Stock On Hand, and Stock Status pill.

---

#### 11. Automated Payment Reminders
* **Route**: `/reminders`
* **Component**: [`frontend/src/pages/Reminders/PaymentReminders.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Reminders/PaymentReminders.vue)
* **Layout**: `DesktopLayout` / `MobileLayout`
* **Header Controls**: **"Test Reminder Run"** (dry-run simulation without sending emails) and **"Reminder Settings"** shortcut.
* **Automation Status Banner**: Displays whether automated daily cron dispatch is Active/Armed, with the current schedule (*e.g., 7, 3, 1 days before deadline and 3, 7 days after*).
* **KPI Metrics**: Overdue Follow-ups, Due Within 7 Days, Outstanding Balance, and Reminders Sent This Month.
* **Tabs**:
  * **Active Reminder Queue**: Actionable list of invoices due or overdue, with balance due, countdown, reminder count, per-invoice automation toggle, and manual **"Send Reminder Now"** modal.
  * **Automated Reminder Logs**: Historical audit trail of dispatched reminders.

---

#### 12. Shared Calendar & Event Scheduler
* **Route**: `/calendar`
* **Component**: [`frontend/src/pages/Calendar.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Calendar.vue)
* **Layout**: `DesktopLayout` / `MobileLayout`
* **Header Controls**: Month/Year selector, `< Today >` navigation, View mode toggle (*Month, Week, Day, Agenda*), and **"Create Event"** button (`Mod+E`).
* **Filters**: Public vs. Private events, and staff participant filter.
* **Features**: Interactive drag-and-drop event creation, color-coded event cards, and flyout panel for day details.

---

#### 13. Tasks Management Hub
* **Route**: `/tasks`
* **Component**: [`frontend/src/pages/Tasks.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Tasks.vue)
* **Layout**: `DesktopLayout` / `MobileLayout`
* **Header Controls**: View mode switcher (Kanban vs. List view), Sort dropdown, Refresh, and **"Create Task"** button.
* **Filters**: Status (*Backlog, Todo, In Progress, Completed, Cancelled*), Priority (*Low, Medium, High, Urgent*), Assignee dropdown, and search.
* **Kanban Board**: Drag-and-drop cards between progress columns with inline creation.
* **List View**: Dense data table with status icons, priority indicators, due dates, and assignee avatars.

---

#### 14. Business Settings & System Administration
* **Route**: `/business-settings` (Alias: `/settings`)
* **Component**: [`frontend/src/pages/BusinessSettings/BusinessSettings.vue`](file:///E:/crestara%20CRM/frontend/src/pages/BusinessSettings/BusinessSettings.vue)
* **Layout**: `DesktopLayout`
* **Access Level**: Restricted to **Administrator** only (Staff receive `/not-permitted`).
* **Sections**:
  1. **Company & Contact Information**: Business name, legal name, billing email, phone, street address, tax ID, website, and company logo uploader.
  2. **Invoice Numbering & Financial Defaults**: Invoice prefix (`INV-2026-`), next invoice sequence number, receipt prefix (`REC-2026-`), next receipt sequence number, currency, default payment terms (days), statutory tax rate %, late fee %, and default remittance notes template.
  3. **Bank & Wire Remittance Settlement**: Bank name, account holder legal name, account number / IBAN, SWIFT / BIC, routing code, and remittance notes printed on invoices.
  4. **Inventory & Stock Management Settings**: Auto-deduct stock on invoice issuance switch, allow negative stock sales switch, and default low-stock alert threshold.
  5. **Automated Payment Reminders Configuration**: Master reminder toggle, pre-deadline countdown days (`7, 3, 1`), overdue gentle reminder days (`3, 7`), due date reminder switch, and cron dry-run test trigger.
  6. **Staff Accounts & Role Assignments**: Table of CRM team members, avatar uploader, role switcher (*Staff* vs. *Administrator*), and **"Invite Staff"** modal (with detection and 1-click upgrade of existing client accounts).

---

#### 15. System & Supporting Screens
* **Mobile Notifications (`/notifications` → [`frontend/src/pages/MobileNotification.vue`](file:///E:/crestara%20CRM/frontend/src/pages/MobileNotification.vue))**: Activity stream of WhatsApp alerts, invoice status updates, and task assignments.
* **Data Import (`/data-import` → [`frontend/src/pages/DataImport.vue`](file:///E:/crestara%20CRM/frontend/src/pages/DataImport.vue))**: CSV/Excel bulk import tool with column mapping.
* **Access Denied (`/not-permitted` → [`frontend/src/pages/NotPermitted.vue`](file:///E:/crestara%20CRM/frontend/src/pages/NotPermitted.vue))**: Clean fallback screen shown when permissions are insufficient.
* **Invalid Route (`/:invalidpath` → [`frontend/src/pages/InvalidPage.vue`](file:///E:/crestara%20CRM/frontend/src/pages/InvalidPage.vue))**: 404 page with a direct link back to Dashboard.

---

#### 16. Background / Retired Modules (Preserved in Codebase)
* **Leads (`/leads` → [`frontend/src/pages/Leads.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Leads.vue) & [`frontend/src/pages/Lead.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Lead.vue))**: Lead pipeline with list/Kanban views and conversion to Customer/Deal.
* **Deals (`/deals` → [`frontend/src/pages/Deals.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Deals.vue) & [`frontend/src/pages/Deal.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Deal.vue))**: Multi-stage deal pipeline with value tracking and win/loss analytics.
* **Contacts (`/contacts` → [`frontend/src/pages/Contacts.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Contacts.vue) & [`frontend/src/pages/Contact.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Contact.vue))**: Contact book linked to customers.
* **Call Logs (`/call-logs` → [`frontend/src/pages/CallLogs.vue`](file:///E:/crestara%20CRM/frontend/src/pages/CallLogs.vue))**: Telephony call history and recording integration.
* **Notes (`/notes` → [`frontend/src/pages/Notes.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Notes.vue))**: Standalone notes feed.

---

### C. External Customer Portal Screens (`/portal/*`)

All customer portal screens run under [`frontend/src/components/Layouts/CustomerLayout.vue`](file:///E:/crestara%20CRM/frontend/src/components/Layouts/CustomerLayout.vue) and are strictly isolated via Row Level Security (RLS) so clients can **only view their own data**.

#### 17. Customer Portal Dashboard
* **Route**: `/portal`
* **Component**: [`frontend/src/pages/Portal/CustomerDashboard.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Portal/CustomerDashboard.vue)
* **Layout**: `CustomerLayout`
* **Header**: Welcome banner addressing the client by name.
* **Summary Cards**:
  * **Outstanding Balance**: Live amount due across all unpaid invoices (with amber alert status if > 0).
  * **Total Purchases**: Cumulative spend across all issued invoices.
  * **Active Subscriptions**: Active services with next renewal date countdown.
* **Recent Invoices Table**: Latest 5 invoices with quick **"Pay Now"** or **"View Receipt"** action buttons.

---

#### 18. Customer Purchases & Invoices
* **Route**: `/portal/purchases`
* **Component**: [`frontend/src/pages/Portal/CustomerPurchases.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Portal/CustomerPurchases.vue)
* **Layout**: `CustomerLayout`
* **Header**: Subtitle explaining invoice and receipt access.
* **Purchases Table & Mobile Cards**: Complete financial ledger of every invoice issued to the customer:
  * Invoice Number (monospace badge)
  * Issue Date & Due Date
  * Total Invoiced Amount
  * Amount Paid
  * Balance Due
  * Status Badge (*Paid, Partially Paid, Issued, Overdue*)
  * **Actions**: **"Pay Now"** (opens settlement modal) or **"View Receipt"** (generates official commercial receipt).

---

#### 19. Customer Calendar & Renewal Schedule
* **Route**: `/portal/calendar`
* **Component**: [`frontend/src/pages/Portal/CustomerCalendar.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Portal/CustomerCalendar.vue)
* **Layout**: `CustomerLayout`
* **Upcoming Deadlines Timeline**: Chronological cards showing upcoming payment deadlines, service milestones, and subscription renewals with month/day badges, descriptions, and linked invoice numbers.
* **Support & Assistance Card**: Direct contact details for the assigned account manager.

---

#### 20. Customer Account & Change Requests
* **Route**: `/portal/account`
* **Component**: [`frontend/src/pages/Portal/CustomerAccount.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Portal/CustomerAccount.vue)
* **Layout**: `CustomerLayout`
* **Official Verification Policy Banner**: Explains that corporate registration and tax details cannot be modified directly without compliance review.
* **Pending Change Request Banner**: Warns the user when an existing modification proposal is pending staff approval.
* **Official Account Details Card**:
  * Profile verification percentage score.
  * **"Request Detail Change"** action button.
  * Organization Details: Company Name, CRN, Tax ID, VAT, Legal Structure, and Industry.
  * Primary Contact Person: Name, Job Title, Email, Phone, and National ID.
  * Registered Billing & Shipping Addresses.
* **Change Request History Table**: Full log of submitted change requests, reasons, proposed changes, review statuses (*Pending, Approved, Rejected*), and reviewer notes.

---

## 3. Comprehensive Database Tables Rundown (PostgreSQL / Supabase)

All database entities are defined in [`supabase/schema.sql`](file:///E:/crestara%20CRM/supabase/schema.sql) and secured via **Row Level Security (RLS)**:

| Table Name | Primary Purpose | Key Columns | RLS & Security Rules |
|---|---|---|---|
| **`public.profiles`** | User account identities linked to `auth.users(id)` | `id` (UUID PK), `email`, `full_name`, `avatar_url`, `role` (`'Administrator'`, `'Staff'`, `'Customer'`), `is_active`, timestamps | Authenticated users can view all profiles; users can only update their own record. |
| **`public.customers`** | Single Source of Truth for all B2B Clients & B2C Accounts | `id` (UUID PK), `company_name`, `legal_name`, `customer_type`, `status`, `company_registration_number`, `tin`, `vat_number`, `primary_email`, `billing_email`, `phone`, `mobile_no`, billing address fields, shipping address fields, `default_currency`, `default_payment_terms`, `credit_limit`, `logo_url`, `is_profile_complete`, `profile_completion_percentage`, `onboarding_steps_completed` | Admins & Staff have full CRUD access; Customers can only select/update their own matching customer record. |
| **`public.organizations`** | Backward-compatibility SQL view | Mirrors `customers` (`id`, `company_name AS name`, `website`, `phone`, `industry`, `annual_revenue`) | Read/write compatibility view for legacy Frappe references. |
| **`public.invoices`** | Single-table document model for invoices & billing | `id` (UUID PK), `invoice_number` (Unique), `customer_id`, `client_name`, `client_email`, `contact_name`, `status` (`'Draft'`, `'Issued'`, `'Partially paid'`, `'Paid'`, `'Overdue'`, `'Cancelled'`), `issue_date`, `due_date`, `currency`, `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `amount_paid`, `balance_due`, `items` (JSONB array), `payments` (JSONB array), `notes`, reminder fields (`reminders_enabled`, `last_reminder_sent_at`, `reminders_sent_count`, `reminder_history`) | Admins & Staff have full CRUD access; Customers can **only view** invoices where `client_email` or `customer_id` matches their auth identity. |
| **`public.payments`** | Financial cash settlements and sequential receipts ledger | `id` (UUID PK), `receipt_number` (Unique), `invoice_id`, `customer_id`, `invoice_number`, `client_name`, `client_email`, `amount`, `currency`, `payment_method`, `payment_date`, `status` (`'Settled'`, `'Pending'`, `'Failed'`, `'Refunded'`), `transaction_ref`, `notes`, `recorded_by` | Admins & Staff have full access; Customers can only view their own receipts. |
| **`public.business_settings`** | Global workspace configuration (singleton row `id = 'default'`) | `id` (`'default'`), `business_name`, `legal_name`, `business_email`, `business_phone`, `business_address`, `tax_id`, `website`, `logo_url`, `currency`, `currency_symbol`, `invoice_prefix`, `next_invoice_number`, `receipt_prefix`, `next_receipt_number`, `default_payment_terms`, `tax_rate`, `late_fee_percentage`, banking wire fields (`bank_name`, `bank_account_number`, `bank_routing_iban`, `swift_bic`), inventory controls (`auto_deduct_inventory`, `allow_negative_stock`, `default_low_stock_threshold`), automated reminders (`reminder_enabled`, `reminder_days_before`, `reminder_on_due_date`, `reminder_overdue_days`), SMTP fields | Authenticated users have read access; only Administrators can mutate. Atomic sequential numbers managed via RPC functions `get_next_invoice_number()` and `get_next_receipt_number()`. |
| **`public.inventory`** | Products, goods, and billable services catalog | `id` (UUID PK), `code` (SKU Unique), `name`, `description`, `category`, `type` (`'Product'`, `'Service'`), `unit_price`, `cost_price`, `track_stock`, `quantity_in_stock`, `low_stock_threshold`, `image_url`, `status` (`'Active'`, `'Archived'`, `'Draft'`), `barcode` | Full access for authenticated staff; anonymous/customer read access for public offerings. |
| **`public.client_change_requests`** | Formal audit trail of customer profile modification proposals | `id` (UUID PK), `customer_id`, `requested_by`, `status` (`'Pending'`, `'Approved'`, `'Rejected'`), `reason`, `current_data` (JSONB), `requested_data` (JSONB), `reviewed_by`, `reviewer_name`, `review_notes`, timestamps | Admins & Staff review, approve, or reject; Customers can insert proposals and view their own history. |
| **`public.events`** | Team calendar events, appointments, and deadlines | `id` (UUID PK), `subject`, `description`, `starts_on`, `ends_on`, `all_day`, `event_type` (`'Public'`, `'Private'`), `status` (`'Open'`, `'Completed'`, `'Cancelled'`), `location`, `color`, `attending`, `reference_doctype`, `reference_docname`, `owner`, `event_participants` (JSONB) | Staff full access; Customers can view public events or events where they are listed as participant. |
| **`public.tasks`** | Operational team tasks and action items | `id` (UUID PK), `title`, `description`, `status` (`'Backlog'`, `'Todo'`, `'In Progress'`, `'Completed'`, `'Cancelled'`), `priority` (`'Low'`, `'Medium'`, `'High'`, `'Urgent'`), `due_date`, `reference_doctype`, `reference_id`, `assigned_to`, `created_by`, `completed_at` | Authenticated staff workspace access. |
| **`public.contacts`** | Client secondary contact stakeholders | `id` (UUID PK), `first_name`, `last_name`, `full_name` (Generated column), `email`, `phone`, `mobile_no`, `job_title`, `customer_id`, `is_primary`, `owner_id` | Authenticated staff workspace access. |
| **`public.leads`** | Prospect pipeline records | `id` (UUID PK), `first_name`, `last_name`, `lead_name`, `email`, `phone`, `organization`, `customer_id`, `status` (`'New'`, `'Contacted'`, `'Qualified'`, `'Lost'`), `source`, `converted`, `lead_owner` | Authenticated staff workspace access. |
| **`public.deals`** | Sales opportunities pipeline | `id` (UUID PK), `name`, `deal_value`, `currency`, `status` (`'Qualification'`, `'Demo'`, `'Proposal'`, `'Won'`, `'Lost'`), `pipeline`, `customer_id`, `expected_close_date`, `probability`, `lost_reason`, `deal_owner` | Authenticated staff workspace access. |
| **`public.notes`** | Rich-text internal notes attached to entities | `id` (UUID PK), `title`, `content`, `reference_doctype`, `reference_id`, `created_by` | Authenticated staff workspace access. |
| **`public.activities`** | Unified chronological timeline audit events | `id` (UUID PK), `activity_type` (`'note'`, `'call'`, `'email'`, `'task'`, `'status_change'`), `subject`, `description`, `reference_doctype`, `reference_id`, `metadata` (JSONB), `created_by` | Authenticated staff workspace access. |
| **`storage.buckets` (`crm-assets`)** | Media storage bucket for uploaded assets | `crm-assets` (5 MB max size, allowed types: PNG, JPEG, WEBP, SVG) | Public read; authenticated upload/mutation for logos, avatars, and attachments. |

---

## 4. Complete Catalog of UI Tables & Data Grids

| Screen | Table / Data Grid | Displayed Columns & Fields | Key User Actions |
|---|---|---|---|
| **Executive Dashboard** | Overdue Invoices Watchlist | Invoice #, Client Name, Due Date, Balance Due | 1-Click "Remind" button, View Reminders link |
| **Executive Dashboard** | Recent Cash Settlements | Receipt Ref, Client Name, Payment Date, Method, Amount Settled | "All Transactions" shortcut |
| **Clients** | All Clients Master Table | Organization / Entity (Logo, Name, Industry), Primary Contact (Name, Email, Phone), CRN / Tax ID, Location, Payment Terms, Status | View 360 Profile, Edit, Issue Invoice, Delete |
| **Clients** | Pending Approvals Table | Customer Name, Field Changed, Previous Value, Requested Value, Submission Reason | 1-Click Approve (updates record) or Reject with Review Notes |
| **Clients** | Change Request History Table | Customer Name, Reviewed Date, Reviewer Name, Status Badge, Review Notes | Audit review |
| **Client 360 Detail** | Client Invoices Ledger | Invoice #, Issue Date, Due Date, Total Amount, Balance Due, Status Pill | Click to open Invoice Detail, Pay, Print |
| **Invoices** | Invoices Master Table | Invoice #, Client / Organization, Issue Date, Due Date & Countdown Badge, Total Amount, Balance Due, Status Pill | Row click to view/edit, Record Payment, Send Reminder, Preview/Print |
| **Invoice Detail** | Invoice Line Items Grid | Code / SKU, Product/Service Name, Description, Quantity, Unit Price, Taxable Toggle, Amount | Add Line Item, Select from Inventory, Remove Item, Auto-Calculate Totals |
| **Invoice Detail** | Payment History Table | Payment Date, Receipt #, Transaction Ref, Settlement Method, Amount, Status | View Official Commercial Receipt |
| **Transactions** | Cash Receipts Ledger | Transaction Ref, Client, Related Invoice Link, Payment Date, Method, Amount (+Green), Status | View/Print Commercial Receipt |
| **Inventory** | Inventory & Services Table | Item & SKU (Thumbnail, Name, Code), Category, Type Badge, Selling Price, Gross Margin % (Admin only), Stock Level / Low-Stock Badge | Edit Item, Quick Stock Adjustment, Delete Item |
| **Payment Reminders** | Active Reminder Queue | Invoice #, Client / Debtor, Due Date & Countdown Badge, Balance Due, Reminders Sent Count, Auto-Reminders Toggle | Send Reminder Now (modal), View Invoice, Send via WhatsApp |
| **Payment Reminders** | Automated Reminder Logs | Invoice #, Client Email, Scheduled Stage, Sent Timestamp, Status | Review automated dispatch history |
| **Calendar** | Agenda / Event Schedule View | Date, Start & End Time, Event Subject, Participants, Location, Status | Click to edit, double-click to view details, create new event |
| **Tasks** | Tasks Data Table (List View) | Title, Status Icon, Priority Badge, Assigned Staff Avatar, Due Date, Linked Record | Check off task, click to open detail drawer, change status |
| **Business Settings** | Staff Accounts Table | Staff Member (Avatar, Name), Email, Assigned Role Dropdown (*Staff* vs. *Administrator*), Access Area Badge | Change Role, Update Avatar, Remove / Deactivate |
| **Customer Dashboard** | Recent Customer Invoices Table | Invoice #, Issue Date, Due Date, Total Amount, Balance, Status | Pay Now, View Receipt |
| **Customer Purchases** | Customer Invoices & Receipts Ledger | Invoice Number, Issue Date, Due Date, Total, Paid, Balance, Status Badge | Pay Now (if balance > 0), View / Download Commercial Receipt |
| **Customer Calendar** | Scheduled Dates & Deadlines Timeline | Month/Day Badge, Event Title, Status Badge, Description, Amount, Linked Invoice Ref | Track upcoming payment deadlines and renewal milestones |
| **Customer Account** | Customer Change Request History | Request Date, Reason / Summary, Proposed Data Diffs, Review Status Badge, Reviewer Notes | Track status of submitted profile and tax updates |
