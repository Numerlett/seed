import type { ComponentType } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import {
  Step,
  Steps,
  SubHeading,
  Note,
  FieldTable,
  SimpleTable,
  Prose,
  InlineCode,
} from './ui';

// ─── Getting Started ────────────────────────────────────────────────────────

export function GettingStartedContent() {
  return (
    <div className="space-y-6">
      <SubHeading>Email (OTP) Login</SubHeading>
      <Prose>SEED uses passwordless login — no passwords to remember or reset.</Prose>
      <Steps>
        <Step number={1}>Go to the SEED login page.</Step>
        <Step number={2}>Enter your email address and click <strong>Send OTP</strong>.</Step>
        <Step number={3}>Check your inbox for a 6-digit one-time code. It is valid for 5 minutes with a maximum of 5 attempts.</Step>
        <Step number={4}>Enter the code on the verification screen.</Step>
        <Step number={5}>You are logged in. Your session lasts 1 hour and refreshes automatically while you are active.</Step>
      </Steps>

      <SubHeading>Google Login</SubHeading>
      <Prose>
        Click <strong>Continue with Google</strong> on the login screen to sign in instantly — no OTP required.
      </Prose>

      <SubHeading>Logging Out</SubHeading>
      <Prose>
        Click your avatar in the top-right header and select <strong>Sign out</strong>, or go to <strong>Account Settings</strong> and click <strong>Logout</strong>.
      </Prose>
    </div>
  );
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export function NavigationContent() {
  return (
    <div className="space-y-6">
      <Prose>
        The <strong>sidebar</strong> on the left is your main navigation. It collapses to icons with short labels and expands on hover to show full names. Click the pin icon to keep it permanently expanded.
      </Prose>
      <SimpleTable
        headers={['Section', 'What it covers']}
        rows={[
          ['Dashboard', 'Live business metrics at a glance'],
          ['Inventory', 'Product catalogue and categories'],
          ['Warehouses', 'Storage locations'],
          ['Purchases', 'Purchase orders and goods receipt notes'],
          ['Sales', 'Sale invoices'],
          ['Parties', 'Customers and suppliers'],
          ['Returns', 'Sales and purchase returns'],
          ['Stock Ops', 'Adjustments, transfers, damage reports'],
          ['Batches', 'Batch/lot tracking and expiry dates'],
          ['Accounting', 'Double-entry ledger and financial statements'],
          ['Payments', 'Receive and make payments'],
          ['Banking', 'Bank accounts and current balances'],
          ['Manufacturing', 'Bills of materials and work orders'],
          ['CRM', 'Leads pipeline and follow-up tasks'],
          ['Tax & GST', 'E-invoices, e-way bills, GSTR returns'],
          ['Reports', 'Operational and financial reports'],
          ['Communications', 'Templates, message log, preferences'],
          ['Settings', 'Business and app settings'],
        ]}
      />
    </div>
  );
}

// ─── Businesses ─────────────────────────────────────────────────────────────

export function BusinessesContent() {
  return (
    <div className="space-y-6">
      <Prose>
        SEED supports multiple businesses under a single login. Each business has its own inventory, transactions, and members. Switch between them instantly using the <strong>Business Switcher</strong> at the top of the sidebar.
      </Prose>

      <SubHeading>Creating a Business</SubHeading>
      <Steps>
        <Step number={1}>Open the Business Switcher dropdown at the top of the sidebar.</Step>
        <Step number={2}>Click <strong>Add New Business</strong>.</Step>
        <Step number={3}>Enter a name and confirm. The new business becomes your active context immediately.</Step>
      </Steps>

      <SubHeading>Switching Businesses</SubHeading>
      <Prose>
        Open the Business Switcher and click any business in the list. All data on screen refreshes to that business.
      </Prose>

      <Note>
        <strong>Roles:</strong> Every member of a business has a role (Owner, Admin, Member) that controls which actions they can perform within that business.
      </Note>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function DashboardContent() {
  return (
    <div className="space-y-6">
      <Prose>
        The Dashboard shows live summary cards for your active business. Each card links directly to the relevant section so you can drill down immediately.
      </Prose>
      <SimpleTable
        headers={['Card', 'What it shows']}
        rows={[
          ['Total Products', 'Number of active items in your inventory'],
          ['Total Customers', 'Number of customer parties'],
          ['Total Suppliers', 'Number of supplier parties'],
        ]}
      />
    </div>
  );
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export function InventoryContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Inventory is the master catalogue of every product or service your business uses. The page shows the total item count, category count, and a searchable products table.
      </Prose>

      <SubHeading>Adding a Product</SubHeading>
      <Prose>
        Click <strong>Add Item</strong> in the top-right. The form is divided into sections:
      </Prose>

      <p className="text-sm font-semibold">Product Image</p>
      <Prose>
        Drag-and-drop or click to upload an image. Remove it before saving with the × button.
      </Prose>

      <p className="text-sm font-semibold mt-4">Basic Information</p>
      <FieldTable
        rows={[
          { field: 'Product Name', required: true, description: 'Display name used across invoices and reports' },
          { field: 'Description', required: false, description: 'Detailed product description' },
          { field: 'SKU', required: true, description: 'Your internal stock-keeping code — must be unique' },
          { field: 'Barcode', required: false, description: 'EAN, UPC, or any barcode number' },
          { field: 'Category', required: false, description: 'Assign to an existing category, or create one inline with the + button' },
        ]}
      />

      <p className="text-sm font-semibold mt-4">Specifications</p>
      <FieldTable
        rows={[
          { field: 'Brand', required: false, description: 'Manufacturer or brand name' },
          { field: 'Model', required: false, description: 'Model number or variant' },
          { field: 'Color', required: false, description: 'Color variant' },
          { field: 'Size', required: false, description: 'Size variant' },
          { field: 'Weight', required: false, description: 'Weight in kilograms' },
          { field: 'Dimensions', required: false, description: 'L × W × H in cm, e.g. 10x20x30' },
        ]}
      />

      <p className="text-sm font-semibold mt-4">Units</p>
      <FieldTable
        rows={[
          { field: 'Primary Unit', required: false, description: 'Main unit of measure: pcs, kg, liters, etc.' },
          { field: 'Secondary Unit', required: false, description: 'Alternate unit, e.g. box or dozen' },
          { field: 'Unit Conversion', required: false, description: 'How many primary units equal one secondary unit' },
        ]}
      />

      <p className="text-sm font-semibold mt-4">Inventory & Pricing</p>
      <FieldTable
        rows={[
          { field: 'Current Stock Level', required: true, description: 'Opening stock when you first add this product' },
          { field: 'Minimum Stock Level', required: false, description: 'Triggers a low-stock alert when stock falls here' },
          { field: 'Maximum Stock Level', required: false, description: 'Upper cap for stocking guidance' },
          { field: 'Reorder Level', required: false, description: 'The point at which you should place a new order' },
          { field: 'Cost Price', required: true, description: 'What you pay to procure this item' },
          { field: 'Selling Price', required: true, description: 'Your standard sale price' },
          { field: 'MRP', required: false, description: 'Maximum Retail Price printed on the product' },
          { field: 'Tax Rate (%)', required: false, description: 'Default GST/tax percentage for this item' },
          { field: 'Discount Rate (%)', required: false, description: 'Default discount applied on sales' },
        ]}
      />

      <p className="text-sm font-semibold mt-4">Settings</p>
      <SimpleTable
        headers={['Toggle', 'What it does']}
        rows={[
          ['Active', 'When off, the product is hidden from all transactions'],
          ['Service Item', 'Marks as a service — no physical stock is tracked'],
          ['Allow Negative Stock', 'Permits stock to go below zero when selling'],
        ]}
      />

      <SubHeading>Attachments</SubHeading>
      <Prose>
        Upload supporting files (PDFs, datasheets, certificates) in the Attachments section. Click <strong>Add Attachment</strong> to pick one or multiple files. Each can be removed individually before saving.
      </Prose>

      <SubHeading>Viewing & Editing a Product</SubHeading>
      <Prose>
        Click any row in the products table to open the <strong>Product Detail Sheet</strong>. From there you can see all details, batch information, and the complete stock movement ledger for that product.
      </Prose>

      <SubHeading>Categories</SubHeading>
      <Prose>
        Go to <strong>Inventory → Categories</strong> to manage product groups. Click <strong>Add Category</strong> to create one, or create a category inline while adding a product.
      </Prose>
    </div>
  );
}

// ─── Warehouses ─────────────────────────────────────────────────────────────

export function WarehousesContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Warehouses are physical or logical storage locations. Every stock movement — purchase receipt, sale dispatch, stock transfer — is tied to a specific warehouse.
      </Prose>
      <Prose>
        From the Warehouses page you can <strong>add</strong> a warehouse (name + optional address/description), <strong>edit</strong> its details, or <strong>delete</strong> it (only possible when no stock or transactions reference it). Warehouses appear in selectors throughout the app.
      </Prose>
    </div>
  );
}

