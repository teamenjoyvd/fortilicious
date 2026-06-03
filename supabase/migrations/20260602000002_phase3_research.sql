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

-- 4. Initialize 'assets' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;
