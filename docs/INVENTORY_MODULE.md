**INVENTORY** **MODULE**

> • WhatInventorymoduleanswers: • Whereisstock?
>
> • Howmuchstock? • Inwhatcondition? • Howdiditchange? • Whatisitsvalue?

**<u>Inventory module must handle:</u>**

> • Location • Quantity • Condition
>
> • Movement • Valuation
>
> • Trackinghistory

CORE DESIGNPRINCIPLE

Inventoryshouldneverbemanuallyedited.

> • Stock changesonlythrough: • Purchase
>
> • Sales
>
> • Returns
>
> • Adjustment • Transfer
>
> • Damage/ Expirywrite-off
>
> • EverythingmustgothroughInventoryLedger. • STRUCTURE OF
> INVENTORYMODULE
>
> • Wewill structureitinto9 parts(morereliable): • CategoryManagement
>
> • ProductMaster (mustbeincluded) • Warehouse& ShelfManagement
>
> • Batch/ ExpiryTracking
>
> • InventoryLedger(coreengine) • Stock SummaryTable
>
> • PurchaseStock InFlow • SalesStock OutFlow
>
> • Adjustments,Damage,Expiry,Transfer • Stock
> Valuation(importantaddition)
>
> **CATEGORY** **MANAGEMENT**
>
> • Purpose:Togroupproductslogically. • Example:
>
> • Electronics • Grocery
>
> • Medicine • Stationery • Database: • Category
>
> • category_id
>
> • category_name
>
> • parent_category_id(forsubcategories) • status

**<u>Workflow:</u>**

> • Admincreatescategory
>
> • Productreferencescategory_id • Reportscanfilter bycategory
>
> • No stock logichere.
>
> • Thisisclassificationonly.
>
> **PRODUCT** **MASTER** **(MUST** **BE** **PART** **OF** **INVENTORY**
> **MODULE)**
>
> • Product
>
> • product_id • name
>
> • SKU
>
> • category_id • unit
>
> • default_purchase_price • default_selling_price
>
> • tax_rate
>
> • reorder_level
>
> • track_expiry(boolean) • track_batch(boolean) • status

**<u>This table defines:</u>**

> • Whatitemexists
>
> • Whetherexpirytrackingisrequired • No quantitystoredhere.
>
> **WAREHOUSE** **&** **MULTIPLE** **SHELVES** **MANAGEMENT** •
> Warehouse→ Shelf→Bin(optional)

**<u>Tables:</u>**

> • Warehouse
>
> • warehouse_id • name
>
> • location
>
> • Shelf
>
> • shelf_id
>
> • warehouse_id • shelf_code
>
> • description

**<u>Why this matters:</u>**

> • “ProductA isinWarehouse1,Shelf B2” • Stock locationtracking
>
> • Inventorymusttrack: • Product
>
> • Warehouse • Shelf
>
> • Batch(ifapplicable)

**BATCH** **&** **EXPIRY** **MANAGEMENT** **<u>Important for:</u>**

> • Medicine • Food
>
> • FMCG

**<u>Batch Table</u>**

> • Product_Batch • batch_id
>
> • product_id
>
> • batch_number • expiry_date
>
> • manufacturing_date • purchase_price

**<u>Workflow:</u>**

> • When goodsarereceived:
>
> • Newbatchiscreated(iftrackingenabled) • Stock islinkedtothatbatch

**<u>Expiry logic:</u>**

Systemshould:

> • Automaticallymarkexpiredstock • Preventsaleofexpireditems
>
> • Generateexpiryalerts
>
> **INVENTORY** **LEDGER**

Everystockmovementcreatesoneledgerentry.

> • Inventory_Ledger • ledger_id
>
> • product_id
>
> • warehouse_id • shelf_id
>
> • batch_id(nullable) • transaction_type
>
> • reference_table • reference_id
>
> • quantity_in • quantity_out • unit_cost
>
> • total_cost
>
> • transaction_date