// ─── Purchases ──────────────────────────────────────────────────────────────

export function PurchasesContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Purchases handles buying from suppliers — from raising a formal order to physically receiving and counting the goods.
      </Prose>

      <SubHeading>Purchase Orders</SubHeading>
      <Prose>
        A Purchase Order (PO) is a formal request to a supplier. Click <strong>New Order</strong>:
      </Prose>
      <FieldTable
        rows={[
          { field: 'Document Number', required: false, description: 'Auto-generated if left blank' },
          { field: 'Supplier', required: true, description: 'Select from your supplier list' },
          { field: 'Warehouse', required: true, description: 'Where the goods will be received' },
          { field: 'Order Date', required: true, description: 'Date the order is raised' },
          { field: 'Expected Delivery', required: false, description: 'When you expect the goods to arrive' },
          { field: 'Notes', required: false, description: 'Internal notes or supplier instructions' },
        ]}
      />
      <Prose>
        Add line items: for each item pick the <strong>Product</strong>, enter <strong>Quantity</strong> and <strong>Unit Price</strong>. Use <strong>Add Item</strong> for more lines; the trash icon removes a line.
      </Prose>

      <SubHeading>Goods Receipt Notes (GRN)</SubHeading>
      <Prose>
        A GRN records what was actually received. Click <strong>New GRN</strong>:
      </Prose>
      <FieldTable
        rows={[
          { field: 'Document Number', required: false, description: 'Auto-generated if left blank' },
          { field: 'Supplier', required: true, description: 'Who you received the goods from' },
          { field: 'Receiving Warehouse', required: true, description: 'Stock is added to this warehouse on save' },
          { field: 'Received Date', required: true, description: 'Date the goods arrived' },
          { field: 'Purchase Order', required: false, description: 'Optionally link to an existing PO' },
          { field: 'Notes', required: false, description: 'Internal notes' },
        ]}
      />
      <Note>
        Saving a GRN <strong>automatically increases stock</strong> in the selected warehouse.
      </Note>
    </div>
  );
}

