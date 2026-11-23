-- Hosted payment links raised against sale invoices.
--
-- The Razorpay adapter could already create links, but nothing recorded them,
-- so a paid link had no path back to the invoice it settled. This table is what
-- the webhook matches on, and the unique provider ids are what make a replayed
-- webhook a no-op instead of a duplicate receipt.

CREATE TYPE "PaymentLinkStatus" AS ENUM ('CREATED', 'PAID', 'CANCELLED', 'EXPIRED');

CREATE TABLE "payment_links" (
  "id"                TEXT NOT NULL,
  "businessId"        TEXT NOT NULL,
  "invoiceId"         TEXT NOT NULL,
  "provider"          TEXT NOT NULL DEFAULT 'RAZORPAY',
  "providerLinkId"    TEXT NOT NULL,
  "shortUrl"          TEXT NOT NULL,
  "amount"            DECIMAL(15,2) NOT NULL,
  "currency"          TEXT NOT NULL DEFAULT 'INR',
  "status"            "PaymentLinkStatus" NOT NULL DEFAULT 'CREATED',
  "providerPaymentId" TEXT,
  "paidAt"            TIMESTAMP(3),
  "paymentId"         TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_links_providerLinkId_key" ON "payment_links" ("providerLinkId");
CREATE UNIQUE INDEX "payment_links_providerPaymentId_key" ON "payment_links" ("providerPaymentId");
CREATE INDEX "payment_links_businessId_status_idx" ON "payment_links" ("businessId", "status");
CREATE INDEX "payment_links_invoiceId_idx" ON "payment_links" ("invoiceId");

ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "sale_invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
