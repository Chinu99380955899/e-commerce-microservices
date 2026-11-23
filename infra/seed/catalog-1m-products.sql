-- Step 3.16: one million generated products, to test queries at real data size.
-- Load it into a SEPARATE database (catalog_perf), never the dev one: the frontend's category
-- counts page through every product, which is fine for 20 rows and terrible for 1,000,000.
--
-- Run once (PowerShell, from the repo root):
--   docker exec auramart-postgres-1 createdb -U auramart catalog_perf
--   docker exec auramart-postgres-1 sh -c "pg_dump -U auramart --schema-only catalog_db | psql -q -U auramart -d catalog_perf"
--   Get-Content infra\seed\catalog-1m-products.sql | docker exec -i auramart-postgres-1 psql -U auramart -d catalog_perf
--
-- Each category gets two product types, so names, categories and brands make sense together.
-- About 2% of rows are inactive (soft-deleted), like a real catalogue.

INSERT INTO products (id, sku, name, description, category, brand, price, currency,
                      stock_quantity, active, version, created_at, updated_at)
SELECT gen_random_uuid(),
       'GEN-' || lpad(g::text, 7, '0'),
       (ARRAY['Wireless','Smart','Portable','Classic','Premium','Compact','Eco','Pro'])[1 + (g / 12) % 8]
           || ' ' || (ARRAY['Headphones','Speaker','Kettle','Blender','Yoga Mat','Dumbbell',
                            'Backpack','Duffel Bag','Desk Lamp','Cushion','Novel','Cookbook'])[1 + g % 12]
           || ' ' || g,
       'Generated product number ' || g,
       (ARRAY['electronics','kitchen','fitness','bags','home','books'])[1 + (g % 12) / 2],
       (ARRAY['Sonora','HomeChef','Zenfit','Roamer','Lumio','TechPress'])[1 + (g % 12) / 2],
       round((99 + random() * 20000)::numeric, 2),
       'INR',
       (random() * 100)::int,
       g % 50 <> 0,
       0,
       now() - make_interval(secs => g),
       now()
FROM generate_series(1, 1000000) AS g
ON CONFLICT (sku) DO NOTHING;

-- Refresh planner statistics, so EXPLAIN shows the plans Postgres would really choose.
ANALYZE products;
