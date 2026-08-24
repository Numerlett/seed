-- Adds the PURCHASE_ORDER journal source.
--
-- @seed/accounting's JournalSource type already listed it; the Prisma enum did
-- not, so the two had drifted. A confirmed purchase order posts GR/IR and input
-- GST against payables and needs its own source to stay traceable.

ALTER TYPE "JournalSource" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER';
