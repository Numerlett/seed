# SEED — User Guide

SEED is a full business management platform for small and medium businesses. It covers everything from inventory and invoicing to accounting, GST compliance, manufacturing, and CRM — all in one place.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Navigation](#2-navigation)
3. [Business Management](#3-business-management)
4. [Dashboard](#4-dashboard)
5. [Inventory](#5-inventory)
6. [Warehouses](#6-warehouses)
7. [Purchases](#7-purchases)
8. [Sales](#8-sales)
9. [Parties — Customers & Suppliers](#9-parties--customers--suppliers)
10. [Returns](#10-returns)
11. [Stock Operations](#11-stock-operations)
12. [Batch Management](#12-batch-management)
13. [Accounting](#13-accounting)
14. [Payments](#14-payments)
15. [Banking](#15-banking)
16. [Manufacturing](#16-manufacturing)
17. [CRM](#17-crm)
18. [Tax & GST](#18-tax--gst)
19. [Reports](#19-reports)
20. [Communications](#20-communications)
21. [Account Settings](#21-account-settings)

---

## 1. Getting Started

### Creating an Account

SEED uses **passwordless email login** — there are no passwords to remember.

1. Go to the SEED login page.
2. Enter your email address and click **Send OTP**.
3. Check your inbox for a 6-digit one-time code (valid for 5 minutes).
4. Enter the code on the verification screen.
5. You are now logged in. Your session lasts 1 hour; it refreshes automatically as long as you are active.

You can also log in with **Google** by clicking the Google button on the login screen. This skips the OTP step entirely.

### Logging Out

Click your avatar in the top-right corner of the header, then select **Sign out**. You can also log out from **Account Settings → Security**.

---

## 2. Navigation

The **sidebar** on the left side is your main navigation tool.

- **Collapsed state** — the sidebar shows icons with short labels underneath. Hover over it to expand it and see full names.
- **Pinned state** — click the expand toggle (pin icon) to keep the sidebar open permanently.
- The **active page** is highlighted with a filled icon background.
- At the very top of the sidebar is the **Business Switcher** — use it to switch between businesses or create a new one.

### Full Navigation Menu

| Section | What it covers |
|---|---|
| Dashboard | Overview metrics |
| Inventory | Products and categories |
| Warehouses | Storage locations |
| Purchases | Purchase orders and goods receipts |
| Sales | Sale invoices |
| Parties | Customers and suppliers |
| Returns | Sales and purchase returns |
| Stock Ops | Adjustments, transfers, damage reports |
| Batches | Batch/lot tracking and expiry |
| Accounting | Ledger, journals, financial statements |
| Payments | Receive and make payments |
| Banking | Bank accounts and balances |
| Manufacturing | Bills of materials and work orders |
| CRM | Leads pipeline and tasks |
| Tax & GST | E-invoices, e-way bills, GSTR returns |
| Reports | Operational reports |
| Analytics | Business analytics |
| Settings | Business and app settings |

---

## 3. Business Management

SEED supports **multiple businesses** under a single account. You can be a member of several businesses and switch between them instantly.

### Creating a Business

1. Open the **Business Switcher** at the top of the sidebar.
2. Click **Add New Business**.
3. Enter a name for your business and confirm.
4. The new business becomes your active context immediately.

### Switching Businesses

Click the Business Switcher dropdown and select any business from the list. All data on screen refreshes to show that business's records.

### Business Roles

Every business member has a role (e.g. Owner, Admin, Member). Roles control what actions you can perform within that business.

---

## 4. Dashboard

**Path:** `/dashboard`

The Dashboard gives you a live snapshot of your business at a glance.

| Metric | What it shows |
|---|---|
| Total Products | Number of active products in inventory |
| Total Customers | Number of customer parties |
| Total Suppliers | Number of supplier parties |

Each card links directly to the relevant section so you can drill down immediately.

---

## 5. Inventory

**Path:** `/inventory`

Inventory is the central catalogue of everything your business sells, buys, or uses. Each item can be a **physical product** or a **service**.

### Inventory Overview

The inventory page shows:
- **Items count** — total products in the catalogue
- **Categories count** — with a link to manage categories
- **Products table** — searchable, filterable list of all products

### Adding a Product

Click **Add Item** in the top-right corner. Fill in the sections below:

#### Product Image
Drag-and-drop or click to upload a product image. Only image files are accepted. You can remove the image before saving.

#### Basic Information

| Field | Required | Description |
|---|---|---|
| Product Name | Yes | Display name for the product |
| Description | No | Detailed description |
| SKU | Yes | Stock Keeping Unit — your internal code for this item |
| Barcode | No | Barcode number (EAN, UPC, etc.) |
| Category | No | Assign to an existing category or create a new one inline |

#### Specifications

| Field | Description |
|---|---|
| Brand | Manufacturer or brand name |
| Model | Model number or variant identifier |
| Color | Color variant |
| Size | Size variant |
| Weight | Weight in kilograms |
| Dimensions | L × W × H in centimetres (e.g. `10x20x30`) |

#### Attachments
Upload one or more files (PDF datasheets, certificates, etc.) as supporting documents. Click **Add Attachment** to pick files, or add multiple at once. Each attachment can be removed individually.

#### Units

| Field | Description |
|---|---|
| Primary Unit | Main unit of measure (e.g. `pcs`, `kg`, `liters`) |
| Secondary Unit | Alternate unit (e.g. `box`, `dozen`) |
| Unit Conversion | How many primary units make one secondary unit |

#### Inventory & Pricing

| Field | Required | Description |
|---|---|---|
| Current Stock Level | Yes | Opening stock when adding the product |
| Minimum Stock Level | No | Alert threshold — triggers low-stock warnings |
| Maximum Stock Level | No | Upper cap for stocking guidance |
| Reorder Level | No | The level at which you should reorder |
| Cost Price | Yes | What you pay to procure this item |
| Selling Price | Yes | Your standard selling price |
| MRP | No | Maximum Retail Price printed on the product |
| Tax Rate (%) | No | Default GST / tax percentage for this item |
| Discount Rate (%) | No | Default discount applied on sales |

#### Settings (Toggles)

| Toggle | What it does |
|---|---|
| Active | When off, the product is hidden from sales and purchases |
| Service Item | Marks the product as a service — no physical stock tracked |
| Allow Negative Stock | Lets stock go below zero when selling |

### Viewing & Editing a Product

Click any row in the products table to open the **Product Detail Sheet** on the right. You can review all product details, see batch information, and view the product's stock ledger (full movement history).

### Categories

**Path:** `/inventory/categories`

Categories group related products together.

- Click **Add Category** to create a new category.
- You can also create categories inline while adding a product.
- Each category card shows its name. Click the edit icon to rename it, or delete it if it has no products assigned.

---

## 6. Warehouses

**Path:** `/warehouses`

Warehouses are physical or logical storage locations. Every stock movement (purchase receipt, sale dispatch, transfer) is tied to a specific warehouse.

### Managing Warehouses

The warehouses table lists all locations for your business. You can:
- **Add a warehouse** — provide a name and optional address/description.
- **Edit a warehouse** — update its name or details.
- **Delete a warehouse** — only possible if no stock or transactions reference it.

Warehouses appear in dropdown selectors throughout the app (sales invoices, purchase GRNs, stock transfers, etc.).

---

## 7. Purchases

**Path:** `/purchases`

The Purchases section handles buying goods from suppliers — from raising a purchase order to receiving the goods.

### Purchase Orders

A **Purchase Order (PO)** is a formal request sent to a supplier listing what you want to buy, quantities, and prices.

**To create a Purchase Order:**

1. Click **New Order**.
2. Fill in:
   - **Document Number** (optional — auto-generated if left blank)
   - **Supplier** — select from your supplier list
   - **Warehouse** — where the goods will be received
   - **Order Date** and **Expected Delivery Date**
   - **Notes** (optional)
3. Add line items: for each item select the **Product**, enter the **Quantity** and **Unit Price**.
4. Click **Add Item** to add more lines; click the trash icon to remove a line.
5. Click **Create Purchase Order**.

The PO appears in the **Purchase Orders** tab. Click any row to open the detail sheet and see full line-item breakdowns, status, and linked GRNs.

### Goods Receipt Notes (GRN)

A **GRN** records the actual goods you received against a purchase order (or independently).

**To create a GRN:**

1. Click **New GRN**.
2. Fill in:
   - **Document Number** (optional)
   - **Supplier**
   - **Receiving Warehouse** — stock is added here
   - **Received Date**
   - **Purchase Order** (optional — link to an existing PO)
   - **Notes** (optional)
3. Add received items: for each item select the **Product**, enter the **Quantity Received** and **Unit Price**.
4. Click **Create GRN**.

Creating a GRN **automatically increases stock** in the selected warehouse.

The GRNs tab lists all receipts. Click any row to view the full detail sheet.

---

## 8. Sales

**Path:** `/sales`

Sales invoices record what you sold to customers, at what price, and deduct that quantity from your warehouse stock.

### Creating a Sale Invoice

1. Click **New Invoice**.
2. Fill in:
   - **Document Number** (optional — auto-generated if blank)
   - **Customer** — select from your customer list
   - **Warehouse** — stock is deducted from here
   - **Invoice Date**
   - **Due Date** (optional — for tracking payment terms)
   - **Notes** (optional)
3. Add line items. For each line:
   - Select the **Product**
   - Set the **Quantity**
   - Set the **Unit Price**
   - Set the **Tax %** (defaults from the product's tax rate)
   - Set the **Discount %** (optional)
4. Click **Add Item** for additional lines; trash icon removes a line.
5. Click **Create Sale Invoice**.

Creating an invoice **automatically reduces stock** from the selected warehouse.

### Viewing Invoices

The sales table lists all invoices with their document number, customer, date, and status. Click a row to open the **Invoice Detail Sheet** with full line-item, tax, and discount breakdowns.

---

## 9. Parties — Customers & Suppliers

**Path:** `/parties/customers` and `/parties/suppliers`

A **Party** is any external entity you transact with. Customers are parties you sell to; suppliers are parties you buy from.

### Adding a Party

1. Navigate to **Parties** and select the **Customers** or **Suppliers** tab.
2. Click **Add**.
3. Fill in:
   - **Name** (required)
   - **Email**, **Phone**, **GSTIN** (optional)
   - **Address fields** — street, city, state, pin code, country
4. Save.

### Party Detail Sheet

Click any party row to open the detail panel. It shows:
- Contact information
- Address
- A history of all transactions linked to this party (invoices, payments, returns)

You can edit or delete a party from the detail sheet.

---

## 10. Returns

**Path:** `/returns`

Returns lets you record goods coming back from customers (sales returns) or goods you're sending back to suppliers (purchase returns). Both types automatically adjust stock.

### Sales Returns

A sales return records goods a customer has sent back.

1. Click **New Sales Return**.
2. Select the **Customer** and the original **Sale Invoice** being returned against.
3. Set the **Return Date** and optional **Notes**.
4. Add return items — select the **Product** and enter the **Quantity Returned**.
5. Submit. Stock is **added back** to the warehouse.

### Purchase Returns

A purchase return records goods you are returning to a supplier.

1. Click **New Purchase Return**.
2. Select the **Supplier** and the original **GRN** being returned against.
3. Set the **Return Date** and optional **Notes**.
4. Add return items — select the **Product** and enter the **Quantity Returned**.
5. Submit. Stock is **deducted** from the warehouse.

Both tabs show a table of all past returns. Click a row to see full details.

---

## 11. Stock Operations

**Path:** `/stock-ops`

Stock Operations is the hub for all internal stock movements that don't involve a sale or purchase.

### Overview

The page shows:
- **Inventory Valuation** — total value of stock on hand
- Quick links to **Adjustments**, **Transfers**, and **Damage Reports**
- **Low Stock Alerts** — products that have fallen at or below their minimum stock level
- **Stock Summary** — a table of every product with its current quantity across warehouses

### Stock Adjustments

**Path:** `/stock-ops/adjustments`

Use adjustments when the physical count doesn't match the system count (e.g. after a stocktake).

1. Click **New Adjustment**.
2. Select the **Warehouse** being adjusted.
3. Set the **Adjustment Date** and optionally a **Reason**.
4. Add items: for each product, enter the **Adjusted Quantity** (can be positive to add stock or negative to reduce it) and a **Notes** field.
5. Submit.

### Stock Transfers

**Path:** `/stock-ops/transfers`

Move stock from one warehouse to another without it leaving your business.

1. Click **New Transfer**.
2. Select the **Source Warehouse** and the **Destination Warehouse**.
3. Set the **Transfer Date** and optional **Notes**.
4. Add items: select each **Product** and enter the **Quantity** to move.
5. Submit. Stock is deducted from source and added to destination immediately.

### Damage Reports

**Path:** `/stock-ops/damage-reports`

Record stock that has been damaged and can no longer be sold.

1. Click **New Damage Report**.
2. Select the **Warehouse**, the **Report Date**, and an optional **Reason**.
3. Add items: select each **Product** and enter the **Quantity Damaged**.
4. Submit. That quantity is removed from available stock.

---

## 12. Batch Management

**Path:** `/batches`

Batches (also called lots) let you track groups of stock that share a common manufacture date, expiry date, or batch number. This is essential for food, pharmaceuticals, and any perishable goods.

### Product Batches Tab

Displays all batches grouped by product. For each product you can:
- View existing batches with their batch number, manufacture date, expiry date, and current quantity.
- **Add a batch** by providing a batch number and the relevant dates and quantity.
- Click a batch row to open the **Batch Detail Sheet** showing its full history.

### Expiring Batches Tab

A focused view showing only batches approaching or past their expiry date. Use this to prioritise selling or disposing of expiring stock before it becomes a write-off.

---

## 13. Accounting

**Path:** `/accounting`

SEED uses a **double-entry bookkeeping** system. Every sale, purchase, payment, and journal entry is automatically recorded in the ledger.

### Chart of Accounts

**Path:** `/accounting/chart-of-accounts`

The chart of accounts is the complete list of ledger accounts (Assets, Liabilities, Equity, Income, Expenses). You can:
- Browse all accounts organised by type.
- Add custom accounts to the chart.
- View the balance of each account.

### Journal Entries

**Path:** `/accounting/journal`

Post manual debit/credit entries for transactions that don't go through sales, purchases, or payments (e.g. opening balances, depreciation, accruals).

1. Click **New Journal Entry**.
2. Enter the **Date** and a **Description / Narration**.
3. Add lines — each line has an **Account**, a **Debit** amount or a **Credit** amount, and an optional description.
4. Total debits must equal total credits before you can save.

### Trial Balance

**Path:** `/accounting/trial-balance`

Shows the closing debit and credit balance for every account as of a selected date. Use it to verify that your books are balanced and as a starting point for financial statements.

### Profit & Loss (Income Statement)

**Path:** `/accounting/pnl`

Shows your revenue, cost of goods sold, gross profit, operating expenses, and net profit for a chosen period. Filter by date range to see any period.

### Balance Sheet

**Path:** `/accounting/balance-sheet`

A snapshot of your assets, liabilities, and equity as of a specific date. Assets must equal Liabilities + Equity — if they don't, there is an unbalanced entry in your books.

---

## 14. Payments

**Path:** `/payments`

Payments records money actually moving in or out of your business — separate from the invoice itself. An invoice can be outstanding (unpaid) or settled (fully or partially paid).

### Receiving a Payment

**Path:** `/payments/receive`

Record money received from a customer.

1. Click **Receive Payment**.
2. Fill in:
   - **Customer** (Party)
   - **Payment Method** (Cash, Bank Transfer, Cheque, UPI, etc.)
   - **Amount**
   - **Date**
   - **Reference** (optional — cheque number, UTR, etc.)
   - **Notes** (optional)
3. Save. The payment appears in the list with a **RECEIVED** badge.

### Making a Payment

**Path:** `/payments/make`

Record money paid to a supplier.

1. Click **Make Payment**.
2. Fill in the same fields as above but select a **Supplier** as the party.
3. Save. The payment appears with a **PAID** badge.

### Payment Statuses

| Status | Meaning |
|---|---|
| PENDING | Payment recorded but not yet confirmed |
| CLEARED | Payment confirmed and settled |
| BOUNCED | Cheque bounced or payment failed |

The payments table is paginated — use **Previous / Next** to move through pages.

---

## 15. Banking

**Path:** `/banking`

Banking lets you track your business bank accounts and their balances in SEED.

### Adding a Bank Account

Click **Add Account** and provide:

| Field | Required | Description |
|---|---|---|
| Account Name | Yes | Friendly name (e.g. "HDFC Current Account") |
| Account Number | Yes | Your bank account number |
| IFSC | Yes | 11-character IFSC code |
| Bank Name | Yes | Name of the bank |
| Branch | No | Branch name or city |
| Opening Balance | No | Starting balance when you first add the account |

Each account card shows the **current balance** as SEED tracks it based on payments recorded.

---

## 16. Manufacturing

**Path:** `/manufacturing`

Manufacturing supports businesses that produce finished goods from raw materials or components.

### Bills of Materials (BOM)

**Path:** `/manufacturing/boms`

A Bill of Materials defines the **recipe** for making a finished product — which components are needed and in what quantities.

- **Create a BOM** by selecting the finished product (output) and listing each component (input) with its quantity.
- BOMs are the basis for work orders.

### Work Orders

**Path:** `/manufacturing/work-orders`

A work order is a production instruction — "make X units of product Y."

- **Create a work order** by selecting the BOM to follow and the target quantity.
- Track the status of each production run (Planned → In Progress → Completed).
- When a work order is completed, raw material stock is consumed and finished goods stock is created.

---

## 17. CRM

**Path:** `/crm`

CRM (Customer Relationship Management) helps you track potential customers (leads) and the follow-up actions needed to convert them.

### Leads Pipeline

**Path:** `/crm/leads`

A lead is a prospective customer who has shown interest but has not yet made a purchase.

- **Add a lead** by entering contact details, the lead source, and an estimated deal value.
- Move leads through pipeline stages: New → Contacted → Qualified → Proposal Sent → Won / Lost.
- The total number of leads is shown on the CRM overview card.

### Tasks

**Path:** `/crm/tasks`

Tasks are to-do items linked to your CRM work — follow-up calls, demos, quote submissions, etc.

- **Create a task** with a title, due date, and optional link to a lead.
- Mark tasks as complete when done.
- Overdue tasks are surfaced so nothing falls through the cracks.

---

## 18. Tax & GST

**Path:** `/tax`

The Tax section handles Indian GST compliance: e-invoicing, e-way bills, and return previews.

### Setup — GST Settings

**Path:** `/tax/settings`

Before using any GST features, configure your GST profile:
- **GSTIN** — your 15-character GST Identification Number
- **Registration Type** — Regular, Composition, etc.
- **State** — your registered state

Once configured, your GSTIN and registration type appear at the top of the Tax page with a green checkmark. If not configured, a yellow alert and a **Setup GST** button are shown.

### E-Invoices

**Path:** `/tax/einvoices`

E-Invoices are mandatory for B2B invoices above a turnover threshold. SEED generates the **IRN (Invoice Reference Number)** for each eligible invoice.

- View all e-invoices and their IRN status.
- Generate an IRN for a pending invoice directly from this screen.
- Cancel an IRN within the permitted window if needed.

### E-Way Bills

**Path:** `/tax/ewaybills`

An e-way bill is required when moving goods above a threshold value.

- Generate an e-way bill for a sale invoice from this screen.
- View all generated e-way bills and their validity dates.

### GSTR-1 Preview

**Path:** `/tax/gstr1`

GSTR-1 is the monthly/quarterly return for outward supplies (your sales).

- Select a **period** (month and year) to preview the data that will be filed.
- The preview shows B2B invoices, B2C invoices, and credit/debit notes organised by the GSTR-1 format.
- Use this to verify data before filing on the GST portal.

### GSTR-3B Preview

**Path:** `/tax/gstr3b`

GSTR-3B is the monthly summary return showing net tax liability.

- Select a **period** to see summarised outward supply, ITC (Input Tax Credit), and net tax payable.
- Verify the figures before manually filing on the GST portal.

---

## 19. Reports

**Path:** `/reports`

Reports give you pre-built views for operational data.

### Sales Register

**Path:** `/reports/sales-register`

A date-filtered list of all confirmed sale invoices for a chosen period, showing document number, customer, date, taxable value, tax, and total.

### Purchase Register

**Path:** `/reports/purchase-register`

A date-filtered list of all confirmed purchase orders for a chosen period, showing document number, supplier, date, and amounts.

### Stock Summary

**Path:** `/reports/stock-summary`

Current stock levels for every product across all warehouses. Shows the product name, unit, and quantity on hand.

### Low Stock Alert

**Path:** `/reports/low-stock`

A filtered view of products whose current stock is at or below their configured **Reorder Level**. Use this to decide what to order next.

---

## 20. Communications

**Path:** `/communications`

Communications manages the messaging layer of SEED — automated and manual messages sent to customers and suppliers via email, SMS, or WhatsApp.

### Templates

**Path:** `/communications/templates`

Message templates are reusable content blocks used for invoices, payment reminders, order confirmations, and other recurring messages.

- **Browse templates** — see all existing templates with their name and channel.
- **Create a template** — give it a name, select the channel (Email / SMS / WhatsApp), and write the message body. You can use placeholders like `{{customer_name}}` or `{{invoice_number}}` that get filled in automatically when the message is sent.
- **Edit a template** — click the template name to update its content.
- **Delete a template** — remove templates no longer needed.

### Message Log

**Path:** `/communications/logs`

A full history of every message SEED has sent — the recipient, channel, template used, timestamp, and delivery status. Use this to troubleshoot delivery issues or confirm a customer received their invoice.

### My Preferences

**Path:** `/communications/preferences`

Control which notifications you personally receive and on which channels (email, SMS, WhatsApp). Toggle each notification type on or off independently per channel.

---

## 21. Account Settings

**Path:** `/account`

Manage your personal profile and security settings.

### Profile Information

- **Display Name** — click **Edit** to change your name, then **Save**.
- **Email Address** — read-only. Email cannot be changed after account creation.
- **Phone Number** — displayed if it was provided during onboarding.

### Security — Active Sessions

Click **View All** next to Login Activity to see every device and browser where your account is currently signed in. You can revoke individual sessions to log out from devices you no longer use.

### Logging Out

Click **Logout** in the top-right of the Account page to sign out of the current session. To sign out of all devices at once, revoke all sessions from the sessions page.

---

## Quick Reference — Common Tasks

| I want to… | Where to go |
|---|---|
| Add a new product | Inventory → Add Item |
| Record stock received from a supplier | Purchases → New GRN |
| Create a sale invoice | Sales → New Invoice |
| Add a customer | Parties → Customers → Add |
| Move stock between warehouses | Stock Ops → Transfers → New Transfer |
| Record damaged goods | Stock Ops → Damage Reports → New |
| Track batch expiry dates | Batches → Expiring Batches |
| Check which products need reordering | Reports → Low Stock Alert |
| Record a payment from a customer | Payments → Receive Payment |
| Add a bank account | Banking → Add Account |
| Generate an e-invoice IRN | Tax & GST → E-Invoices |
| Create a message template | Communications → Templates → New |
| View your financial statements | Accounting → P&L or Balance Sheet |
| Post a manual journal entry | Accounting → Journal Entries |
| Switch to another business | Business Switcher (top of sidebar) |
| Update your name | Account → Profile Information |