// ─── Sales ──────────────────────────────────────────────────────────────────

export function SalesContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Sales invoices record what you sold, to whom, at what price — and automatically deduct that quantity from your warehouse stock.
      </Prose>

      <SubHeading>Creating a Sale Invoice</SubHeading>
      <Prose>Click <strong>New Invoice</strong>:</Prose>
      <FieldTable
        rows={[
          { field: 'Document Number', required: false, description: 'Auto-generated if left blank' },
          { field: 'Customer', required: false, description: 'Select from your customer list' },
          { field: 'Warehouse', required: true, description: 'Stock is deducted from this warehouse on save' },
          { field: 'Invoice Date', required: true, description: 'Date of the invoice' },
          { field: 'Due Date', required: false, description: 'Payment due date for tracking outstanding amounts' },
          { field: 'Notes', required: false, description: 'Notes stored with or printed on the invoice' },
        ]}
      />
      <Prose>
        Add line items — for each item select the <strong>Product</strong>, set <strong>Quantity</strong>, <strong>Unit Price</strong>, <strong>Tax %</strong>, and <strong>Discount %</strong>. Click <strong>Add Item</strong> for more lines.
      </Prose>
      <Note>
        Saving a sale invoice <strong>automatically reduces stock</strong> from the selected warehouse.
      </Note>

      <SubHeading>Viewing Invoices</SubHeading>
      <Prose>
        Click any row in the invoices table to open the <strong>Invoice Detail Sheet</strong> with a full breakdown of line items, taxes, discounts, and totals.
      </Prose>
    </div>
  );
}

// ─── Parties ────────────────────────────────────────────────────────────────

