-- Gives payment allocations real foreign keys.
--
-- `invoiceId` and `billId` were plain nullable strings with nothing enforcing
-- that they pointed at anything. Settlement figures on an invoice —
-- `amountPaid`, `amountDue`, `paymentStatus` — are derived by summing these
-- rows, so an allocation referencing a document that no longer exists silently
-- changes what a customer is told they owe.
--
-- Restrict, not cascade: a document with money allocated against it must not be
-- deletable, and removing the allocation instead would quietly alter the
-- payment's own totals.

-- Any pre-existing allocation pointing at a document that is not there is
-- already meaningless. Detach it so the constraint can be created, rather than
-- deleting the row and changing a recorded payment.
UPDATE "payment_allocations" pa
SET "invoiceId" = NULL
WHERE pa."invoiceId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "sale_invoices" si WHERE si.id = pa."invoiceId");

UPDATE "payment_allocations" pa
SET "billId" = NULL
WHERE pa."billId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "purchase_orders" po WHERE po.id = pa."billId");

CREATE INDEX IF NOT EXISTS "payment_allocations_invoiceId_idx"
  ON "payment_allocations" ("invoiceId");
CREATE INDEX IF NOT EXISTS "payment_allocations_billId_idx"
  ON "payment_allocations" ("billId");

ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "sale_invoices" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_billId_fkey"
  FOREIGN KEY ("billId") REFERENCES "purchase_orders" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
