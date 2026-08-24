-- Gives returns a GST shape so they can be filed as credit and debit notes.
--
-- A confirmed sales return reduces outward tax liability (GSTR-1 credit note);
-- a confirmed purchase return reduces input tax credit (debit note). Neither
-- carried any tax before this, so both were invisible to the filings and the
-- original sale kept being reported in full.
--
-- All additive with defaults. Returns confirmed before this migration keep
-- their zeroed amounts until they are recomputed.

-- AlterTable
ALTER TABLE "sales_returns"
    ADD COLUMN "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "taxableAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cessAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "grandTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "roundOff" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "supplyType" TEXT;

-- AlterTable
ALTER TABLE "sales_return_items"
    ADD COLUMN "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "taxableAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cgstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "sgstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "igstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cessRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cessAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "hsnCode" TEXT;

-- AlterTable
ALTER TABLE "purchase_returns"
    ADD COLUMN "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "taxableAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cessAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "grandTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "roundOff" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "supplyType" TEXT;

-- AlterTable
ALTER TABLE "purchase_return_items"
    ADD COLUMN "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "taxableAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cgstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "sgstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "sgstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "igstRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "igstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cessRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "cessAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "hsnCode" TEXT;
