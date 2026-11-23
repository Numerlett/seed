-- Scopes payment document numbers to the business.
--
-- `documentNumber` was globally unique while every other document type is
-- unique per business. Numbers are generated per business (RCP-0001, PAY-0001),
-- so the second business to record a receipt collided with the first and the
-- insert failed. Nothing could be done about it from the UI.

DROP INDEX IF EXISTS "payments_documentNumber_key";

CREATE UNIQUE INDEX IF NOT EXISTS "payments_businessId_documentNumber_key"
  ON "payments" ("businessId", "documentNumber");