export function PartiesContent() {
  return (
    <div className="space-y-6">
      <Prose>
        A <strong>Party</strong> is any external entity you transact with. Customers are parties you sell to; suppliers are parties you buy from. Navigate to <strong>Parties → Customers</strong> or <strong>Parties → Suppliers</strong>.
      </Prose>

      <SubHeading>Adding a Party</SubHeading>
      <Steps>
        <Step number={1}>Click <strong>Add</strong>.</Step>
        <Step number={2}>Enter their <strong>Name</strong> (required), and optionally their <strong>Email</strong>, <strong>Phone</strong>, and <strong>GSTIN</strong>.</Step>
        <Step number={3}>Fill in their address fields: street, city, state, pin code, country.</Step>
        <Step number={4}>Save.</Step>
      </Steps>

      <SubHeading>Party Detail Sheet</SubHeading>
      <Prose>
        Click any party row to see their full contact information, address, and a history of all transactions (invoices, payments, returns) linked to that party. You can also edit or delete the party from here.
      </Prose>
    </div>
  );
}

// ─── Returns ────────────────────────────────────────────────────────────────

export function ReturnsContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Returns lets you record goods coming back from customers (sales returns) or goods you are sending back to suppliers (purchase returns). Both types automatically adjust stock.
      </Prose>

      <SubHeading>Sales Returns</SubHeading>
      <Prose>A customer sends goods back to you.</Prose>
      <Steps>
        <Step number={1}>Click <strong>New Sales Return</strong>.</Step>
        <Step number={2}>Select the <strong>Customer</strong> and the original <strong>Sale Invoice</strong>.</Step>
        <Step number={3}>Set the <strong>Return Date</strong> and optional notes.</Step>
        <Step number={4}>Add each returned product and its quantity.</Step>
        <Step number={5}>Submit. Stock is <strong>added back</strong> to the warehouse.</Step>
      </Steps>

      <SubHeading>Purchase Returns</SubHeading>
      <Prose>You send goods back to a supplier.</Prose>
      <Steps>
        <Step number={1}>Click <strong>New Purchase Return</strong>.</Step>
        <Step number={2}>Select the <strong>Supplier</strong> and the original <strong>GRN</strong>.</Step>
        <Step number={3}>Set the <strong>Return Date</strong> and optional notes.</Step>
        <Step number={4}>Add each returned product and its quantity.</Step>
        <Step number={5}>Submit. Stock is <strong>deducted</strong> from the warehouse.</Step>
      </Steps>
    </div>
  );
}

// ─── Stock Ops ──────────────────────────────────────────────────────────────

export function StockOpsContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Stock Operations covers internal movements that don't involve a sale or purchase. The overview page shows your total <strong>Inventory Valuation</strong>, <strong>Low Stock Alerts</strong>, and a full <strong>Stock Summary</strong> table.
      </Prose>

      <SubHeading>Stock Adjustments</SubHeading>
      <Prose>
        Use after a stocktake when the physical count doesn't match the system. Click <strong>New Adjustment</strong>, select the warehouse and date, then add each product with a <em>positive</em> quantity to add stock or a <em>negative</em> quantity to remove it.
      </Prose>

      <SubHeading>Stock Transfers</SubHeading>
      <Prose>
        Move stock between two of your own warehouses. Click <strong>New Transfer</strong>, choose the <strong>Source</strong> and <strong>Destination</strong> warehouses, add products and quantities, then submit. Stock moves immediately.
      </Prose>

      <SubHeading>Damage Reports</SubHeading>
      <Prose>
        Record goods that can no longer be sold. Click <strong>New Damage Report</strong>, select the warehouse and date, add the affected products and quantities, then submit. That quantity is permanently removed from available stock.
      </Prose>
    </div>
  );
}

// ─── Batches ────────────────────────────────────────────────────────────────

export function BatchesContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Batches (lots) let you track groups of stock that share a manufacture date, expiry date, or batch number — essential for food, pharmaceuticals, and any perishable goods.
      </Prose>

      <SubHeading>Product Batches Tab</SubHeading>
      <Prose>
        Shows all batches grouped by product. For each product you can view existing batches (batch number, manufacture date, expiry date, current quantity) and add new ones. Click a batch row to see its full movement history.
      </Prose>

      <SubHeading>Expiring Batches Tab</SubHeading>
      <Prose>
        A focused view of batches approaching or past their expiry date. Use this to prioritise selling or disposing of stock before it becomes a write-off.
      </Prose>
    </div>
  );
}

// ─── Accounting ─────────────────────────────────────────────────────────────

