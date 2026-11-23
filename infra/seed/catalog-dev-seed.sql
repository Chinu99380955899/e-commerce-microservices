-- Hand-written demo products for local development, so the frontend has something to show.
-- Not a Flyway migration: test and production databases must not get demo data.
-- Safe to run again: existing SKUs are skipped.
--
-- Run:  Get-Content infra\seed\catalog-dev-seed.sql | docker exec -i auramart-postgres-1 psql -U auramart -d catalog_db

INSERT INTO products (id, sku, name, description, category, brand, price, currency, stock_quantity, active, version, created_at, updated_at)
SELECT gen_random_uuid(), v.sku, v.name, v.description, v.category, v.brand, v.price, 'INR', v.stock, true, 0, now(), now()
FROM (VALUES
  ('ELE-HP-001',  'Wireless Noise Cancelling Headphones', 'Over-ear headphones with 30-hour battery and active noise cancelling.', 'electronics', 'Sonora',   7999.00, 25),
  ('ELE-EB-002',  'True Wireless Earbuds',                'Compact earbuds with charging case and touch controls.',              'electronics', 'Sonora',   2499.00, 60),
  ('ELE-SW-003',  'Smart Fitness Watch',                  'Heart-rate, sleep and step tracking with a 7-day battery.',           'electronics', 'Pulse',    4999.00, 0),
  ('ELE-SP-004',  'Portable Bluetooth Speaker',           'Waterproof speaker with deep bass, 12-hour playback.',               'electronics', 'Boomly',   3299.00, 18),
  ('KIT-KT-001',  'Electric Kettle 1.7 L',                'Stainless steel kettle with auto shut-off.',                          'kitchen',     'HomeChef', 1499.00, 40),
  ('KIT-CP-002',  'Cast Iron Skillet 26 cm',              'Pre-seasoned skillet for stovetop and oven.',                         'kitchen',     'IronLeaf', 1899.00, 12),
  ('KIT-BL-003',  'High-Speed Blender',                   '1000 W blender for smoothies and soups.',                             'kitchen',     'HomeChef', 3499.00, 7),
  ('KIT-WB-004',  'Steel Water Bottle 1 L',               'Double-wall insulated bottle, keeps drinks cold for 24 hours.',       'kitchen',     'Hydra',     799.00, 120),
  ('FIT-YM-001',  'Non-Slip Yoga Mat',                    '6 mm thick mat with carry strap.',                                    'fitness',     'Zenfit',   1199.00, 55),
  ('FIT-DB-002',  'Adjustable Dumbbell Set 20 kg',        'Pair of adjustable dumbbells with quick-lock plates.',                'fitness',     'IronCore', 5499.00, 9),
  ('FIT-RB-003',  'Resistance Band Set',                  'Five bands from light to extra heavy.',                               'fitness',     'Zenfit',    699.00, 80),
  ('FIT-JR-004',  'Speed Jump Rope',                      'Ball-bearing handles and adjustable cable.',                          'fitness',     'IronCore',  449.00, 0),
  ('BAG-BP-001',  'Travel Laptop Backpack',               'Fits 15.6-inch laptops, with USB charging port.',                     'bags',        'Roamer',   2299.00, 33),
  ('BAG-DF-002',  'Weekend Duffel Bag',                   'Water-resistant 40 L duffel with shoe compartment.',                  'bags',        'Roamer',   2799.00, 14),
  ('BAG-SL-003',  'Leather Sling Bag',                    'Compact genuine leather sling for daily essentials.',                 'bags',        'Hide&Co',  1999.00, 21),
  ('HOM-LM-001',  'LED Desk Lamp',                        'Dimmable lamp with three colour temperatures.',                       'home',        'Lumio',    1299.00, 44),
  ('HOM-CU-002',  'Cotton Cushion Covers (Set of 4)',     'Hand-block printed covers, 40 x 40 cm.',                              'home',        'Weave',     899.00, 70),
  ('HOM-DF-003',  'Aroma Diffuser',                       'Ultrasonic diffuser with seven LED colours.',                         'home',        'Lumio',    1599.00, 5),
  ('BOO-JV-001',  'Modern Java in Action',                'Streams, records, virtual threads and more.',                         'books',       'TechPress', 899.00, 30),
  ('BOO-SD-002',  'Designing Data-Intensive Systems',     'Replication, partitioning, transactions and streams explained.',      'books',       'TechPress',1299.00, 16),
  ('BOO-SB-003',  'Spring Boot Up and Running',           'Build production services with Spring Boot.',                         'books',       'TechPress', 749.00, 0)
) AS v(sku, name, description, category, brand, price, stock)
ON CONFLICT (sku) DO NOTHING;
