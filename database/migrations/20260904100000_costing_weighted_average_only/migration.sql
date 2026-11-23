-- Removes FIFO from CostingMethod.
--
-- The enum offered two costing methods and the code read the column at all:
-- every outbound movement valued stock the same way regardless. A business
-- that selected FIFO got weighted-average books while being told otherwise.
-- Weighted average is now genuinely implemented, so FIFO goes rather than
-- staying as a setting that does nothing.
--
-- Postgres cannot drop a value from an enum in place, so the type is rebuilt.
-- Any business currently set to FIFO moves to WEIGHTED_AVERAGE, which is the
-- behaviour it already had.

ALTER TABLE "businesses" ALTER COLUMN "costingMethod" DROP DEFAULT;

CREATE TYPE "CostingMethod_new" AS ENUM ('WEIGHTED_AVERAGE');

ALTER TABLE "businesses"
  ALTER COLUMN "costingMethod" TYPE "CostingMethod_new"
  USING (
    CASE "costingMethod"::text
      WHEN 'FIFO' THEN 'WEIGHTED_AVERAGE'
      ELSE "costingMethod"::text
    END
  )::"CostingMethod_new";

DROP TYPE "CostingMethod";
ALTER TYPE "CostingMethod_new" RENAME TO "CostingMethod";

ALTER TABLE "businesses"
  ALTER COLUMN "costingMethod" SET DEFAULT 'WEIGHTED_AVERAGE';
