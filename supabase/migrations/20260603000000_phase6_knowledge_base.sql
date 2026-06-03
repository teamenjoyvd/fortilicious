-- supabase/migrations/20260603000000_phase6_knowledge_base.sql
-- ROLLBACK: DROP TABLE IF EXISTS product_facts CASCADE; DROP TYPE IF EXISTS fact_category, fact_source_type CASCADE;

-- 1. Create Fact Source and Category Enums
CREATE TYPE fact_source_type AS ENUM ('official', 'external_scraped', 'manual_entry');
CREATE TYPE fact_category    AS ENUM ('benefit', 'science', 'usage', 'fun_fact', 'general');

-- 2. Create product_facts table
CREATE TABLE product_facts (
  id            uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid             NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       text             NOT NULL,
  source_type   fact_source_type NOT NULL DEFAULT 'external_scraped',
  category      fact_category    NOT NULL DEFAULT 'general',
  title         text             NOT NULL,
  body          text             NOT NULL,
  source_title  text,
  source_url    text,
  approved      boolean          NOT NULL DEFAULT false,
  created_at    timestamptz      NOT NULL DEFAULT now(),
  updated_at    timestamptz      NOT NULL DEFAULT now(),
  search_vector tsvector
);

-- Gap #1: moddatetime trigger for auto-updating updated_at
CREATE TRIGGER set_updated_at_product_facts
  BEFORE UPDATE ON product_facts
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- Gap #3: Ownership validation trigger to check that product_id.user_id matches product_facts.user_id
CREATE OR REPLACE FUNCTION check_product_fact_user()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM products WHERE id = NEW.product_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'product_id user_id mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_fact_user
  BEFORE INSERT OR UPDATE ON product_facts
  FOR EACH ROW EXECUTE FUNCTION check_product_fact_user();

-- Gap #2: Search vector trigger function for product_facts (uses 'simple' config)
CREATE OR REPLACE FUNCTION product_facts_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('simple', coalesce(NEW.title, '')) ||
    to_tsvector('simple', coalesce(NEW.body, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_facts_search
  BEFORE INSERT OR UPDATE ON product_facts
  FOR EACH ROW EXECUTE FUNCTION product_facts_search_trigger();

-- Search GIN Index for product_facts
CREATE INDEX idx_product_facts_search ON product_facts USING gin(search_vector);

-- Performance Indexes
CREATE INDEX idx_product_facts_product ON product_facts(product_id);
CREATE INDEX IF NOT EXISTS idx_pillar_products_product ON pillar_products(product_id);
CREATE INDEX IF NOT EXISTS idx_pillar_content_piece ON pillar_content(piece_id);

-- Gap #4: Deduplication unique index: prevent same source URL being scraped twice per product
CREATE UNIQUE INDEX product_facts_dedup
  ON product_facts (product_id, source_url)
  WHERE source_url IS NOT NULL;

-- 3. Configure Row Level Security (RLS) on product_facts
ALTER TABLE product_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON product_facts FOR SELECT USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON product_facts FOR INSERT WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON product_facts FOR UPDATE USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON product_facts FOR DELETE USING (user_id = get_clerk_user_id());
