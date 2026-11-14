-- V1 declared currency as CHAR(3). The entity maps it to a String (VARCHAR),
-- so the schema must match. Never edit a migration that has already run; add a new one.
ALTER TABLE products ALTER COLUMN currency TYPE VARCHAR(3);