export function AccountingContent() {
  return (
    <div className="space-y-6">
      <Prose>
        SEED uses double-entry bookkeeping. Every sale, purchase, payment, and journal entry is automatically posted to the ledger.
      </Prose>

      <SubHeading>Chart of Accounts</SubHeading>
      <Prose>
        The complete list of ledger accounts organised by type (Assets, Liabilities, Equity, Income, Expenses). Browse, add custom accounts, and see the current balance for each.
      </Prose>

      <SubHeading>Journal Entries</SubHeading>
      <Prose>
        Post manual debit/credit entries for things that don't flow through sales or purchases — opening balances, depreciation, accruals.
      </Prose>
      <Steps>
        <Step number={1}>Click <strong>New Journal Entry</strong>.</Step>
        <Step number={2}>Enter the <strong>Date</strong> and a <strong>Description / Narration</strong>.</Step>
        <Step number={3}>Add lines — each line needs an <strong>Account</strong> and either a <strong>Debit</strong> or <strong>Credit</strong> amount.</Step>
        <Step number={4}>Total debits must equal total credits before you can save.</Step>
      </Steps>

      <SubHeading>Trial Balance</SubHeading>
      <Prose>
        Closing debit and credit balances for every account as of a selected date. Use it to verify your books are balanced before generating statements.
      </Prose>

      <SubHeading>Profit & Loss</SubHeading>
      <Prose>
        Your income statement — revenue, cost of goods sold, gross profit, operating expenses, and net profit for a chosen date range.
      </Prose>

      <SubHeading>Balance Sheet</SubHeading>
      <Prose>
        Assets, liabilities, and equity as of a specific date. Assets must equal Liabilities + Equity. If they don't, there is an unbalanced entry in your books.
      </Prose>
    </div>
  );
}

// ─── Payments ───────────────────────────────────────────────────────────────

export function PaymentsContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Payments records actual money movements — separate from the invoice itself. An invoice remains outstanding until a payment is recorded against it.
      </Prose>

      <SubHeading>Receiving a Payment</SubHeading>
      <Prose>
        Click <strong>Receive Payment</strong> to record money received from a customer. Provide the <strong>Customer</strong>, <strong>Amount</strong>, <strong>Payment Method</strong> (Cash, Bank Transfer, Cheque, UPI, etc.), <strong>Date</strong>, and an optional <strong>Reference</strong> (cheque number, UTR).
      </Prose>

      <SubHeading>Making a Payment</SubHeading>
      <Prose>
        Click <strong>Make Payment</strong> to record money paid to a supplier. Fill in the same fields, selecting a <strong>Supplier</strong> as the party.
      </Prose>

      <SubHeading>Payment Statuses</SubHeading>
      <SimpleTable
        headers={['Status', 'Meaning']}
        rows={[
          ['PENDING', 'Recorded but not yet confirmed'],
          ['CLEARED', 'Confirmed and settled'],
          ['BOUNCED', 'Cheque bounced or payment failed'],
        ]}
      />
    </div>
  );
}

// ─── Banking ────────────────────────────────────────────────────────────────

export function BankingContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Track your business bank accounts and their running balances inside SEED. Click <strong>Add Account</strong>:
      </Prose>
      <FieldTable
        rows={[
          { field: 'Account Name', required: true, description: 'Friendly name, e.g. HDFC Current Account' },
          { field: 'Account Number', required: true, description: 'Your bank account number' },
          { field: 'IFSC', required: true, description: '11-character IFSC code' },
          { field: 'Bank Name', required: true, description: 'Name of the bank' },
          { field: 'Branch', required: false, description: 'Branch name or city' },
          { field: 'Opening Balance', required: false, description: 'Starting balance when you first add the account' },
        ]}
      />
      <Prose>
        Each account card displays the <strong>current balance</strong> as SEED tracks it from all recorded payments.
      </Prose>
    </div>
  );
}

// ─── Manufacturing ──────────────────────────────────────────────────────────

export function ManufacturingContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Manufacturing supports businesses that produce finished goods from raw materials or components.
      </Prose>

      <SubHeading>Bills of Materials (BOM)</SubHeading>
      <Prose>
        A BOM defines the <em>recipe</em> for making a finished product — which components are needed and in what quantities. Create one by selecting the finished product (output) and listing each component (input) with its required quantity. BOMs are the basis for work orders.
      </Prose>

      <SubHeading>Work Orders</SubHeading>
      <Prose>
        A work order is a production instruction: "make X units of product Y." Create one by selecting the BOM and the target quantity, then track production through its stages:
      </Prose>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {['Planned', 'In Progress', 'Completed'].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-2">
            <Badge variant={s === 'Completed' ? 'default' : 'outline'}>{s}</Badge>
            {i < arr.length - 1 && <ChevronRight className="text-muted-foreground h-4 w-4" />}
          </span>
        ))}
      </div>
      <Note>
        Completing a work order <strong>consumes raw material stock</strong> and <strong>creates finished goods stock</strong> automatically.
      </Note>
    </div>
  );
}

