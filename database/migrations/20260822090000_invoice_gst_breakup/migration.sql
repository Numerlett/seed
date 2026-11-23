-- Adds the columns the GST breakup needs at invoice confirmation.
--
-- All additive with defaults, so existing rows are unaffected and no backfill
-- runs here. Invoices created before this migration keep their zeroed GST
-- amounts until they are recomputed.

-- AlterTable
ALTER TABLE "sale_invoices"
    ADD COLUMN "roundOff" DECIMAL(65,30) NOT NULL DEFAULT 0,
    ADD COLUMN "supplyType" TEXT,
    ADD COLUMN "isExport" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "isSEZ" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sale_invoice_items"
    ADD COLUMN "cessRate" DECIMAL(65,30) NOT NULL DEFAULT 0;
