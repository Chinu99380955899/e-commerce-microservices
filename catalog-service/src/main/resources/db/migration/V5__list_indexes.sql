-- Step 3.14: indexes for the list endpoint, chosen with EXPLAIN ANALYZE on 1,000,000 products
-- (infra/seed/catalog-1m-products.sql). Every list query filters on active = true, so these are
-- PARTIAL indexes: smaller, and soft-deleted rows never enter them.
--
-- Measured (first page of 20, 1M rows):
--   category + sort by price   47 ms seq scan  ->  0.07 ms index scan
--   count for one category     45 ms           ->  13 ms index-only scan
--   all products sort by name  77 ms           ->  0.36 ms index scan
--
-- Not indexed on purpose: price and createdAt sorts WITHOUT a category (rarer). Each index slows
-- every insert and update, so add one only when a measured query needs it.

CREATE INDEX IF NOT EXISTS idx_products_active_category_price ON products (category, price) WHERE active;
CREATE INDEX IF NOT EXISTS idx_products_active_category_name  ON products (category, name)  WHERE active;
CREATE INDEX IF NOT EXISTS idx_products_active_name           ON products (name)            WHERE active;
