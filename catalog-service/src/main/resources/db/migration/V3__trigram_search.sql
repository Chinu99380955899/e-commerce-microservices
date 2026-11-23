-- Typo-tolerant product search (step 3.8).
-- pg_trgm splits text into 3-letter pieces, so "hedphones" still matches "headphones".
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index: lets the word-similarity operator (<%) and ILIKE '%...%' use an index
-- instead of reading every row.
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