// ─── CRM ────────────────────────────────────────────────────────────────────

export function CRMContent() {
  return (
    <div className="space-y-6">
      <Prose>
        CRM helps you track potential customers (leads) from first contact to closed sale, and the follow-up actions needed to get there.
      </Prose>

      <SubHeading>Leads Pipeline</SubHeading>
      <Prose>
        A lead is a prospect who has shown interest but hasn't bought yet. Add one with contact details, lead source, and estimated deal value, then move it through pipeline stages:
      </Prose>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Won / Lost'].map((s, i, arr) => (
          <span key={s} className="flex items-center gap-2">
            <Badge variant="outline">{s}</Badge>
            {i < arr.length - 1 && <ChevronRight className="text-muted-foreground h-4 w-4" />}
          </span>
        ))}
      </div>

      <SubHeading>Tasks</SubHeading>
      <Prose>
        Tasks are follow-up actions — calls, demos, quote submissions — optionally linked to a lead. Create a task with a title and due date, and mark it complete when done. Overdue tasks are surfaced so nothing falls through the cracks.
      </Prose>
    </div>
  );
}

// ─── Tax & GST ──────────────────────────────────────────────────────────────

export function TaxContent() {
  return (
    <div className="space-y-6">
      <SubHeading>Setup — GST Settings</SubHeading>
      <Prose>
        Before using any GST feature, configure your profile at <strong>Tax & GST → GST Settings</strong>:
      </Prose>
      <FieldTable
        rows={[
          { field: 'GSTIN', required: true, description: 'Your 15-character GST Identification Number' },
          { field: 'Registration Type', required: true, description: 'Regular, Composition, etc.' },
          { field: 'State', required: true, description: 'Your GST-registered state' },
        ]}
      />
      <Prose>
        Once configured, your GSTIN and registration type appear at the top of the Tax page with a green checkmark. If not configured, a yellow alert and a <strong>Setup GST</strong> button are shown.
      </Prose>

      <SubHeading>E-Invoices</SubHeading>
      <Prose>
        Mandatory for B2B invoices above the turnover threshold. SEED generates the <strong>IRN (Invoice Reference Number)</strong> for each eligible invoice. You can generate, view, and cancel IRNs from this screen within the permitted window.
      </Prose>

      <SubHeading>E-Way Bills</SubHeading>
      <Prose>
        Required when moving goods above the value threshold. Generate an e-way bill for a sale invoice, view all generated bills, and track their validity dates.
      </Prose>

      <SubHeading>GSTR-1 Preview</SubHeading>
      <Prose>
        Monthly/quarterly return for outward supplies. Select a period to preview B2B invoices, B2C invoices, and credit/debit notes in the GSTR-1 format — verify the data <em>before</em> filing on the GST portal.
      </Prose>

      <SubHeading>GSTR-3B Preview</SubHeading>
      <Prose>
        Monthly summary return. Select a period to see outward supply totals, ITC (Input Tax Credit), and net tax payable. Verify the figures before filing manually on the GST portal.
      </Prose>
    </div>
  );
}

// ─── Reports ────────────────────────────────────────────────────────────────

export function ReportsContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Reports give you pre-built views into your operational data. Each report is date-filtered and can be exported.
      </Prose>
      <SimpleTable
        headers={['Report', 'What it shows']}
        rows={[
          ['Sales Register', 'All confirmed sale invoices for a chosen date range — document number, customer, amounts'],
          ['Purchase Register', 'All confirmed purchase orders for a chosen period'],
          ['Stock Summary', 'Current stock levels for every product across all warehouses'],
          ['Low Stock Alert', 'Products at or below their configured reorder level — your restocking list'],
        ]}
      />
    </div>
  );
}

// ─── Communications ─────────────────────────────────────────────────────────

