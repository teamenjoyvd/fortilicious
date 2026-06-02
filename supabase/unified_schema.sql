-- UNIFIED SCHEMA MIGRATION FILE FOR FORTILICIOUS SOCIAL MANAGER
-- Copy this entire file and run it inside the Supabase SQL Editor.

-- ─────────────────────────────────────────────────────────────
-- MIGRATION: 20260602000000_phase1_foundation.sql
-- ─────────────────────────────────────────────────────────────

-- supabase/migrations/20260602000000_phase1_foundation.sql
-- ROLLBACK: DROP TABLE IF EXISTS quick_captures, channels, content_pillars CASCADE; DROP TYPE IF EXISTS promoted_target_type, asset_file_type, platform_type, content_piece_type, research_entry_type, schedule_entry_status, content_piece_status, content_pillar_status CASCADE; DROP FUNCTION IF EXISTS get_clerk_user_id() CASCADE;

-- 1. Helper function for RLS (Extract Clerk user ID from JWT sub claim)
CREATE OR REPLACE FUNCTION get_clerk_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )
$$;

-- 2. Define standard system enums
CREATE TYPE content_pillar_status  AS ENUM ('active', 'live', 'archived');
CREATE TYPE content_piece_status   AS ENUM ('draft', 'ready', 'live', 'archived');
CREATE TYPE schedule_entry_status  AS ENUM ('planned', 'live', 'skipped');
CREATE TYPE research_entry_type    AS ENUM ('note', 'link');
CREATE TYPE content_piece_type     AS ENUM ('caption', 'script', 'video', 'short_form');
CREATE TYPE platform_type          AS ENUM ('tiktok', 'instagram', 'facebook', 'youtube', 'other');
CREATE TYPE asset_file_type        AS ENUM ('image', 'pdf', 'video', 'external_link');
CREATE TYPE promoted_target_type   AS ENUM ('pillar', 'content_piece');

-- Enable moddatetime extension
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- 3. Define content_pillars table
CREATE TABLE content_pillars (
  id             uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        text                  NOT NULL,
  title          text                  NOT NULL,
  description    text,
  status         content_pillar_status NOT NULL DEFAULT 'active',
  created_at     timestamptz           NOT NULL DEFAULT now(),
  updated_at     timestamptz           NOT NULL DEFAULT now(),
  search_vector  tsvector
);

