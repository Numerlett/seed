-- Adds the GST breakup columns for purchases, mirroring the sale invoice side.
-- These drive input tax credit in the GSTR-3B preview.
--
-- All additive with defaults, so existing rows are unaffected. Purchase orders
-- confirmed before this migration keep their zeroed GST amounts until they are
-- recomputed.

-- AlterTable
ALTER TABLE "purchase_orders"
    ADD COLUMN "roundOff" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "supplyType" TEXT;

-- AlterTable
ALTER TABLE "purchase_order_items"
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
