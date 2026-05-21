-- Migration 001 (superuser part): Full-Text Search on products
-- Run this as the postgres superuser:
--   sudo -u postgres psql -d evershop -f migrations/001_ai_fts_superuser.sql
--
-- The regular evershop user cannot ALTER TABLE products because postgres owns it.
-- This migration grants evershop the ability to use tsvector on products.

ALTER TABLE products ADD COLUMN IF NOT EXISTS search_tsv tsvector;

UPDATE products
  SET search_tsv = to_tsvector('english',
    COALESCE(name, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(category, '')
  );

CREATE INDEX IF NOT EXISTS products_search_tsv_gin ON products USING gin(search_tsv);

CREATE OR REPLACE FUNCTION products_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.category, '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_tsv_trigger ON products;
CREATE TRIGGER products_tsv_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_tsv_update();

-- Grant the evershop user read access to the search_tsv column (already implied by table grants)
-- Also needed for CREATE FUNCTION ownership — grant EXECUTE if required:
GRANT EXECUTE ON FUNCTION products_tsv_update() TO evershop;