**<u>Transaction types:</u>**

> • PURCHASE_IN • SALE_OUT
>
> • SALES_RETURN_IN
>
> • PURCHASE_RETURN_OUT • ADJUSTMENT_IN
>
> • ADJUSTMENT_OUT • TRANSFER_IN
>
> • TRANSFER_OUT • DAMAGE_OUT
>
> • EXPIRED_OUT
>
> **STOCK** **SUMMARY** **TABLE**

Thisiscalculated.

> • Inventory_Stock • product_id
>
> • warehouse_id • shelf_id
>
> • batch_id
>
> • current_quantity • current_value

Updatedautomaticallyafter ledger entry.

Never manuallyedited.

**PURCHASE** **FLOW** **(STOCK** **IN)** **<u>When GRN is
confirmed:</u>**

System:

> • Validatesproduct
>
> • Createsbatch(ifrequired) • Insertsledger entry
>
> • Updatesstocksummary
>
> • Updatesinventoryvaluation

**<u>Data Flow:</u>**

> • GRN →Ledger →StockSummary→ ValuationUpdate

**SALES** **FLOW** **(STOCK** **OUT)** **<u>When invoice is
confirmed:</u>**

System:

> • Validatesavailablestock
>
> • Selectsbatch(FIFOrecommended) • Createsledgerentry(SALE_OUT)
>
> • Updatesstocksummary • Updatesvaluation
>
> • Important:FIFO/ LIFO
>
> • mustdefinestockcostingmethod.

Thisaffects:

> • Costofgoodssold • Profitcalculation
>
> **DAMAGE** **/** **EXPIRED** **STOCK** **MANAGEMENT**

User reports:

> • Product • Quantity • Location • Reason • System:
>
> • CreatesDAMAGE_OUT ledger entry • Reducesstock
>
> • Adjustsinventoryvalue

ExpiryWorkflow:

> • Systemchecksexpiry_datedaily. • Ifexpired:
>
> • Mark asexpired
>
> • Optionallyauto-createEXPIRED_OUT ledger • Or movetoquarantineshelf
>
> **STOCK** **TRANSFER** **BETWEEN** **SHELVES** **/** **WAREHOUSES**

Example:Moveproductfrom ShelfA → ShelfB

Systemcreatestwoledger entries:

> • TRANSFER_OUT • TRANSFER_IN

Stock overall doesn’tchange.Locationchanges.

> **INVENTORY** **ADJUSTMENT**

Forphysicalcountingmismatch.

> Example:Systemshows100.Actualcount=95.
>
> User creates:
>
> AdjustmentOUT= 5
>
> Ledger entrycreated.Stock corrected.Audittrailpreserved.
>
> **STOCK** **VALUATION** **(VERY** **IMPORTANT** **ADDITION)**

Inventoryisnotjustquantity.Itismoney.

Youmuststore:

> • Unitcost
>
> • Total stock value
>
> • Calculationdependson: • FIFO
>
> • Weightedaverage

**COMPLETE** **DATA** **FLOW**

> PurchaseGRN
>
> ↓
>
> CreateBatch
>
> ↓
>
> InventoryLedger(IN)
>
> ↓
>
> UpdateStockSummary
>
> ↓
>
> UpdateValuation
>
> ↓
>
> Reports
>
> SalesInvoice
>
> ↓
>
> Stock Validation
>
> ↓
>
> InventoryLedger(OUT)
>
> ↓
>
> UpdateStockSummary
>
> ↓
>
> UpdateValuation
>
> ↓
>
> COGS calculated

**FINAL** **STRUCTURE** **OF** **INVENTORY** **MODULE**

> • Categories • Products
>
> • Warehouse • Shelves
>
> • Batch& Expiry
>
> • InventoryLedger • Stock Summary
>
> • PurchaseStock In • SalesStock Out
>
> • Transfer
>
> • Adjustment
>
> •     Damage& Expiry •     ValuationEngine
