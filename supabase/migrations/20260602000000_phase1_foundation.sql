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
