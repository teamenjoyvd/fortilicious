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
