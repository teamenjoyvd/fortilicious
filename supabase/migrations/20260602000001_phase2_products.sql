-- supabase/migrations/20260602000001_phase2_products.sql
-- ROLLBACK: DROP TABLE IF EXISTS pillar_products, products CASCADE; DROP TYPE IF EXISTS product_brand, product_source CASCADE;

-- 1. Create Product Source and Brand Enums
CREATE TYPE product_source AS ENUM ('amway-price-checker', 'manual');
CREATE TYPE product_brand  AS ENUM ('amway', 'vera');

-- 2. Create products table
CREATE TABLE products (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text           NOT NULL,
  name            text           NOT NULL,
  brand           product_brand  NOT NULL,
  category        text,
  numeric_sku     text,           -- NULL for Vera products, unique otherwise
  price           numeric(10,2),  -- retail price
  wholesale_price numeric(10,2),  -- member price (wholesale)
  currency        text,           -- e.g. "BGN", "EUR"
  pv              integer,        -- Point Value
  description     text,
  image_url       text,
  source_url      text,           -- external link for Amway products
  amway_brand     text,           -- sub-brand scraped (e.g. Nutrilite)
  source          product_source NOT NULL,
  active          boolean        NOT NULL DEFAULT true,
  sync_locked     boolean        NOT NULL DEFAULT false, -- sets manual pricing lock
  last_synced_at  timestamptz,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  search_vector   tsvector
);

-- Partial unique index: numeric_sku is unique per product if not null
CREATE UNIQUE INDEX products_numeric_sku_unique
  ON products (numeric_sku)
  WHERE numeric_sku IS NOT NULL;

-- Search vector trigger function for products (uses 'simple' config)
CREATE OR REPLACE FUNCTION products_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('simple', coalesce(NEW.name, '')) ||
    to_tsvector('simple', coalesce(NEW.description, '')) ||
    to_tsvector('simple', coalesce(NEW.category, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_trigger();

-- Search GIN Index for products
CREATE INDEX idx_products_search ON products USING gin(search_vector);


-- 3. Create pillar_products junction table
CREATE TABLE pillar_products (
  pillar_id   uuid        NOT NULL REFERENCES content_pillars(id) ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     text        NOT NULL, -- validated by check trigger
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pillar_id, product_id)
);

-- Validation Trigger body ensuring junction.user_id matches both parents
CREATE OR REPLACE FUNCTION check_pillar_product_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM content_pillars WHERE id = NEW.pillar_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'pillar_id user_id mismatch';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM products WHERE id = NEW.product_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'product_id user_id mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pillar_product_user
  BEFORE INSERT OR UPDATE ON pillar_products
  FOR EACH ROW EXECUTE FUNCTION check_pillar_product_user();


-- 4. Configure Row Level Security (RLS) on Phase 2 tables

-- RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON products FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON products FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON products FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON products FOR DELETE
  USING (user_id = get_clerk_user_id());

-- RLS for pillar_products
ALTER TABLE pillar_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON pillar_products FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON pillar_products FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON pillar_products FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON pillar_products FOR DELETE
  USING (user_id = get_clerk_user_id());

-- 5. Advisory Locking Helpers for catalog sync concurrency control
CREATE OR REPLACE FUNCTION try_acquire_sync_lock()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- pg_try_advisory_lock returns true if lock is acquired, false otherwise
  RETURN pg_try_advisory_lock(hashtext('amway_sync'));
END;
$$;

CREATE OR REPLACE FUNCTION release_sync_lock()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- pg_advisory_unlock returns true if successfully unlocked, false otherwise
  RETURN pg_advisory_unlock(hashtext('amway_sync'));
END;
$$;