export function CommunicationsContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Communications manages all automated and manual messages sent to customers and suppliers via email, SMS, or WhatsApp.
      </Prose>

      <SubHeading>Templates</SubHeading>
      <Prose>
        Reusable message templates for invoices, payment reminders, order confirmations, and more. Create one by giving it a name, selecting a channel (Email / SMS / WhatsApp), and writing the message body. Use placeholders like <InlineCode>{'{{customer_name}}'}</InlineCode> or <InlineCode>{'{{invoice_number}}'}</InlineCode> that get filled in automatically when the message is sent.
      </Prose>

      <SubHeading>Message Log</SubHeading>
      <Prose>
        A full history of every message SEED has sent — recipient, channel, template used, timestamp, and delivery status. Use this to confirm delivery or troubleshoot failed messages.
      </Prose>

      <SubHeading>My Preferences</SubHeading>
      <Prose>
        Control which notifications you personally receive and on which channels. Toggle each notification type on or off independently per channel (email, SMS, WhatsApp).
      </Prose>
    </div>
  );
}

// ─── Account Settings ───────────────────────────────────────────────────────

export function AccountContent() {
  return (
    <div className="space-y-6">
      <Prose>
        Access account settings from your avatar in the top-right header, or navigate to <strong>/account</strong> directly.
      </Prose>

      <SubHeading>Profile Information</SubHeading>
      <SimpleTable
        headers={['Field', 'Notes']}
        rows={[
          ['Display Name', 'Click Edit to update, then Save'],
          ['Email Address', 'Read-only — cannot be changed after sign-up'],
          ['Phone Number', 'Displayed if provided during onboarding'],
        ]}
      />

      <SubHeading>Active Sessions</SubHeading>
      <Prose>
        Click <strong>View All</strong> next to Login Activity to see every device and browser where your account is currently signed in. Revoke individual sessions to log out from devices you no longer use or recognise.
      </Prose>

      <SubHeading>Logging Out</SubHeading>
      <Prose>
        Click <strong>Logout</strong> at the top of the Account page to end your current session. To sign out of all devices at once, revoke all sessions from the sessions page.
      </Prose>
    </div>
  );
}

// ─── Quick Reference ────────────────────────────────────────────────────────

export function QuickReferenceContent() {
  return (
    <div className="space-y-6">
      <Prose>
        A fast lookup for the most common tasks — find the right page without having to browse the full guide.
      </Prose>
      <SimpleTable
        headers={['I want to…', 'Where to go']}
        rows={[
          ['Add a new product', 'Inventory → Add Item'],
          ['Record stock received from a supplier', 'Purchases → New GRN'],
          ['Create a sale invoice', 'Sales → New Invoice'],
          ['Add a customer or supplier', 'Parties → Customers / Suppliers → Add'],
          ['Move stock between warehouses', 'Stock Ops → Transfers → New Transfer'],
          ['Record damaged goods', 'Stock Ops → Damage Reports → New'],
          ['Track batch expiry dates', 'Batches → Expiring Batches'],
          ['Check which products need reordering', 'Reports → Low Stock Alert'],
          ['Record a payment from a customer', 'Payments → Receive Payment'],
          ['Add a bank account', 'Banking → Add Account'],
          ['Generate an e-invoice IRN', 'Tax & GST → E-Invoices'],
          ['View your P&L or Balance Sheet', 'Accounting → P&L / Balance Sheet'],
          ['Post a manual journal entry', 'Accounting → Journal Entries'],
          ['Create a message template', 'Communications → Templates → New'],
          ['Switch to another business', 'Business Switcher (top of sidebar)'],
          ['Update your display name', 'Account Settings → Edit'],
        ]}
      />
    </div>
  );
}

// ─── Content map ────────────────────────────────────────────────────────────

export const SECTION_CONTENT: Record<string, ComponentType> = {
  'getting-started': GettingStartedContent,
  'navigation': NavigationContent,
  'businesses': BusinessesContent,
  'dashboard': DashboardContent,
  'inventory': InventoryContent,
  'warehouses': WarehousesContent,
  'purchases': PurchasesContent,
  'sales': SalesContent,
  'parties': PartiesContent,
  'returns': ReturnsContent,
  'stock-ops': StockOpsContent,
  'batches': BatchesContent,
  'accounting': AccountingContent,
  'payments': PaymentsContent,
  'banking': BankingContent,
  'manufacturing': ManufacturingContent,
  'crm': CRMContent,
  'tax': TaxContent,
  'reports': ReportsContent,
  'communications': CommunicationsContent,
  'account': AccountContent,
  'quick-reference': QuickReferenceContent,
};
