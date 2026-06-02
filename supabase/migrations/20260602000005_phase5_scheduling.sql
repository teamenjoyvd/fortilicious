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