-- moddatetime trigger for content_pillars
CREATE TRIGGER set_updated_at_content_pillars
  BEFORE UPDATE ON content_pillars
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- Search vector trigger function for content_pillars (uses 'simple' config)
CREATE OR REPLACE FUNCTION content_pillars_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('simple', coalesce(NEW.title, '')) ||
    to_tsvector('simple', coalesce(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_content_pillars_search
  BEFORE INSERT OR UPDATE ON content_pillars
  FOR EACH ROW EXECUTE FUNCTION content_pillars_search_trigger();

-- Search GIN Index for content_pillars
CREATE INDEX idx_content_pillars_search ON content_pillars USING gin(search_vector);


-- 4. Define channels table
CREATE TABLE channels (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text          NOT NULL,
  name        text          NOT NULL,
  handle      text,
  platform    platform_type NOT NULL,
  active      boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate handles per user, platform combination
CREATE UNIQUE INDEX channels_unique_handle
  ON channels (user_id, platform, handle)
  WHERE handle IS NOT NULL;


-- 5. Define quick_captures table
CREATE TABLE quick_captures (
  id           uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text                 NOT NULL,
  body         text                 NOT NULL,
  promoted_to  promoted_target_type, -- NULL until promoted
  promoted_id  uuid,                 -- bare UUID; no FK
  created_at   timestamptz          NOT NULL DEFAULT now(),
  CONSTRAINT quickcapture_promotion_consistency
    CHECK ((promoted_to IS NULL) = (promoted_id IS NULL))
);


-- 6. Configure Row Level Security (RLS) on all Phase 1 tables

-- RLS for content_pillars
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON content_pillars FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON content_pillars FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON content_pillars FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON content_pillars FOR DELETE
  USING (user_id = get_clerk_user_id());

-- RLS for channels
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON channels FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON channels FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON channels FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON channels FOR DELETE
  USING (user_id = get_clerk_user_id());

-- RLS for quick_captures
ALTER TABLE quick_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON quick_captures FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON quick_captures FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON quick_captures FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON quick_captures FOR DELETE
  USING (user_id = get_clerk_user_id());


-- ─────────────────────────────────────────────────────────────
-- MIGRATION: 20260602000001_phase2_products.sql
-- ─────────────────────────────────────────────────────────────

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



-- ─────────────────────────────────────────────────────────────
-- MIGRATION: 20260602000002_phase3_research.sql
-- ─────────────────────────────────────────────────────────────

-- supabase/migrations/20260602000002_phase3_research.sql
-- ROLLBACK: DROP TABLE IF EXISTS assets, research_entries CASCADE;

-- 1. Create research_entries table
CREATE TABLE research_entries (
  id             uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        text                  NOT NULL,
  pillar_id      uuid                  NOT NULL REFERENCES content_pillars(id) ON DELETE CASCADE,
  type           research_entry_type   NOT NULL,
  title          text,
  body           text,
  url            text,
  pinned         boolean               NOT NULL DEFAULT false,
  created_at     timestamptz           NOT NULL DEFAULT now(),
  updated_at     timestamptz           NOT NULL DEFAULT now(),
  search_vector  tsvector
);

-- Trigger for updated_at in research_entries
CREATE TRIGGER set_updated_at_research_entries
  BEFORE UPDATE ON research_entries
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- Trigger to validate pillar_id ownership for research_entries
CREATE OR REPLACE FUNCTION check_research_entry_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM content_pillars WHERE id = NEW.pillar_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'pillar_id user_id mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_research_entry_user
  BEFORE INSERT OR UPDATE ON research_entries
  FOR EACH ROW EXECUTE FUNCTION check_research_entry_user();

-- Search vector trigger function for research_entries (uses 'simple' config)
CREATE OR REPLACE FUNCTION research_entries_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('simple', coalesce(NEW.title, '')) ||
    to_tsvector('simple', coalesce(NEW.body, '')) ||
    to_tsvector('simple', coalesce(NEW.url, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_research_entries_search
  BEFORE INSERT OR UPDATE ON research_entries
  FOR EACH ROW EXECUTE FUNCTION research_entries_search_trigger();

-- Search GIN Index for research_entries
CREATE INDEX idx_research_entries_search ON research_entries USING gin(search_vector);


-- 2. Create assets table
CREATE TABLE assets (
  id                 uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text            NOT NULL,
  research_entry_id  uuid            REFERENCES research_entries(id) ON DELETE CASCADE,
  content_piece_id   uuid,           -- FK added in Phase 4 when content_pieces table is created
  file_type          asset_file_type NOT NULL,
  storage_path       text,
  url                text,
  file_name          text,
  file_size_bytes    bigint,
  created_at         timestamptz     NOT NULL DEFAULT now(),
  
  -- Exclusive-OR check: exactly one parent must be non-null
  CONSTRAINT assets_single_parent_check
    CHECK ((research_entry_id IS NULL) != (content_piece_id IS NULL))
);

-- Trigger to validate research_entry_id ownership for assets
CREATE OR REPLACE FUNCTION check_asset_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF NEW.research_entry_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM research_entries WHERE id = NEW.research_entry_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'research_entry_id user_id mismatch';
    END IF;
  END IF;
  -- content_piece_id ownership check will be added or updated in Phase 4 when content_pieces are implemented
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_asset_user
  BEFORE INSERT OR UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION check_asset_user();


-- 3. Configure Row Level Security (RLS) on Phase 3 tables

-- RLS for research_entries
ALTER TABLE research_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON research_entries FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON research_entries FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON research_entries FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON research_entries FOR DELETE
  USING (user_id = get_clerk_user_id());

-- RLS for assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON assets FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON assets FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON assets FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON assets FOR DELETE
  USING (user_id = get_clerk_user_id());


-- ─────────────────────────────────────────────────────────────
-- MIGRATION: 20260602000003_phase4_content.sql
-- ─────────────────────────────────────────────────────────────

-- supabase/migrations/20260602000003_phase4_content.sql
-- ROLLBACK: ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_content_piece_id_fkey; DROP TABLE IF EXISTS pillar_content, content_pieces CASCADE;

-- 1. Create content_pieces table
CREATE TABLE content_pieces (
  id             uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        text                  NOT NULL,
  title          text                  NOT NULL,
  type           content_piece_type    NOT NULL,
  body           text,
  status         content_piece_status  NOT NULL DEFAULT 'draft',
  published_at   timestamptz,
  created_at     timestamptz           NOT NULL DEFAULT now(),
  updated_at     timestamptz           NOT NULL DEFAULT now(),
  search_vector  tsvector
);

-- Trigger for updated_at in content_pieces
CREATE TRIGGER set_updated_at_content_pieces
  BEFORE UPDATE ON content_pieces
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- Search vector trigger function for content_pieces (uses 'simple' config)
CREATE OR REPLACE FUNCTION content_pieces_search_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('simple', coalesce(NEW.title, '')) ||
    to_tsvector('simple', coalesce(NEW.body, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_content_pieces_search
  BEFORE INSERT OR UPDATE ON content_pieces
  FOR EACH ROW EXECUTE FUNCTION content_pieces_search_trigger();

-- Search GIN Index for content_pieces
CREATE INDEX idx_content_pieces_search ON content_pieces USING gin(search_vector);


-- 2. Create pillar_content junction table
CREATE TABLE pillar_content (
  pillar_id   uuid        NOT NULL REFERENCES content_pillars(id) ON DELETE CASCADE,
  piece_id    uuid        NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  user_id     text        NOT NULL,
  is_primary  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pillar_id, piece_id)
);

-- Partial unique index ensuring at most ONE primary content pillar per piece
CREATE UNIQUE INDEX pillar_content_one_primary
  ON pillar_content (piece_id)
  WHERE is_primary = true;

-- Trigger to validate pillar_id and piece_id ownership for pillar_content
CREATE OR REPLACE FUNCTION check_pillar_content_user()
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
    SELECT 1 FROM content_pieces WHERE id = NEW.piece_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'piece_id user_id mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pillar_content_user
  BEFORE INSERT OR UPDATE ON pillar_content
  FOR EACH ROW EXECUTE FUNCTION check_pillar_content_user();


-- 3. Connect assets table to content_pieces
ALTER TABLE assets
  ADD CONSTRAINT assets_content_piece_id_fkey
  FOREIGN KEY (content_piece_id) REFERENCES content_pieces(id) ON DELETE CASCADE;

-- Update asset user validation trigger to verify content_piece_id ownership
CREATE OR REPLACE FUNCTION check_asset_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF NEW.research_entry_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM research_entries WHERE id = NEW.research_entry_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'research_entry_id user_id mismatch';
    END IF;
  END IF;
  IF NEW.content_piece_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM content_pieces WHERE id = NEW.content_piece_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'content_piece_id user_id mismatch';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


-- 4. Configure Row Level Security (RLS) on Phase 4 tables

-- RLS for content_pieces
ALTER TABLE content_pieces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON content_pieces FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON content_pieces FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON content_pieces FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON content_pieces FOR DELETE
  USING (user_id = get_clerk_user_id());

-- RLS for pillar_content
ALTER TABLE pillar_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON pillar_content FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON pillar_content FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON pillar_content FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON pillar_content FOR DELETE
  USING (user_id = get_clerk_user_id());


-- ─────────────────────────────────────────────────────────────
-- MIGRATION: 20260602000004_phase5_status_enum.sql
-- ─────────────────────────────────────────────────────────────

-- supabase/migrations/20260602000004_phase5_status_enum.sql
-- ROLLBACK: -- cannot easily remove enum value in standard postgres migration; ignored or handled by restoration.

-- ALTER TYPE content_piece_status ADD VALUE cannot be executed in a multi-statement transaction in Postgres.
-- Keeping this in its own migration file enables isolated execution.
ALTER TYPE content_piece_status ADD VALUE IF NOT EXISTS 'scheduled';


-- ─────────────────────────────────────────────────────────────
-- MIGRATION: 20260602000005_phase5_scheduling.sql
-- ─────────────────────────────────────────────────────────────

-- supabase/migrations/20260602000005_phase5_scheduling.sql
-- ROLLBACK: DROP TABLE IF EXISTS schedule_entries CASCADE;

-- 1. Create schedule_entries table
CREATE TABLE schedule_entries (
  id                uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text                  NOT NULL,
  content_piece_id  uuid                  NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  channel_id        uuid                  NOT NULL REFERENCES channels(id) ON DELETE RESTRICT, -- RESTRICT channel deletes if scheduled logs remain
  planned_at        timestamptz           NOT NULL,
  published_at      timestamptz,
  status            schedule_entry_status NOT NULL DEFAULT 'planned',
  created_at        timestamptz           NOT NULL DEFAULT now()
);

-- Trigger to validate content_piece_id and channel_id ownership for schedule_entries
CREATE OR REPLACE FUNCTION check_schedule_entry_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM content_pieces WHERE id = NEW.content_piece_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'content_piece_id user_id mismatch';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM channels WHERE id = NEW.channel_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'channel_id user_id mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_schedule_entry_user
  BEFORE INSERT OR UPDATE ON schedule_entries
  FOR EACH ROW EXECUTE FUNCTION check_schedule_entry_user();

-- Trigger to automatically set parent content piece status to 'live' when scheduled post goes live
CREATE OR REPLACE FUNCTION trg_schedule_entry_live_fn()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF NEW.status = 'live' AND OLD.status != 'live' THEN
    UPDATE content_pieces
    SET status = 'live',
        published_at = coalesce(published_at, NEW.published_at, now())
    WHERE id = NEW.content_piece_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_schedule_entry_live
  BEFORE UPDATE ON schedule_entries
  FOR EACH ROW 
  WHEN (NEW.status = 'live' AND OLD.status != 'live')
  EXECUTE FUNCTION trg_schedule_entry_live_fn();


-- 2. Configure Row Level Security (RLS) on schedule_entries
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON schedule_entries FOR SELECT
  USING (user_id = get_clerk_user_id());
CREATE POLICY "insert_own" ON schedule_entries FOR INSERT
  WITH CHECK (user_id = get_clerk_user_id());
CREATE POLICY "update_own" ON schedule_entries FOR UPDATE
  USING (user_id = get_clerk_user_id());
CREATE POLICY "delete_own" ON schedule_entries FOR DELETE
  USING (user_id = get_clerk_user_id());


