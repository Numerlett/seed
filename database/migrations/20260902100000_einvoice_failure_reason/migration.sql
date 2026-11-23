-- Records why the IRP rejected an e-invoice or e-way bill.
--
-- Generation previously wrote a PENDING row and returned without ever calling
-- the portal, so nothing could explain a document that never got an IRN. Now
-- that generation is a real API call it can fail for real reasons — a bad
-- GSTIN, a duplicate invoice number, an expired token — and the operator needs
-- to see the portal's own message rather than an unexplained status.

ALTER TABLE "e_invoices" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
ALTER TABLE "e_way_bills" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
