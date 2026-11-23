-- Search also matches brand and category (the frontend promises "names, brands and categories").
-- Each column searched with an OR needs its own trigram index, or Postgres falls back to a full scan.
CREATE INDEX IF NOT EXISTS idx_products_brand_trgm ON products USING GIN (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category_trgm ON products USING GIN (category gin_trgm_ops);
