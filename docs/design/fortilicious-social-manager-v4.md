# Fortilicious Social Presence Manager
> System Prompt + Design Document — v4 (blockers and pre-mortem findings resolved)

---

## The Prompt

You are a senior full-stack engineer building **Fortilicious Social Presence Manager** — a private,
single-user web application for **Vera**, the sole operator of the brand **Fortilicious by Vera**.

Vera is a solo entrepreneur who:
- Sells physical products (sourced from Amway's catalog, synced from `teamenjoyvd/amway-price-checker`)
- Offers personal services and events under her own brand
- Creates educational/inspirational social content on TikTok, Instagram, and Facebook
- Plans content around **content pillars** (evergreen topic clusters, e.g. "keeping insulin levels
  without spikes") connected to specific products from her catalog

The system is a **planning and tracking tool only**. It does not publish to social APIs.
Vera marks content live manually.

### What the system must do

1. **Content pillar management** — Create and manage evergreen content pillars. A pillar is a
   long-lived topic repository that generates content over months, not a linear project that
   "completes." Status field (`active → live → archived`) is retained for UI filtering only;
   do not treat it as a lifecycle gate.

2. **Research per pillar** — Each pillar accumulates research: free-text notes and bookmarked
   links (with optional file attachments). All stored in Supabase. File attachments go to
   Supabase Storage via server action only.

3. **Product catalog** — A browsable, searchable catalog of Amway products (synced from
   `amway-price-checker`) and Vera's own products/services/events (entered manually).

4. **Pillar ↔ Product graph** — Many-to-many. Vera connects products to pillars with optional
   notes explaining the relevance. Products are previewable inline via a bottom sheet — no
   separate product detail route.

5. **Content pieces** — Text-based content (captions, scripts, videos, short-form) written and
   stored in the DB. Each piece belongs to pillars via a junction table (`pillar_content`), supporting one primary pillar and multiple secondary associations. Status: `draft → ready → live → archived` (`scheduled` added in Phase 5).

6. **Scheduling** — Each content piece can be scheduled to one or more channels (TikTok,
   Instagram, Facebook, YouTube, etc.) with a planned publish date. Vera confirms live
   per schedule entry from the calendar. A calendar view shows the full schedule by channel
   and date with inline reschedule.

7. **Channel registry** — Managed in `/settings`. A named list of Vera's social channels.
   Channel CRUD does not have a standalone route.

8. **Quick capture inbox** — Zero-friction idea capture. Vera dumps text or a link into the inbox
   from mobile. Inbox items can be promoted to a pillar (body pre-fills description) or a content
   piece (body pre-fills piece body). Promoted items are hidden from the default inbox view;
   accessible under a "Promoted" toggle.

9. **Asset bundle utility** — On any `ready`, `scheduled`, or `live` content piece, a "Prepare
   for posting" action: copies caption to clipboard, triggers a server-side zip download of all
   image/pdf/video assets, and lists external link URLs as a copyable list. The zip is served
   from `GET /api/content/[id]/bundle.zip` — a real HTTP download, compatible with iOS Safari
   and desktop.

10. **Global search** — Persistent search bar in the app header, visible on all routes. Searches
    pillars, products, research entries, and content pieces via `tsvector` + GIN indexes using the 'simple' config.

### What the system must NOT do

- Post to any social API
- Have multi-user roles or permissions
- Include analytics or performance tracking
- Include N21 (Network 21) products — abstract/non-countable, deferred
- Implement `carousel` or `thread` content types until a `ContentSection` model is designed
- Send notifications of any kind — no bell icon, no notification entity

### Hard constraints

- **Stack:** Next.js 15 (App Router), Supabase (Postgres + Storage), Clerk (auth), Tailwind CSS
- **Auth:** Clerk on all routes. Single user. No public routes except marketing (if any).
- **RLS:** All tables have Row Level Security. Use Clerk-to-Supabase helper (`get_clerk_user_id()`) and text-based user ID fields.
- **Storage:** All uploads via server action using service role key. No client-side Supabase
  Storage access. Bucket is fully private. No bucket RLS policy required.
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client**
- **middleware.ts exists for clerkMiddleware() only** — authentications are structured via a custom proxy wrapper where needed.
- **Mobile-first:** 390px base, responsive up
- **No direct pushes to `main`** — all work on `dev/[ID]` branches

---

## Blocking Unknowns (Resolved)

| # | Unknown | Resolution |
|---|---|---|
| 1 | `amway-price-checker` catalog output schema | Resolved by reading the database schema. Sourced via a two-table design: `master_products` (canonical data) + `source_products` (site-specific country pricing). Synced on `numeric_sku` with fallback to anonymous clients when Clerk JWT is unconfigured. |
| 2 | Real Supabase project ID | Configured via environment variables (`ayfyymvmsafvnuohafau`). |
| 3 | Clerk JWT template configuration | Resolved by establishing the `get_clerk_user_id()` helper extracting Clerk's `sub` claim and typing user IDs as `TEXT`. |

---

## Database Schemas & Row Level Security (RLS) Helper

### 1. Clerk User Authentication Helper
Extracts the Clerk user's unique string ID from the JWT claims:
```sql
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
```

### 2. Postgres Enums
```sql
CREATE TYPE content_pillar_status  AS ENUM ('active', 'live', 'archived');
CREATE TYPE content_piece_status   AS ENUM ('draft', 'ready', 'live', 'archived');
-- 'scheduled' added in Phase 5: ALTER TYPE content_piece_status ADD VALUE 'scheduled';
CREATE TYPE schedule_entry_status  AS ENUM ('planned', 'live', 'skipped');
CREATE TYPE research_entry_type    AS ENUM ('note', 'link');
CREATE TYPE content_piece_type     AS ENUM ('caption', 'script', 'video', 'short_form');
CREATE TYPE platform_type          AS ENUM ('tiktok', 'instagram', 'facebook', 'youtube', 'other');
CREATE TYPE asset_file_type        AS ENUM ('image', 'pdf', 'video', 'external_link');
CREATE TYPE promoted_target_type   AS ENUM ('pillar', 'content_piece');

-- Phase 2 enums
CREATE TYPE product_source AS ENUM ('amway-price-checker', 'manual');
CREATE TYPE product_brand  AS ENUM ('amway', 'vera');
```

---

## Entity Model & Table Definitions

### 1. Content Pillars
Represents evergreen topics/clusters.
```sql
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

-- Trigger for moddatetime
CREATE TRIGGER set_updated_at_content_pillars
  BEFORE UPDATE ON content_pillars
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- Search vector trigger function (simple config)
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

CREATE INDEX idx_content_pillars_search ON content_pillars USING gin(search_vector);
```

### 2. Products Catalog
Browsing items sourced from Amway price checker or entered manually by Vera.
```sql
CREATE TABLE products (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text           NOT NULL,
  name            text           NOT NULL,
  brand           product_brand  NOT NULL,
  category        text,
  numeric_sku     text,           -- NULL for Vera products, unique otherwise
  price           numeric(10,2),  -- retail price
  wholesale_price numeric(10,2),  -- member price (wholesale)
  currency        text,           -- e.g. "BGN"
  pv              integer,        -- Point Value
  description     text,
  image_url       text,
  source_url      text,           -- external link for Amway products
  amway_brand     text,           -- sub-brand (e.g. Nutrilite)
  source          product_source NOT NULL,
  active          boolean        NOT NULL DEFAULT true,
  sync_locked     boolean        NOT NULL DEFAULT false, -- manual edit overrides sync
  last_synced_at  timestamptz,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  search_vector   tsvector
);

-- SKU uniqueness constraint when numeric_sku is not null
CREATE UNIQUE INDEX products_numeric_sku_unique
  ON products (numeric_sku)
  WHERE numeric_sku IS NOT NULL;

-- Search vector trigger function (simple config)
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

CREATE INDEX idx_products_search ON products USING gin(search_vector);
```

### 3. Pillar-Products Relationship
Junction table connecting products to content pillars.
```sql
CREATE TABLE pillar_products (
  pillar_id   uuid        NOT NULL REFERENCES content_pillars(id) ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     text        NOT NULL, 
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pillar_id, product_id)
);

-- Validation Trigger body ensuring user owns both parents
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
```

### 4. Channels Registry
Social channel details managed in settings.
```sql
CREATE TABLE channels (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text          NOT NULL,
  name        text          NOT NULL,
  handle      text,
  platform    platform_type NOT NULL,
  active      boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

-- Prevent duplicate platform-handles per user
CREATE UNIQUE INDEX channels_unique_handle
  ON channels (user_id, platform, handle)
  WHERE handle IS NOT NULL;
```

### 5. Research Entries
Notes and bookmarked links.
```sql
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

-- moddatetime updated_at trigger
CREATE TRIGGER set_updated_at_research_entries
  BEFORE UPDATE ON research_entries
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- Trigger to validate pillar_id ownership
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

-- Search vector trigger (simple config)
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

CREATE INDEX idx_research_entries_search ON research_entries USING gin(search_vector);
```

### 6. Content Pieces
Draft scripts, captions, and posts.
```sql
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

CREATE TRIGGER set_updated_at_content_pieces
  BEFORE UPDATE ON content_pieces
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

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

CREATE INDEX idx_content_pieces_search ON content_pieces USING gin(search_vector);
```

### 7. Pillar-Content Junction (Primary & Secondary Relations)
Associations between pieces and evergreen pillars. Replacing the dual-path mapping.
```sql
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

-- Trigger ensuring user_id ownership matches parents
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
```

### 8. Media Assets (Unified Storage Metadata)
Stores uploaded files metadata securely linked to parents.
```sql
CREATE TABLE assets (
  id                 uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text            NOT NULL,
  research_entry_id  uuid            REFERENCES research_entries(id) ON DELETE CASCADE,
  content_piece_id   uuid            REFERENCES content_pieces(id) ON DELETE CASCADE,
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

-- User validation trigger
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

CREATE TRIGGER trg_asset_user
  BEFORE INSERT OR UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION check_asset_user();
```

### 9. Scheduling Entries
Publishing times and channels mappings.
```sql
CREATE TABLE schedule_entries (
  id                uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text                  NOT NULL,
  content_piece_id  uuid                  NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  channel_id        uuid                  NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
  planned_at        timestamptz           NOT NULL,
  published_at      timestamptz,
  status            schedule_entry_status NOT NULL DEFAULT 'planned',
  created_at        timestamptz           NOT NULL DEFAULT now()
);

-- Trigger checking user_id validity
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

-- Trigger to automatically mark content piece 'live' and set published_at
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
```

### 10. Quick Capture Inbox
Idea backlog.
```sql
CREATE TABLE quick_captures (
  id           uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text                 NOT NULL,
  body         text                 NOT NULL,
  promoted_to  promoted_target_type, -- NULL until promoted
  promoted_id  uuid,                 -- bare UUID
  created_at   timestamptz          NOT NULL DEFAULT now(),
  CONSTRAINT quickcapture_promotion_consistency
    CHECK ((promoted_to IS NULL) = (promoted_id IS NULL))
);
```

---

## Entity Relationships

```
ContentPillar <---> Product          (PillarProduct, many:many)
ContentPillar <---> ContentPiece     (PillarContent, many:many)
ContentPillar --->  ResearchEntry    (1:many; ON DELETE CASCADE)
ContentPiece  --->  ScheduleEntry    (1:many; ON DELETE CASCADE)
ScheduleEntry --->  Channel          (many:1)
ResearchEntry --->  Asset            (1:many, via research_entry_id; ON DELETE CASCADE)
ContentPiece  --->  Asset            (1:many, via content_piece_id; ON DELETE CASCADE)
```

---

## Global Search

- **Architecture:** `tsvector` columns + GIN indexes + `BEFORE INSERT OR UPDATE` triggers on each searchable table (enforcing simple config).
- **Search bar:** Inline header search bar, visible across all routes.
- **Server action:** `searchAll(query: string): Promise<SearchResult[]>`
  - Natural parsing using `websearch_to_tsquery`
  - Merged using a `UNION ALL` query strategy to avoid N+1 fan-out overheads
  - Truncates excerpts/snippets on database level using `ts_headline`
  - Sorted by `ts_rank`, debounced, and capped at 20 results.

---

## Screens & Layout Routing

- `/` Dashboard: Stale drafts (>14 days), active pillars, and 7-day scheduled posts.
- `/inbox` Idea backlog, processing processing conversions.
- `/pillars` Main clusters view.
- `/pillars/[id]` Pillar information detail: notes, connected assets, catalog connections.
- `/products` Synced catalog browser, search filters, and trigger buttons.
- `/products/[id]` Detailed product workspace, separating official and scraped details (Phase 6 detail page).
- `/content` All drafts and script text files.
- `/content/[id]` Comprehensive markdown workspace editor, checklist panel, copy-caption triggers, and zip streaming download links.
- `/calendar` Publication calendar with planned slots, drag updates, skips, and publish completions.
- `/settings` Channel listings settings (platform handles CRUD).

---

## Product Sync

- **Gating:** Enforces pg advisory locks (`try_acquire_sync_lock()` / `release_sync_lock()`) to manage sync concurrency.
- **Source mapping:** Sites details are mapped across a two-table design (`master_products` join `source_products`).
- **Algorithm:**
  1. Acquire pg lock. If locked, throw concurrent sync warning.
  2. Pull catalog files.
  3. Map products by `numeric_sku` skipping `sync_locked = true` records.
  4. Mass upsert items into the database, tagging Amway specs.
  5. Set active to false (tombstone) on discontinued entries.
  6. Release advisory lock and refresh page view.

---

## Asset Bundle Utility ("Prepare for posting")

- Available on content pages marked `ready`, `scheduled`, or `live`.
- Streams files directly from private Supabase Storage buckets using server-side zip streaming backend (`GET /api/content/[id]/bundle`).
- Enforces strict 50MB per-file upload validations, MIME check filters, and a 200MB maximum zip file body limit to prevent Vercel execution timeouts or memory bloat.

---

## User Workflows

### 1. Idea Capture & Promotion
- Mobile Safari $	o$ `/inbox` $	o$ quick note input $	o$ Save.
- Later: Click "Promote $	o$ Pillar" or "Promote $	o$ Script Draft". Auto-populates the new workspace with the inbox note content.

### 2. Building out evergreen topics
- Pillar details $	o$ Create research entries (attaching PDFs, images, or web bookmarks).
- Connect products to explain relevance (e.g., matching a protein supplement to a workout topic).

### 3. Posting Content
- Write scripts $	o$ Attach photos/videos.
- Set status to `ready`. Schedule post to channels on calendar (moves status to `scheduled`).
- On publish date: Copy Caption to clipboard in 1 click, stream the secure asset ZIP containing all photos/videos, post manually, then click "Mark Live" to set status to `live`.

---

## Design Modifications (v3 → v4)

| # | Area | Change | Rationale |
|---|---|---|---|
| 1 | DB Schema | Changed user_id columns from uuid to text. Defined `get_clerk_user_id()` helper to resolve Pre-mortem blocker #1. | Pre-mortem blocker #1: Clerk sub is text, Supabase auth.users ID is uuid. Type mismatch blocks all queries. |
| 2 | RLS Framework | Established dynamic `request.jwt.claims` JSON mapping to Clerk IDs. | Ensures security scopes validate correctly without local dev failure. |
| 3 | Concurrency Control | Integrated pg advisory locks for synching. | Protects database records during simultaneous clicks or sync restarts. |
| 4 | Product Data Model | Replaced canonical ID maps with numeric SKU indices. | Accommodates external catalog indexing. |
| 5 | Product Sync | Added advisory lock concurrency guard, env var names for cross-Supabase access, sync unlock UX, site-filtered join across master→source tables. Price is already numeric — no parsing needed. | Pre-mortem findings: no concurrency guard, no unlock path. Source schema is more complex than assumed (two-table, multi-site). |
| 6 | Pillar Assoc. | Removed `ContentPiece.pillar_id`. Junction-only with `is_primary` flag + partial unique index. | Pre-mortem blocker #3: dual-path had no enforcement. Junction-only eliminates inconsistency by design. |
| 7 | Middleware | Changed "Never create middleware.ts" → "middleware.ts exists for clerkMiddleware() only." | Pre-mortem finding: existing proxy.ts comment contradicted the hard constraint. |
| 8 | Search | Specified 'simple' text search config, UNION ALL query strategy, debounce/min-length, top-20 limit. | Pre-mortem findings: no language config, fan-out latency, no debounce. |
| 9 | ScheduleEntry | Added ON DELETE RESTRICT on channel_id FK. | Pre-mortem finding: deleting a channel with entries would throw unhandled FK violation. |
| 10 | Asset | Added file_size_bytes, max file size (50 MB), MIME validation, bundle size guard (200 MB). | Pre-mortem finding: no upload limits, unbounded zip memory. |
| 11 | QuickCapture | Specified UI behavior when promoted target is deleted ("(deleted)" label). Phase 3 disables promote-to-content-piece. | Pre-mortem findings: dangling promoted_id, feature half-dead for 3 phases. |
| 12 | Phase 5 | ALTER TYPE runs in its own migration file outside transaction. | Pre-mortem finding: Postgres enum alteration is transaction-dependent. |
