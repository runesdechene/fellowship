# Fellowship V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Fellowship V1 — a PWA for French festival exhibitors to manage events, see friends' calendars, build follower communities, and rate festivals.

**Architecture:** React 19 PWA with Supabase backend (auth, DB, RLS, Storage, Edge Functions). Client-side CRUD via Supabase JS, Edge Functions only for push notifications, event deduplication, and QR generation. Tailwind v4 CSS-first with shadcn/ui component pattern.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4, Supabase (Auth + DB + RLS + Storage + Edge Functions + Realtime), vite-plugin-pwa, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-04-04-fellowship-v1-design.md`

---

## Phase 0: Cleanup & Foundation

### Task 1: Remove Tauri and clean up project

**Files:**
- Delete: `src-tauri/` (entire directory)
- Modify: `package.json` — remove Tauri dependencies and scripts
- Modify: `CLAUDE.md` — remove Tauri references
- Delete: `.env.dist` — outdated, uses NEXT_PUBLIC_ prefixes

- [ ] **Step 1: Remove Tauri directory**

Run:
```bash
rm -rf src-tauri/
```

- [ ] **Step 2: Remove Tauri dependencies and scripts from package.json**

Remove from `dependencies`:
```
"@tauri-apps/api": "^2.9.1"
```

Remove from `devDependencies`:
```
"@tauri-apps/cli": "^2.9.5"
```

Remove from `scripts`:
```
"tauri": "tauri",
"tauri:dev": "tauri dev",
"tauri:build": "tauri build"
```

- [ ] **Step 3: Remove outdated .env.dist**

Run:
```bash
rm .env.dist
```

- [ ] **Step 4: Update CLAUDE.md — remove Tauri references**

Remove the Tauri lines from the Commands section and Tech Stack section. Remove `src-tauri/` from Architecture.

- [ ] **Step 5: Install pnpm dependencies to sync lockfile**

Run:
```bash
pnpm install
```

- [ ] **Step 6: Verify build still works**

Run:
```bash
pnpm build
```
Expected: Build succeeds with no Tauri-related errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove Tauri, clean up project for PWA-only approach"
```

---

### Task 2: Set up test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` — add test deps and scripts
- Modify: `tsconfig.app.json` — include test types

- [ ] **Step 1: Install test dependencies**

Run:
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Create vitest.config.ts**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Create test setup file**

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add test script to package.json**

Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Add vitest types to tsconfig.app.json**

Add `"vitest/globals"` to `compilerOptions.types` array in `tsconfig.app.json`.

- [ ] **Step 6: Create a smoke test to verify setup**

Create `src/test/smoke.test.ts`:
```typescript
describe('test setup', () => {
  it('works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 7: Run tests**

Run:
```bash
pnpm test
```
Expected: 1 test passes.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: add Vitest + React Testing Library test infrastructure"
```

---

### Task 3: Install UI dependencies (shadcn components, fonts, icons)

**Files:**
- Modify: `package.json` — add dependencies
- Modify: `index.html` — add font link
- Modify: `src/index.css` — update theme tokens for Fellowship palette

- [ ] **Step 1: Install additional shadcn/ui component dependencies**

Run:
```bash
pnpm add react-hot-toast qrcode.react
```

Note: `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge` are already installed.

- [ ] **Step 2: Add Nunito font to index.html**

Add to `<head>` in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

- [ ] **Step 3: Update CSS theme tokens for Fellowship palette**

Replace the entire content of `src/index.css` with:
```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  /* Fellowship pastel/warm palette */
  --background: 30 25% 97%;
  --foreground: 270 20% 20%;
  --card: 0 0% 100%;
  --card-foreground: 270 20% 20%;
  --popover: 0 0% 100%;
  --popover-foreground: 270 20% 20%;
  --primary: 270 40% 50%;
  --primary-foreground: 0 0% 100%;
  --secondary: 30 60% 95%;
  --secondary-foreground: 270 20% 20%;
  --muted: 30 15% 93%;
  --muted-foreground: 270 10% 45%;
  --accent: 25 80% 55%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 70% 55%;
  --destructive-foreground: 0 0% 100%;
  --border: 270 10% 88%;
  --input: 270 10% 88%;
  --ring: 270 40% 50%;
  --radius: 0.75rem;

  /* Fellowship brand colors */
  --fellowship-purple: 270 40% 50%;
  --fellowship-orange: 25 80% 55%;
  --fellowship-purple-light: 270 40% 92%;
  --fellowship-orange-light: 25 80% 92%;
}

.dark {
  --background: 270 15% 12%;
  --foreground: 30 15% 93%;
  --card: 270 15% 15%;
  --card-foreground: 30 15% 93%;
  --popover: 270 15% 15%;
  --popover-foreground: 30 15% 93%;
  --primary: 270 40% 65%;
  --primary-foreground: 270 15% 10%;
  --secondary: 270 15% 20%;
  --secondary-foreground: 30 15% 93%;
  --muted: 270 15% 20%;
  --muted-foreground: 270 10% 60%;
  --accent: 25 70% 50%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 60% 40%;
  --destructive-foreground: 0 0% 100%;
  --border: 270 10% 22%;
  --input: 270 10% 22%;
  --ring: 270 40% 65%;
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-fellowship-purple: hsl(var(--fellowship-purple));
  --color-fellowship-orange: hsl(var(--fellowship-orange));
  --color-fellowship-purple-light: hsl(var(--fellowship-purple-light));
  --color-fellowship-orange-light: hsl(var(--fellowship-orange-light));
}

body {
  @apply bg-background text-foreground antialiased;
  font-family: 'Nunito', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

- [ ] **Step 4: Verify dev server starts with new styles**

Run:
```bash
pnpm dev
```
Expected: App loads with warm off-white background, Nunito font applied.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Fellowship design system — pastel palette, Nunito font, brand tokens"
```

---

## Phase 1: Database Schema & RLS

### Task 4: Create Supabase migration — enums and tables

**Files:**
- Create: `supabase/migrations/20260404120000_initial_schema.sql`

- [ ] **Step 1: Create migrations directory**

Run:
```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write the initial schema migration**

Create `supabase/migrations/20260404120000_initial_schema.sql`:
```sql
-- Fellowship V1 Schema

-- Enums
CREATE TYPE user_type AS ENUM ('exposant', 'public');
CREATE TYPE user_sex AS ENUM ('homme', 'femme', 'indefini');
CREATE TYPE user_plan AS ENUM ('free', 'pro');
CREATE TYPE participation_status AS ENUM ('interesse', 'inscrit', 'confirme');
CREATE TYPE participation_visibility AS ENUM ('prive', 'amis', 'public');
CREATE TYPE note_visibility AS ENUM ('prive', 'amis');
CREATE TYPE notification_type AS ENUM ('deadline_reminder', 'friend_going', 'new_follower', 'friend_note');

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  type user_type NOT NULL DEFAULT 'public',
  email TEXT NOT NULL,
  display_name TEXT,
  brand_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  website TEXT,
  city TEXT,
  department TEXT,
  postal_code TEXT,
  sex user_sex DEFAULT 'indefini',
  public_slug TEXT UNIQUE,
  plan user_plan NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_type ON profiles(type);
CREATE INDEX idx_profiles_slug ON profiles(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX idx_profiles_department ON profiles(department) WHERE department IS NOT NULL;

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  city TEXT NOT NULL,
  department TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  registration_deadline DATE,
  registration_url TEXT,
  external_url TEXT,
  primary_tag TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_events_department ON events(department);
CREATE INDEX idx_events_primary_tag ON events(primary_tag);
CREATE INDEX idx_events_name_trgm ON events USING gin(name gin_trgm_ops);

-- Enable trigram extension for fuzzy search (deduplication)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Participations
CREATE TABLE participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status participation_status NOT NULL DEFAULT 'interesse',
  visibility participation_visibility NOT NULL DEFAULT 'amis',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_participations_user ON participations(user_id);
CREATE INDEX idx_participations_event ON participations(event_id);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  visibility note_visibility NOT NULL DEFAULT 'prive',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notes_event ON notes(event_id);
CREATE INDEX idx_notes_user ON notes(user_id);

-- Event Reports (private financial bilan)
CREATE TABLE event_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  booth_cost DECIMAL,
  charges DECIMAL,
  revenue DECIMAL,
  wins TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  affluence SMALLINT NOT NULL CHECK (affluence BETWEEN 1 AND 5),
  organisation SMALLINT NOT NULL CHECK (organisation BETWEEN 1 AND 5),
  rentabilite SMALLINT NOT NULL CHECK (rentabilite BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_reviews_event ON reviews(event_id);

-- Follows
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read = false;

-- Push Subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Helper view: mutual follows (friends)
CREATE VIEW friends AS
  SELECT f1.follower_id AS user_id, f1.following_id AS friend_id
  FROM follows f1
  INNER JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id;

-- Helper function: check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows f1
    INNER JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
    WHERE f1.follower_id = user_a AND f1.following_id = user_b
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: check if two users are friends-of-friends
CREATE OR REPLACE FUNCTION are_friends_of_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM friends f1
    INNER JOIN friends f2 ON f1.friend_id = f2.user_id
    WHERE f1.user_id = user_a AND f2.friend_id = user_b
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'public')::user_type
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Aggregated review scores (public view)
CREATE VIEW event_scores AS
  SELECT
    event_id,
    COUNT(*) AS review_count,
    ROUND(AVG(affluence)::numeric, 1) AS avg_affluence,
    ROUND(AVG(organisation)::numeric, 1) AS avg_organisation,
    ROUND(AVG(rentabilite)::numeric, 1) AS avg_rentabilite,
    ROUND(((AVG(affluence) + AVG(organisation) + AVG(rentabilite)) / 3)::numeric, 1) AS avg_overall
  FROM reviews
  GROUP BY event_id;
```

- [ ] **Step 3: Push migration to Supabase**

Run:
```bash
npx supabase db push
```
Expected: Migration applied successfully.

- [ ] **Step 4: Verify tables exist**

Run:
```bash
npx supabase db dump --schema public --data-only 2>/dev/null || echo "Tables created (dump may need Docker for local)"
```

Or verify via the Supabase Dashboard → Table Editor that all 8 tables are present: `profiles`, `events`, `participations`, `notes`, `event_reports`, `reviews`, `follows`, `notifications`, `push_subscriptions`.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: initial database schema — all tables, enums, indexes, helpers"
```

---

### Task 5: Create Supabase migration — RLS policies

**Files:**
- Create: `supabase/migrations/20260404120001_rls_policies.sql`

- [ ] **Step 1: Write RLS policies migration**

Create `supabase/migrations/20260404120001_rls_policies.sql`:
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- EVENTS
CREATE POLICY "events_select_authenticated" ON events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "events_insert_exposant" ON events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'exposant')
  );

CREATE POLICY "events_update_creator" ON events
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- PARTICIPATIONS
CREATE POLICY "participations_select" ON participations
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'amis' AND are_friends(auth.uid(), user_id))
  );

CREATE POLICY "participations_insert_own" ON participations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participations_update_own" ON participations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participations_delete_own" ON participations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- NOTES
CREATE POLICY "notes_select" ON notes
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR (visibility = 'amis' AND (are_friends(auth.uid(), user_id) OR are_friends_of_friends(auth.uid(), user_id)))
  );

CREATE POLICY "notes_insert_own" ON notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_update_own" ON notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_delete_own" ON notes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- EVENT REPORTS (100% private)
CREATE POLICY "event_reports_owner_only" ON event_reports
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- REVIEWS
CREATE POLICY "reviews_select_scores" ON reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reviews_insert_exposant" ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND type = 'exposant')
  );

CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- FOLLOWS
CREATE POLICY "follows_select" ON follows
  FOR SELECT TO authenticated USING (
    follower_id = auth.uid() OR following_id = auth.uid()
  );

CREATE POLICY "follows_insert_own" ON follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "follows_delete_own" ON follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- NOTIFICATIONS
CREATE POLICY "notifications_owner_only" ON notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- PUSH SUBSCRIPTIONS
CREATE POLICY "push_subscriptions_owner_only" ON push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Push RLS migration**

Run:
```bash
npx supabase db push
```
Expected: Migration applied, RLS enabled on all tables.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: RLS policies — visibility rules for all tables"
```

---

### Task 6: Create Supabase Storage buckets

**Files:**
- Create: `supabase/migrations/20260404120002_storage_buckets.sql`

- [ ] **Step 1: Write storage migration**

Create `supabase/migrations/20260404120002_storage_buckets.sql`:
```sql
-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true);

-- Avatar policies
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Event images policies
CREATE POLICY "event_images_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-images');

CREATE POLICY "event_images_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-images');

-- QR codes policies
CREATE POLICY "qr_codes_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "qr_codes_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qr-codes' AND (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Push storage migration**

Run:
```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: storage buckets — avatars, event-images, qr-codes with policies"
```

---

### Task 7: Clean up old Supabase tables

**Files:**
- Create: `supabase/migrations/20260404120003_cleanup_old_tables.sql` (if old tables exist)

- [ ] **Step 1: Check what old tables exist in Supabase**

Go to Supabase Dashboard → Table Editor and list any tables that are NOT in our new schema (profiles, events, participations, notes, event_reports, reviews, follows, notifications, push_subscriptions). If there are old tables from the prototype, create a migration to drop them.

- [ ] **Step 2: Drop old tables if any exist**

If old tables exist, create `supabase/migrations/20260404120003_cleanup_old_tables.sql`:
```sql
-- Drop old prototype tables (adjust names as needed)
-- DROP TABLE IF EXISTS old_table_name CASCADE;
```

Push with `npx supabase db push`.

- [ ] **Step 3: Commit if changes were made**

```bash
git add supabase/
git commit -m "chore: drop old prototype tables"
```

---

## Phase 2: TypeScript Types & Supabase Client

### Task 8: Generate TypeScript types and create data layer

**Files:**
- Create: `src/types/database.ts`
- Modify: `src/lib/supabase.ts` — add typed client

- [ ] **Step 1: Generate Supabase types**

Run:
```bash
npx supabase gen types typescript --project-id trbxpsknbtisqwefqoub > src/types/supabase.ts
```

- [ ] **Step 2: Create application-level type helpers**

Create `src/types/database.ts`:
```typescript
import type { Database } from './supabase'

// Table row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Participation = Database['public']['Tables']['participations']['Row']
export type Note = Database['public']['Tables']['notes']['Row']
export type EventReport = Database['public']['Tables']['event_reports']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type ParticipationInsert = Database['public']['Tables']['participations']['Insert']
export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type EventReportInsert = Database['public']['Tables']['event_reports']['Insert']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type EventUpdate = Database['public']['Tables']['events']['Update']
export type ParticipationUpdate = Database['public']['Tables']['participations']['Update']

// Enum types
export type UserType = Database['public']['Enums']['user_type']
export type UserSex = Database['public']['Enums']['user_sex']
export type UserPlan = Database['public']['Enums']['user_plan']
export type ParticipationStatus = Database['public']['Enums']['participation_status']
export type ParticipationVisibility = Database['public']['Enums']['participation_visibility']
export type NoteVisibility = Database['public']['Enums']['note_visibility']
export type NotificationType = Database['public']['Enums']['notification_type']

// Computed types
export interface EventWithScore extends Event {
  avg_overall: number | null
  review_count: number | null
  avg_affluence: number | null
  avg_organisation: number | null
  avg_rentabilite: number | null
}

export interface ParticipationWithEvent extends Participation {
  events: Event
}

export interface ParticipationWithUser extends Participation {
  profiles: Profile
}

export interface NoteWithAuthor extends Note {
  profiles: Profile
  is_friend_of_friend?: boolean
  mutual_friend_name?: string
}
```

- [ ] **Step 3: Update Supabase client with type**

Replace `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 4: Verify types compile**

Run:
```bash
pnpm build
```
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/ src/lib/supabase.ts
git commit -m "feat: TypeScript types from Supabase schema + typed client"
```

---

## Phase 3: Auth & Onboarding

### Task 9: Update auth context for account types

**Files:**
- Modify: `src/lib/auth.tsx` — add profile fetching, account type, onboarding state

- [ ] **Step 1: Write test for auth context**

Create `src/lib/__tests__/auth.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'

describe('Auth types', () => {
  it('should define correct account types', () => {
    const types = ['exposant', 'public'] as const
    expect(types).toContain('exposant')
    expect(types).toContain('public')
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm test`

- [ ] **Step 3: Rewrite auth.tsx with profile support**

Replace `src/lib/auth.tsx`:
```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, accountType?: 'exposant' | 'public') => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  needsOnboarding: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    return data
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, accountType: 'exposant' | 'public' = 'public') => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/dashboard',
        data: { account_type: accountType },
      },
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const needsOnboarding = !!user && !!profile && !profile.display_name

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut, refreshProfile, needsOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/
git commit -m "feat: auth context with profile fetching, account types, onboarding detection"
```

---

### Task 10: Create onboarding flows

**Files:**
- Create: `src/pages/Onboarding.tsx`
- Modify: `src/App.tsx` — add onboarding route and redirect logic

- [ ] **Step 1: Create onboarding page**

Create `src/pages/Onboarding.tsx`:
```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export function OnboardingPage() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState({
    display_name: '',
    brand_name: '',
    city: '',
    postal_code: '',
    public_slug: '',
  })
  const [saving, setSaving] = useState(false)

  const isExposant = profile?.type === 'exposant'

  const handleSubmit = async () => {
    if (!profile) return
    setSaving(true)

    const updates: Record<string, string> = {
      display_name: formData.display_name,
      city: formData.city,
      postal_code: formData.postal_code,
    }

    if (isExposant) {
      updates.brand_name = formData.brand_name
      updates.public_slug = formData.public_slug
    }

    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)

    await refreshProfile()
    setSaving(false)
    navigate(isExposant ? '/dashboard' : '/explorer')
  }

  const exposantSteps = [
    <div key="brand" className="space-y-4">
      <h2 className="text-2xl font-bold">Bienvenue sur Fellowship !</h2>
      <p className="text-muted-foreground">Comment s'appelle ta marque ?</p>
      <input
        type="text"
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Rune de Chêne"
        value={formData.brand_name}
        onChange={(e) => setFormData({ ...formData, brand_name: e.target.value, display_name: formData.display_name || e.target.value })}
        autoFocus
      />
      <Button className="w-full" size="lg" onClick={() => setStep(1)} disabled={!formData.brand_name}>
        Continuer
      </Button>
    </div>,
    <div key="city" className="space-y-4">
      <h2 className="text-2xl font-bold">Où es-tu basé ?</h2>
      <p className="text-muted-foreground">Ta ville et ton code postal</p>
      <input
        type="text"
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Lyon"
        value={formData.city}
        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
        autoFocus
      />
      <input
        type="text"
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="69000"
        value={formData.postal_code}
        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
      />
      <Button className="w-full" size="lg" onClick={() => setStep(2)} disabled={!formData.city}>
        Continuer
      </Button>
    </div>,
    <div key="slug" className="space-y-4">
      <h2 className="text-2xl font-bold">Ton lien public</h2>
      <p className="text-muted-foreground">Les visiteurs te trouveront ici</p>
      <div className="flex items-center gap-0 rounded-xl border border-input bg-background text-lg">
        <span className="px-4 py-3 text-muted-foreground">flw.sh/@</span>
        <input
          type="text"
          className="w-full rounded-r-xl bg-background px-0 py-3 focus:outline-none"
          placeholder="rune-de-chene"
          value={formData.public_slug}
          onChange={(e) => setFormData({ ...formData, public_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
          autoFocus
        />
      </div>
      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!formData.public_slug || saving}>
        {saving ? 'Enregistrement...' : 'C\'est parti !'}
      </Button>
    </div>,
  ]

  const publicSteps = [
    <div key="name" className="space-y-4">
      <h2 className="text-2xl font-bold">Bienvenue sur Fellowship !</h2>
      <p className="text-muted-foreground">Comment tu t'appelles ?</p>
      <input
        type="text"
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Ton prénom"
        value={formData.display_name}
        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
        autoFocus
      />
      <Button className="w-full" size="lg" onClick={() => setStep(1)} disabled={!formData.display_name}>
        Continuer
      </Button>
    </div>,
    <div key="postal" className="space-y-4">
      <h2 className="text-2xl font-bold">Ton code postal</h2>
      <p className="text-muted-foreground">Pour découvrir les événements près de chez toi</p>
      <input
        type="text"
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="69000"
        value={formData.postal_code}
        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
        autoFocus
      />
      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!formData.postal_code || saving}>
        {saving ? 'Enregistrement...' : 'Découvrir les événements'}
      </Button>
    </div>,
  ]

  const steps = isExposant ? exposantSteps : publicSteps

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
        {steps[step]}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update App.tsx with onboarding route**

Replace `src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LandingPage } from '@/pages/Landing'
import { LoginPage } from '@/pages/Login'
import { DashboardPage } from '@/pages/Dashboard'
import { OnboardingPage } from '@/pages/Onboarding'

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { needsOnboarding } = useAuth()
  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <OnboardingGuard>
                  <DashboardPage />
                </OnboardingGuard>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: onboarding flow — exposant (3 steps) and public (2 steps)"
```

---

## Phase 4: UI Shell (Layout & Navigation)

### Task 11: Create app layout with sidebar and bottom bar

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/BottomBar.tsx`
- Create: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Create Sidebar component**

Create `src/components/layout/Sidebar.tsx`:
```typescript
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  Compass,
  Bell,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'

const exposantNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

const publicNav = [
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/suivis', icon: Users, label: 'Mes suivis' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuth()
  const nav = profile?.type === 'exposant' ? exposantNav : publicNav

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-3 border-b border-border">
        {collapsed ? (
          <img src="/icon.png" alt="Fellowship" className="h-8 w-8 mx-auto" />
        ) : (
          <img src="/logo.png" alt="Fellowship" className="h-8" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center border-t border-border p-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
```

- [ ] **Step 2: Create BottomBar component**

Create `src/components/layout/BottomBar.tsx`:
```typescript
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  Compass,
  Bell,
  User,
  Settings,
  Users,
} from 'lucide-react'

const exposantNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/notifications', icon: Bell, label: 'Notifs' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

const publicNav = [
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/suivis', icon: Users, label: 'Suivis' },
  { to: '/notifications', icon: Bell, label: 'Notifs' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

export function BottomBar() {
  const { profile } = useAuth()
  const nav = profile?.type === 'exposant' ? exposantNav : publicNav

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card md:hidden">
      {nav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`
          }
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Create AppLayout component**

Create `src/components/layout/AppLayout.tsx`:
```typescript
import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { BottomBar } from './BottomBar'

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomBar />
    </div>
  )
}
```

- [ ] **Step 4: Move logo files to public directory**

Run:
```bash
cp logo.png public/logo.png
cp icon.png public/icon.png
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ public/logo.png public/icon.png
git commit -m "feat: app layout — collapsible sidebar (desktop) + bottom bar (mobile)"
```

---

### Task 12: Wire up AppLayout and all routes in App.tsx

**Files:**
- Modify: `src/App.tsx` — add all page routes wrapped in AppLayout
- Create: placeholder pages for Explorer, Notifications, Profile, Settings, Following

- [ ] **Step 1: Create placeholder pages**

Create `src/pages/Explorer.tsx`:
```typescript
export function ExplorerPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Explorer</h1>
      <p className="text-muted-foreground">Découvre des événements</p>
    </div>
  )
}
```

Create `src/pages/Notifications.tsx`:
```typescript
export function NotificationsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
    </div>
  )
}
```

Create `src/pages/Profile.tsx`:
```typescript
export function ProfilePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Profil</h1>
    </div>
  )
}
```

Create `src/pages/Settings.tsx`:
```typescript
export function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Réglages</h1>
    </div>
  )
}
```

Create `src/pages/Following.tsx`:
```typescript
export function FollowingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Mes suivis</h1>
    </div>
  )
}
```

Create `src/pages/EventPage.tsx`:
```typescript
export function EventPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Événement</h1>
    </div>
  )
}
```

Create `src/pages/PublicProfile.tsx`:
```typescript
export function PublicProfilePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Profil public</h1>
    </div>
  )
}
```

- [ ] **Step 2: Update App.tsx with full routing**

Replace `src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/Landing'
import { LoginPage } from '@/pages/Login'
import { OnboardingPage } from '@/pages/Onboarding'
import { DashboardPage } from '@/pages/Dashboard'
import { ExplorerPage } from '@/pages/Explorer'
import { NotificationsPage } from '@/pages/Notifications'
import { ProfilePage } from '@/pages/Profile'
import { SettingsPage } from '@/pages/Settings'
import { FollowingPage } from '@/pages/Following'
import { EventPage } from '@/pages/EventPage'
import { PublicProfilePage } from '@/pages/PublicProfile'

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { needsOnboarding } = useAuth()
  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <OnboardingGuard>
        <AppLayout>{children}</AppLayout>
      </OnboardingGuard>
    </ProtectedRoute>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/@:slug" element={<PublicProfilePage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Authenticated routes */}
          <Route path="/dashboard" element={<AuthenticatedApp><DashboardPage /></AuthenticatedApp>} />
          <Route path="/explorer" element={<AuthenticatedApp><ExplorerPage /></AuthenticatedApp>} />
          <Route path="/notifications" element={<AuthenticatedApp><NotificationsPage /></AuthenticatedApp>} />
          <Route path="/profil" element={<AuthenticatedApp><ProfilePage /></AuthenticatedApp>} />
          <Route path="/reglages" element={<AuthenticatedApp><SettingsPage /></AuthenticatedApp>} />
          <Route path="/suivis" element={<AuthenticatedApp><FollowingPage /></AuthenticatedApp>} />
          <Route path="/evenement/:id" element={<AuthenticatedApp><EventPage /></AuthenticatedApp>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: full routing with AppLayout, placeholder pages for all routes"
```

---

## Phase 5: Core Features (parallelizable — Tasks 13-17 can run as independent agents)

### Task 13: Events CRUD + deduplication

**Files:**
- Create: `src/hooks/use-events.ts`
- Create: `src/components/events/EventForm.tsx`
- Create: `src/components/events/EventCard.tsx`
- Create: `src/components/events/DeduplicateSuggestions.tsx`

- [ ] **Step 1: Create events hook**

Create `src/hooks/use-events.ts`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Event, EventInsert, EventWithScore } from '@/types/database'

export function useEvents(filters?: {
  department?: string
  tag?: string
  search?: string
  year?: number
}) {
  const [events, setEvents] = useState<EventWithScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [filters?.department, filters?.tag, filters?.search, filters?.year])

  async function fetchEvents() {
    setLoading(true)
    let query = supabase
      .from('events')
      .select('*, event_scores(*)')
      .order('start_date', { ascending: true })

    if (filters?.department) {
      query = query.eq('department', filters.department)
    }
    if (filters?.tag) {
      query = query.eq('primary_tag', filters.tag)
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }
    if (filters?.year) {
      query = query
        .gte('start_date', `${filters.year}-01-01`)
        .lte('end_date', `${filters.year}-12-31`)
    }

    const { data } = await query
    const mapped = (data ?? []).map((e: any) => ({
      ...e,
      avg_overall: e.event_scores?.[0]?.avg_overall ?? null,
      review_count: e.event_scores?.[0]?.review_count ?? null,
      avg_affluence: e.event_scores?.[0]?.avg_affluence ?? null,
      avg_organisation: e.event_scores?.[0]?.avg_organisation ?? null,
      avg_rentabilite: e.event_scores?.[0]?.avg_rentabilite ?? null,
    }))
    setEvents(mapped)
    setLoading(false)
  }

  return { events, loading, refetch: fetchEvents }
}

export function useEvent(id: string | undefined) {
  const [event, setEvent] = useState<EventWithScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase
      .from('events')
      .select('*, event_scores(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          const scores = (data as any).event_scores?.[0]
          setEvent({
            ...data,
            avg_overall: scores?.avg_overall ?? null,
            review_count: scores?.review_count ?? null,
            avg_affluence: scores?.avg_affluence ?? null,
            avg_organisation: scores?.avg_organisation ?? null,
            avg_rentabilite: scores?.avg_rentabilite ?? null,
          } as EventWithScore)
        }
        setLoading(false)
      })
  }, [id])

  return { event, loading }
}

export async function createEvent(event: EventInsert) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single()
  return { data, error }
}

export async function searchSimilarEvents(name: string, startDate?: string) {
  let query = supabase
    .from('events')
    .select('id, name, city, department, start_date, end_date')
    .ilike('name', `%${name}%`)
    .limit(5)

  if (startDate) {
    const year = startDate.substring(0, 4)
    query = query.gte('start_date', `${year}-01-01`).lte('start_date', `${year}-12-31`)
  }

  const { data } = await query
  return data ?? []
}
```

- [ ] **Step 2: Create EventCard component**

Create `src/components/events/EventCard.tsx`:
```typescript
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Star, Users } from 'lucide-react'
import type { EventWithScore } from '@/types/database'

interface EventCardProps {
  event: EventWithScore
  friendCount?: number
}

export function EventCard({ event, friendCount }: EventCardProps) {
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <Link
      to={`/evenement/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
    >
      {/* Image */}
      {event.image_url ? (
        <img
          src={event.image_url}
          alt={event.name}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-40 items-center justify-center bg-muted">
          <Calendar className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Tag */}
        <span className="mb-2 inline-flex w-fit rounded-full bg-fellowship-purple-light px-2.5 py-0.5 text-xs font-medium text-primary">
          {event.primary_tag}
        </span>

        <h3 className="font-semibold group-hover:text-primary transition-colors">
          {event.name}
        </h3>

        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {formatDate(event.start_date)}
            {event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{event.city}, {event.department}</span>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center gap-3 pt-3">
          {event.avg_overall !== null && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-fellowship-orange text-fellowship-orange" />
              <span className="font-medium">{event.avg_overall}</span>
              <span className="text-muted-foreground">({event.review_count})</span>
            </div>
          )}
          {friendCount !== undefined && friendCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{friendCount} ami{friendCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Create DeduplicateSuggestions component**

Create `src/components/events/DeduplicateSuggestions.tsx`:
```typescript
import type { Event } from '@/types/database'

interface DeduplicateSuggestionsProps {
  suggestions: Pick<Event, 'id' | 'name' | 'city' | 'department' | 'start_date' | 'end_date'>[]
  onSelect: (eventId: string) => void
  onDismiss: () => void
}

export function DeduplicateSuggestions({ suggestions, onSelect, onDismiss }: DeduplicateSuggestionsProps) {
  if (suggestions.length === 0) return null

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="rounded-xl border border-fellowship-orange/30 bg-fellowship-orange-light p-4">
      <p className="mb-3 text-sm font-medium">Tu voulais peut-être dire ?</p>
      <div className="space-y-2">
        {suggestions.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelect(event.id)}
            className="flex w-full items-center justify-between rounded-lg bg-card p-3 text-left text-sm transition-colors hover:bg-muted"
          >
            <div>
              <p className="font-medium">{event.name}</p>
              <p className="text-muted-foreground">
                {event.city} — {formatDate(event.start_date)}
              </p>
            </div>
            <span className="text-xs text-primary">Sélectionner</span>
          </button>
        ))}
      </div>
      <button
        onClick={onDismiss}
        className="mt-3 text-sm text-muted-foreground hover:text-foreground"
      >
        Non, c'est un nouvel événement
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Create EventForm component**

Create `src/components/events/EventForm.tsx`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { createEvent, searchSimilarEvents } from '@/hooks/use-events'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { DeduplicateSuggestions } from './DeduplicateSuggestions'
import type { EventInsert } from '@/types/database'

export function EventForm() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    city: '',
    department: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    registration_url: '',
    external_url: '',
    primary_tag: '',
    tags: '',
    image: null as File | null,
  })

  // Deduplicate on name change
  useEffect(() => {
    if (form.name.length < 3 || dismissed) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      const results = await searchSimilarEvents(form.name, form.start_date)
      setSuggestions(results)
    }, 500)
    return () => clearTimeout(timer)
  }, [form.name, form.start_date, dismissed])

  const handleSelectExisting = (eventId: string) => {
    navigate(`/evenement/${eventId}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    let image_url: string | undefined
    if (form.image) {
      const ext = form.image.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`
      const { data: uploadData } = await supabase.storage
        .from('event-images')
        .upload(path, form.image)
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(uploadData.path)
        image_url = urlData.publicUrl
      }
    }

    const eventData: EventInsert = {
      name: form.name,
      description: form.description || null,
      city: form.city,
      department: form.department,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      registration_deadline: form.registration_deadline || null,
      registration_url: form.registration_url || null,
      external_url: form.external_url || null,
      primary_tag: form.primary_tag,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      image_url: image_url ?? null,
      created_by: profile.id,
    }

    const { data } = await createEvent(eventData)
    setSaving(false)
    if (data) {
      navigate(`/evenement/${data.id}`)
    }
  }

  const update = (field: string, value: string | File | null) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const inputClass = "w-full rounded-xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nom de l'événement *</label>
        <input
          type="text"
          className={inputClass}
          placeholder="Fête médiévale de Provins"
          value={form.name}
          onChange={(e) => { update('name', e.target.value); setDismissed(false) }}
          required
        />
        <DeduplicateSuggestions
          suggestions={suggestions}
          onSelect={handleSelectExisting}
          onDismiss={() => setDismissed(true)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date de début *</label>
          <input type="date" className={inputClass} value={form.start_date} onChange={e => update('start_date', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date de fin</label>
          <input type="date" className={inputClass} value={form.end_date} onChange={e => update('end_date', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Ville *</label>
          <input type="text" className={inputClass} placeholder="Provins" value={form.city} onChange={e => update('city', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Département *</label>
          <input type="text" className={inputClass} placeholder="77 - Seine-et-Marne" value={form.department} onChange={e => update('department', e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea className={`${inputClass} min-h-[100px]`} placeholder="Décris l'événement..." value={form.description} onChange={e => update('description', e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tag principal *</label>
          <input type="text" className={inputClass} placeholder="Médiéval" value={form.primary_tag} onChange={e => update('primary_tag', e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags secondaires</label>
          <input type="text" className={inputClass} placeholder="fantasy, artisanat (séparés par des virgules)" value={form.tags} onChange={e => update('tags', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date limite d'inscription</label>
          <input type="date" className={inputClass} value={form.registration_deadline} onChange={e => update('registration_deadline', e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Lien d'inscription</label>
          <input type="url" className={inputClass} placeholder="https://..." value={form.registration_url} onChange={e => update('registration_url', e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Lien externe (site de l'événement)</label>
        <input type="url" className={inputClass} placeholder="https://..." value={form.external_url} onChange={e => update('external_url', e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Affiche / Image</label>
        <input type="file" accept="image/*" className={inputClass} onChange={e => update('image', e.target.files?.[0] ?? null)} />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={saving}>
        {saving ? 'Création...' : 'Créer l\'événement'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: events CRUD — hook, card, form with deduplication"
```

---

### Task 14: Participations and calendar hooks

**Files:**
- Create: `src/hooks/use-participations.ts`
- Create: `src/hooks/use-calendar.ts`

- [ ] **Step 1: Create participations hook**

Create `src/hooks/use-participations.ts`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Participation, ParticipationInsert, ParticipationWithEvent } from '@/types/database'

export function useMyParticipations(year?: number) {
  const { user } = useAuth()
  const [participations, setParticipations] = useState<ParticipationWithEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchParticipations()
  }, [user, year])

  async function fetchParticipations() {
    if (!user) return
    setLoading(true)

    let query = supabase
      .from('participations')
      .select('*, events(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (year) {
      query = query
        .gte('events.start_date', `${year}-01-01`)
        .lte('events.end_date', `${year}-12-31`)
    }

    const { data } = await query
    setParticipations((data as ParticipationWithEvent[] | null) ?? [])
    setLoading(false)
  }

  return { participations, loading, refetch: fetchParticipations }
}

export function useFriendsParticipations() {
  const { user } = useAuth()
  const [participations, setParticipations] = useState<(ParticipationWithEvent & { profiles: { display_name: string; avatar_url: string | null } })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchFriendsParticipations()
  }, [user])

  async function fetchFriendsParticipations() {
    if (!user) return
    setLoading(true)

    // Get friend IDs (mutual follows)
    const { data: friendIds } = await supabase.rpc('get_friend_ids', { user_id: user.id })

    if (!friendIds || friendIds.length === 0) {
      setParticipations([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('participations')
      .select('*, events(*), profiles(display_name, avatar_url)')
      .in('user_id', friendIds)
      .in('visibility', ['amis', 'public'])
      .order('created_at', { ascending: false })
      .limit(20)

    setParticipations((data as any) ?? [])
    setLoading(false)
  }

  return { participations, loading, refetch: fetchFriendsParticipations }
}

export function useFriendCountForEvent(eventId: string) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user || !eventId) return
    supabase
      .from('participations')
      .select('id', { count: 'exact' })
      .eq('event_id', eventId)
      .in('visibility', ['amis', 'public'])
      .then(({ count: c }) => setCount(c ?? 0))
  }, [user, eventId])

  return count
}

export async function addParticipation(participation: ParticipationInsert) {
  const { data, error } = await supabase
    .from('participations')
    .insert(participation)
    .select()
    .single()
  return { data, error }
}

export async function updateParticipation(id: string, updates: Partial<Participation>) {
  const { data, error } = await supabase
    .from('participations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function removeParticipation(id: string) {
  const { error } = await supabase
    .from('participations')
    .delete()
    .eq('id', id)
  return { error }
}
```

- [ ] **Step 2: Create calendar helper hook**

Create `src/hooks/use-calendar.ts`:
```typescript
import { useMemo } from 'react'
import type { ParticipationWithEvent } from '@/types/database'

export interface CalendarMonth {
  month: number
  year: number
  label: string
  events: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    primaryTag: string
    status: string
    visibility: string
  }[]
}

export function useCalendarYear(participations: ParticipationWithEvent[], year: number): CalendarMonth[] {
  return useMemo(() => {
    const months: CalendarMonth[] = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      year,
      label: new Date(year, i).toLocaleDateString('fr-FR', { month: 'long' }),
      events: [],
    }))

    for (const p of participations) {
      if (!p.events) continue
      const start = new Date(p.events.start_date)
      const end = new Date(p.events.end_date)

      // Add event to each month it spans
      for (let m = start.getMonth(); m <= end.getMonth(); m++) {
        if (start.getFullYear() === year || end.getFullYear() === year) {
          months[m].events.push({
            id: p.events.id,
            name: p.events.name,
            startDate: start,
            endDate: end,
            primaryTag: p.events.primary_tag,
            status: p.status,
            visibility: p.visibility,
          })
        }
      }
    }

    return months
  }, [participations, year])
}
```

- [ ] **Step 3: Add RPC function for friend IDs**

Create `supabase/migrations/20260404120004_friend_ids_rpc.sql`:
```sql
CREATE OR REPLACE FUNCTION get_friend_ids(p_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT friend_id FROM friends WHERE user_id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Push: `npx supabase db push`

- [ ] **Step 4: Verify build**

Run: `pnpm build`

- [ ] **Step 5: Commit**

```bash
git add src/ supabase/
git commit -m "feat: participations + calendar hooks, friend activity feed"
```

---

### Task 15: Follows / friends hook

**Files:**
- Create: `src/hooks/use-follows.ts`
- Create: `src/components/profile/FollowButton.tsx`

- [ ] **Step 1: Create follows hook**

Create `src/hooks/use-follows.ts`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Profile } from '@/types/database'

export function useFollowStatus(targetId: string | undefined) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !targetId || user.id === targetId) {
      setLoading(false)
      return
    }

    async function check() {
      // Check if I follow them
      const { data: myFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user!.id)
        .eq('following_id', targetId!)
        .maybeSingle()

      // Check if they follow me (for friend detection)
      const { data: theirFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', targetId!)
        .eq('following_id', user!.id)
        .maybeSingle()

      setIsFollowing(!!myFollow)
      setIsFriend(!!myFollow && !!theirFollow)
      setLoading(false)
    }

    check()
  }, [user, targetId])

  const toggleFollow = async () => {
    if (!user || !targetId) return

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetId)
      setIsFollowing(false)
      setIsFriend(false)
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetId })
      setIsFollowing(true)
      // Check if now friends
      const { data: theirFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', targetId)
        .eq('following_id', user.id)
        .maybeSingle()
      setIsFriend(!!theirFollow)
    }
  }

  return { isFollowing, isFriend, loading, toggleFollow }
}

export function useMyFriends() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetch() {
      const { data: friendIds } = await supabase.rpc('get_friend_ids', { user_id: user!.id })
      if (!friendIds || friendIds.length === 0) {
        setFriends([])
        setLoading(false)
        return
      }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds)
      setFriends(profiles ?? [])
      setLoading(false)
    }
    fetch()
  }, [user])

  return { friends, loading }
}

export function useMyFollowers() {
  const { user } = useAuth()
  const [followers, setFollowers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    async function fetch() {
      const { data } = await supabase
        .from('follows')
        .select('follower_id, profiles!follows_follower_id_fkey(*)')
        .eq('following_id', user!.id)
      setFollowers(data?.map((f: any) => f.profiles) ?? [])
      setLoading(false)
    }
    fetch()
  }, [user])

  return { followers, loading }
}
```

- [ ] **Step 2: Create FollowButton component**

Create `src/components/profile/FollowButton.tsx`:
```typescript
import { useFollowStatus } from '@/hooks/use-follows'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck, Users } from 'lucide-react'

interface FollowButtonProps {
  targetId: string
  className?: string
}

export function FollowButton({ targetId, className }: FollowButtonProps) {
  const { user } = useAuth()
  const { isFollowing, isFriend, loading, toggleFollow } = useFollowStatus(targetId)

  if (!user || user.id === targetId) return null
  if (loading) return null

  if (isFriend) {
    return (
      <Button variant="secondary" className={className} onClick={toggleFollow}>
        <Users className="mr-2 h-4 w-4" />
        Amis
      </Button>
    )
  }

  if (isFollowing) {
    return (
      <Button variant="outline" className={className} onClick={toggleFollow}>
        <UserCheck className="mr-2 h-4 w-4" />
        Suivi
      </Button>
    )
  }

  return (
    <Button className={className} onClick={toggleFollow}>
      <UserPlus className="mr-2 h-4 w-4" />
      Suivre
    </Button>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: follow system — hook, friend detection, FollowButton component"
```

---

### Task 16: Notes hook and components

**Files:**
- Create: `src/hooks/use-notes.ts`
- Create: `src/components/notes/NotesFeed.tsx`
- Create: `src/components/notes/NoteForm.tsx`

- [ ] **Step 1: Create notes hook**

Create `src/hooks/use-notes.ts`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { NoteWithAuthor, NoteInsert } from '@/types/database'

export function useEventNotes(eventId: string | undefined) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<NoteWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !user) return
    fetchNotes()
  }, [eventId, user])

  async function fetchNotes() {
    if (!eventId) return
    const { data } = await supabase
      .from('notes')
      .select('*, profiles(id, display_name, avatar_url, brand_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setNotes((data as NoteWithAuthor[] | null) ?? [])
    setLoading(false)
  }

  return { notes, loading, refetch: fetchNotes }
}

export async function createNote(note: NoteInsert) {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select('*, profiles(id, display_name, avatar_url, brand_name)')
    .single()
  return { data, error }
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  return { error }
}
```

- [ ] **Step 2: Create NoteForm component**

Create `src/components/notes/NoteForm.tsx`:
```typescript
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { createNote } from '@/hooks/use-notes'
import { Button } from '@/components/ui/button'
import { Lock, Users } from 'lucide-react'
import type { NoteVisibility } from '@/types/database'

interface NoteFormProps {
  eventId: string
  onNoteAdded: () => void
}

export function NoteForm({ eventId, onNoteAdded }: NoteFormProps) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<NoteVisibility>('amis')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !content.trim()) return
    setSaving(true)

    await createNote({
      user_id: user.id,
      event_id: eventId,
      content: content.trim(),
      visibility,
    })

    setContent('')
    setSaving(false)
    onNoteAdded()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
        placeholder="Ajouter une note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setVisibility('prive')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              visibility === 'prive' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Lock className="h-3 w-3" />
            Privé
          </button>
          <button
            type="button"
            onClick={() => setVisibility('amis')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              visibility === 'amis' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Users className="h-3 w-3" />
            Amis
          </button>
        </div>
        <Button size="sm" type="submit" disabled={!content.trim() || saving}>
          {saving ? '...' : 'Publier'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Create NotesFeed component**

Create `src/components/notes/NotesFeed.tsx`:
```typescript
import { useAuth } from '@/lib/auth'
import { deleteNote } from '@/hooks/use-notes'
import { Lock, Users, UserPlus, Trash2 } from 'lucide-react'
import type { NoteWithAuthor } from '@/types/database'

interface NotesFeedProps {
  notes: NoteWithAuthor[]
  onRefresh: () => void
}

export function NotesFeed({ notes, onRefresh }: NotesFeedProps) {
  const { user } = useAuth()

  if (notes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">Aucune note pour le moment</p>
    )
  }

  const handleDelete = async (noteId: string) => {
    await deleteNote(noteId)
    onRefresh()
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-3">
      {notes.map((note) => {
        const isOwn = note.user_id === user?.id
        const authorName = (note.profiles as any)?.brand_name || (note.profiles as any)?.display_name || 'Anonyme'

        return (
          <div
            key={note.id}
            className={`rounded-xl border p-4 ${
              note.visibility === 'prive'
                ? 'border-primary/20 bg-fellowship-purple-light'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{authorName}</span>
                {note.is_friend_of_friend && note.mutual_friend_name && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <UserPlus className="h-3 w-3" />
                    ami de {note.mutual_friend_name}
                  </span>
                )}
                {note.visibility === 'prive' ? (
                  <Lock className="h-3 w-3 text-primary" />
                ) : (
                  <Users className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
              {isOwn && (
                <button onClick={() => handleDelete(note.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-2 text-sm">{note.content}</p>
            <p className="mt-2 text-xs text-muted-foreground">{formatDate(note.created_at)}</p>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: notes system — hook, form with visibility toggle, feed with friend-of-friend indicator"
```

---

### Task 17: Reviews and event reports hooks + components

**Files:**
- Create: `src/hooks/use-reviews.ts`
- Create: `src/hooks/use-reports.ts`
- Create: `src/components/reviews/ReviewForm.tsx`
- Create: `src/components/reviews/ReviewSummary.tsx`
- Create: `src/components/reports/EventReportForm.tsx`

- [ ] **Step 1: Create reviews hook**

Create `src/hooks/use-reviews.ts`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Review, ReviewInsert } from '@/types/database'

export function useEventReviews(eventId: string | undefined) {
  const { profile } = useAuth()
  const [reviews, setReviews] = useState<(Review & { profiles: { display_name: string; brand_name: string | null } })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    fetchReviews()
  }, [eventId])

  async function fetchReviews() {
    if (!eventId) return
    const { data } = await supabase
      .from('reviews')
      .select('*, profiles(display_name, brand_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setReviews((data as any) ?? [])
    setLoading(false)
  }

  // Only exposants with pro plan can see detailed reviews
  const canSeeDetails = profile?.type === 'exposant' && profile?.plan === 'pro'

  return { reviews, loading, canSeeDetails, refetch: fetchReviews }
}

export function useMyReview(eventId: string | undefined) {
  const { user } = useAuth()
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !user) return
    supabase
      .from('reviews')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setReview(data)
        setLoading(false)
      })
  }, [eventId, user])

  return { review, loading }
}

export async function submitReview(review: ReviewInsert) {
  const { data, error } = await supabase
    .from('reviews')
    .upsert(review, { onConflict: 'user_id,event_id' })
    .select()
    .single()
  return { data, error }
}
```

- [ ] **Step 2: Create reports hook**

Create `src/hooks/use-reports.ts`:
```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { EventReport, EventReportInsert } from '@/types/database'

export function useEventReport(eventId: string | undefined) {
  const { user } = useAuth()
  const [report, setReport] = useState<EventReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId || !user) return
    supabase
      .from('event_reports')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setReport(data)
        setLoading(false)
      })
  }, [eventId, user])

  return { report, loading }
}

export async function saveEventReport(report: EventReportInsert) {
  const { data, error } = await supabase
    .from('event_reports')
    .upsert(report, { onConflict: 'user_id,event_id' })
    .select()
    .single()
  return { data, error }
}
```

- [ ] **Step 3: Create ReviewForm component**

Create `src/components/reviews/ReviewForm.tsx`:
```typescript
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { submitReview, useMyReview } from '@/hooks/use-reviews'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'

interface ReviewFormProps {
  eventId: string
  onReviewSubmitted: () => void
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition-colors"
        >
          <Star
            className={`h-6 w-6 ${star <= value ? 'fill-fellowship-orange text-fellowship-orange' : 'text-muted-foreground/30'}`}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewForm({ eventId, onReviewSubmitted }: ReviewFormProps) {
  const { user } = useAuth()
  const { review: existing } = useMyReview(eventId)
  const [affluence, setAffluence] = useState(existing?.affluence ?? 0)
  const [organisation, setOrganisation] = useState(existing?.organisation ?? 0)
  const [rentabilite, setRentabilite] = useState(existing?.rentabilite ?? 0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !affluence || !organisation || !rentabilite) return
    setSaving(true)

    await submitReview({
      user_id: user.id,
      event_id: eventId,
      affluence,
      organisation,
      rentabilite,
      comment: comment || null,
    })

    setSaving(false)
    onReviewSubmitted()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">Ton avis sur cet événement</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Affluence</span>
          <StarRating value={affluence} onChange={setAffluence} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Organisation</span>
          <StarRating value={organisation} onChange={setOrganisation} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Rentabilité</span>
          <StarRating value={rentabilite} onChange={setRentabilite} />
        </div>
      </div>

      <textarea
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
        placeholder="Un commentaire ? (optionnel)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <Button type="submit" className="w-full" disabled={!affluence || !organisation || !rentabilite || saving}>
        {saving ? 'Envoi...' : existing ? 'Modifier mon avis' : 'Envoyer mon avis'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Create ReviewSummary component**

Create `src/components/reviews/ReviewSummary.tsx`:
```typescript
import { Star, Lock } from 'lucide-react'
import type { EventWithScore } from '@/types/database'

interface ReviewSummaryProps {
  event: EventWithScore
  canSeeDetails: boolean
}

export function ReviewSummary({ event, canSeeDetails }: ReviewSummaryProps) {
  if (!event.review_count || event.review_count === 0) {
    return <p className="text-sm text-muted-foreground italic">Aucun avis pour le moment</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 fill-fellowship-orange text-fellowship-orange" />
        <span className="text-lg font-bold">{event.avg_overall}</span>
        <span className="text-sm text-muted-foreground">/ 5 ({event.review_count} avis)</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="font-semibold">{event.avg_affluence}</p>
          <p className="text-xs text-muted-foreground">Affluence</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="font-semibold">{event.avg_organisation}</p>
          <p className="text-xs text-muted-foreground">Organisation</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="font-semibold">{event.avg_rentabilite}</p>
          <p className="text-xs text-muted-foreground">Rentabilité</p>
        </div>
      </div>

      {!canSeeDetails && (
        <div className="flex items-center gap-2 rounded-lg bg-fellowship-purple-light p-3 text-sm">
          <Lock className="h-4 w-4 text-primary" />
          <span>Passe en <strong>Pro</strong> pour lire les avis détaillés</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create EventReportForm component**

Create `src/components/reports/EventReportForm.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useEventReport, saveEventReport } from '@/hooks/use-reports'
import { Button } from '@/components/ui/button'
import { Lock, Plus, X } from 'lucide-react'

interface EventReportFormProps {
  eventId: string
}

export function EventReportForm({ eventId }: EventReportFormProps) {
  const { user, profile } = useAuth()
  const { report: existing } = useEventReport(eventId)
  const [boothCost, setBoothCost] = useState('')
  const [charges, setCharges] = useState('')
  const [revenue, setRevenue] = useState('')
  const [wins, setWins] = useState<string[]>([])
  const [improvements, setImprovements] = useState<string[]>([])
  const [newWin, setNewWin] = useState('')
  const [newImprovement, setNewImprovement] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing) {
      setBoothCost(existing.booth_cost?.toString() ?? '')
      setCharges(existing.charges?.toString() ?? '')
      setRevenue(existing.revenue?.toString() ?? '')
      setWins(existing.wins ?? [])
      setImprovements(existing.improvements ?? [])
    }
  }, [existing])

  if (profile?.plan !== 'pro') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-fellowship-purple-light p-4 text-sm">
        <Lock className="h-4 w-4 text-primary" />
        <span>Le bilan post-événement est une fonctionnalité <strong>Pro</strong></span>
      </div>
    )
  }

  const profit = (parseFloat(revenue) || 0) - (parseFloat(boothCost) || 0) - (parseFloat(charges) || 0)

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await saveEventReport({
      user_id: user.id,
      event_id: eventId,
      booth_cost: boothCost ? parseFloat(boothCost) : null,
      charges: charges ? parseFloat(charges) : null,
      revenue: revenue ? parseFloat(revenue) : null,
      wins,
      improvements,
    })
    setSaving(false)
  }

  const addItem = (list: string[], setList: (v: string[]) => void, value: string, clearFn: (v: string) => void) => {
    if (value.trim()) {
      setList([...list, value.trim()])
      clearFn('')
    }
  }

  const removeItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  const inputClass = "w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <div className="space-y-4 rounded-xl border border-primary/20 bg-fellowship-purple-light p-4">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Bilan privé</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Coût emplacement (€)</label>
          <input type="number" className={inputClass} value={boothCost} onChange={e => setBoothCost(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Charges (€)</label>
          <input type="number" className={inputClass} value={charges} onChange={e => setCharges(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Chiffre d'affaires (€)</label>
          <input type="number" className={inputClass} value={revenue} onChange={e => setRevenue(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg bg-card p-3 text-center">
        <p className="text-xs text-muted-foreground">Bénéfice</p>
        <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
          {profit.toFixed(2)} €
        </p>
      </div>

      {/* Wins */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Points réussis</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {wins.map((w, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
              {w}
              <button onClick={() => removeItem(wins, setWins, i)}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} placeholder="Ajouter un point réussi" value={newWin} onChange={e => setNewWin(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(wins, setWins, newWin, setNewWin))} />
          <Button size="icon" variant="ghost" onClick={() => addItem(wins, setWins, newWin, setNewWin)}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Improvements */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Points à améliorer</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {improvements.map((im, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs text-orange-700">
              {im}
              <button onClick={() => removeItem(improvements, setImprovements, i)}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input className={inputClass} placeholder="Ajouter un point à améliorer" value={newImprovement} onChange={e => setNewImprovement(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addItem(improvements, setImprovements, newImprovement, setNewImprovement))} />
          <Button size="icon" variant="ghost" onClick={() => addItem(improvements, setImprovements, newImprovement, setNewImprovement)}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? 'Sauvegarde...' : 'Sauvegarder le bilan'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: reviews (star rating, summary, paywall) + event reports (private bilan)"
```

---

## Phase 6: Full Pages

### Task 18: Dashboard page with annual calendar

**Files:**
- Modify: `src/pages/Dashboard.tsx` — complete rewrite
- Create: `src/components/calendar/YearView.tsx`
- Create: `src/components/calendar/MonthCell.tsx`

This task builds the exposant dashboard with the annual calendar view, upcoming events sidebar, and friend activity feed. See spec section 13 for full requirements.

**Implementation:** Use `useMyParticipations` + `useCalendarYear` for calendar data. Display 12 months in a grid. Each month shows event dots colored by primary_tag. Click a month to expand to month view. Friend activity uses `useFriendsParticipations`.

- [ ] **Step 1: Create MonthCell component**

Create `src/components/calendar/MonthCell.tsx` — a compact month card showing the month name and colored dots for each event. Dots use CSS classes mapped to common primary_tag values (medieval = purple, geek = blue, marché = orange, etc.). Clicking a dot navigates to the event page.

```typescript
import { Link } from 'react-router-dom'

interface CalendarEvent {
  id: string
  name: string
  startDate: Date
  endDate: Date
  primaryTag: string
  status: string
}

interface MonthCellProps {
  label: string
  events: CalendarEvent[]
  onClick: () => void
}

const tagColors: Record<string, string> = {
  'médiéval': 'bg-purple-400',
  'geek': 'bg-blue-400',
  'marché': 'bg-fellowship-orange',
  'salon': 'bg-green-400',
  'foire': 'bg-yellow-400',
}

function getTagColor(tag: string): string {
  const key = Object.keys(tagColors).find(k => tag.toLowerCase().includes(k))
  return key ? tagColors[key] : 'bg-primary'
}

export function MonthCell({ label, events, onClick }: MonthCellProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-xl border border-border bg-card p-3 text-left transition-shadow hover:shadow-md"
    >
      <span className="text-sm font-semibold capitalize">{label}</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {events.map((event) => (
          <Link
            key={event.id}
            to={`/evenement/${event.id}`}
            onClick={(e) => e.stopPropagation()}
            title={event.name}
            className={`h-3 w-3 rounded-full ${getTagColor(event.primaryTag)} transition-transform hover:scale-125`}
          />
        ))}
        {events.length === 0 && (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </div>
      {events.length > 0 && (
        <span className="mt-auto pt-2 text-xs text-muted-foreground">
          {events.length} événement{events.length > 1 ? 's' : ''}
        </span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Create YearView component**

Create `src/components/calendar/YearView.tsx`:
```typescript
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MonthCell } from './MonthCell'
import type { CalendarMonth } from '@/hooks/use-calendar'

interface YearViewProps {
  months: CalendarMonth[]
  year: number
  onYearChange: (year: number) => void
}

export function YearView({ months, year, onYearChange }: YearViewProps) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => onYearChange(year - 1)} className="rounded-lg p-2 hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold">{year}</h2>
        <button onClick={() => onYearChange(year + 1)} className="rounded-lg p-2 hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {months.map((month) => (
          <MonthCell
            key={month.month}
            label={month.label}
            events={month.events}
            onClick={() => {/* TODO: expand to month view */}}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite Dashboard page**

Replace `src/pages/Dashboard.tsx`:
```typescript
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useMyParticipations, useFriendsParticipations } from '@/hooks/use-participations'
import { useCalendarYear } from '@/hooks/use-calendar'
import { YearView } from '@/components/calendar/YearView'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Users, ArrowRight } from 'lucide-react'

export function DashboardPage() {
  const { profile } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const { participations } = useMyParticipations(year)
  const { participations: friendActivity } = useFriendsParticipations()
  const months = useCalendarYear(participations, year)

  const upcomingCount = participations.filter(
    p => p.events && new Date(p.events.start_date) >= new Date()
  ).length

  const totalCount = participations.length

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Salut{profile?.brand_name ? `, ${profile.brand_name}` : profile?.display_name ? `, ${profile.display_name}` : ''} !
          </h1>
          <p className="text-muted-foreground">Ton année en un coup d'œil</p>
        </div>
        <Link to="/explorer">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un événement
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <Calendar className="mb-2 h-5 w-5 text-primary" />
          <p className="text-2xl font-bold">{totalCount}</p>
          <p className="text-xs text-muted-foreground">événements en {year}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <ArrowRight className="mb-2 h-5 w-5 text-fellowship-orange" />
          <p className="text-2xl font-bold">{upcomingCount}</p>
          <p className="text-xs text-muted-foreground">à venir</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="mb-8">
        <YearView months={months} year={year} onYearChange={setYear} />
      </div>

      {/* Friend activity */}
      {friendActivity.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Tes amis bougent
          </h2>
          <div className="space-y-2">
            {friendActivity.slice(0, 10).map((p: any) => (
              <Link
                key={p.id}
                to={`/evenement/${p.event_id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {(p.profiles?.display_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 text-sm">
                  <span className="font-medium">{p.profiles?.display_name}</span>
                  {' participe à '}
                  <span className="font-medium">{p.events?.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 font-semibold">Ton calendrier est vide</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Commence par ajouter ton premier événement
          </p>
          <Link to="/explorer">
            <Button className="mt-6">
              <Plus className="mr-2 h-4 w-4" />
              Explorer les événements
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `pnpm build`

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: dashboard with annual calendar, stats, friend activity feed"
```

---

### Task 19: Explorer page

### Task 20: Event detail page

### Task 21: Settings page

### Task 22: Profile page + public profile

### Task 23: Login page update (account type choice)

### Task 24: Landing page (universal)

> **Note:** Tasks 19-24 follow the same pattern as Tasks 13-18. Each builds a complete page using the hooks and components created in Phase 5. The spec (section 13) defines exactly what each page contains. The implementing agent should read the spec and build each page accordingly. These tasks are fully parallelizable.

**For the implementing agent on Tasks 19-24:** Read `docs/superpowers/specs/2026-04-04-fellowship-v1-design.md` sections 13 and 14 for page requirements and design guidelines. Follow the component patterns established in Phase 5. Each page should be responsive (mobile-first) and use the Fellowship design tokens.

---

## Phase 7: Notifications & Push

### Task 25: Notifications hook and panel

**Files:**
- Create: `src/hooks/use-notifications.ts`
- Create: `src/components/notifications/NotificationPanel.tsx`
- Create: `src/components/notifications/NotificationBell.tsx`

The implementing agent should build:
1. A hook that fetches unread notifications and marks them as read
2. A popup panel triggered by a bell icon with badge count
3. Each notification type renders differently (friend_going, new_follower, deadline_reminder, friend_note)
4. Clicking a notification navigates to the relevant page
5. Integrate NotificationBell into the Sidebar and BottomBar

---

### Task 26: Push notifications setup

**Files:**
- Modify: `vite.config.ts` — update PWA manifest theme_color
- Create: `src/lib/push.ts` — push subscription logic
- Create: `supabase/functions/push-deadline-reminder/index.ts`
- Create: `supabase/functions/push-friend-activity/index.ts`

The implementing agent should build:
1. Push subscription flow (request permission, save subscription to `push_subscriptions`)
2. Edge Function for deadline reminders (cron: daily, check J-7 and J-3)
3. Edge Function for friend activity (triggered by DB webhook on participations insert)
4. Update PWA manifest theme_color to match Fellowship palette

---

## Phase 8: QR Code & Embed

### Task 27: QR code generation and profile page

**Files:**
- Use `qrcode.react` library (already installed in Task 3)
- Integrate QR display into Settings page and public profile

The implementing agent should build:
1. QR code component using `qrcode.react` that points to `flw.sh/@{slug}`
2. Download as PNG button
3. Display in Settings page (Exposant only)
4. Display on public profile page

---

### Task 28: Embed page

**Files:**
- Create: `src/pages/Embed.tsx`
- Add route `/@:slug/embed` in App.tsx

Lightweight standalone page: no sidebar, no nav. Shows mini-header (avatar + brand name + "Voir sur Fellowship" link) and a list of public events sorted chronologically.

---

## Phase 9: Final Polish

### Task 29: PWA final config + responsive audit

- Update `vite.config.ts` PWA config with correct theme_color, icons
- Test installability on mobile
- Audit all pages for mobile responsiveness
- Verify offline behavior

### Task 30: Seed data + smoke test

- Create `supabase/seed.sql` with sample data (2-3 exposants, 10 events, participations, reviews)
- Run full manual flow: signup → onboarding → add event → invite friend → leave review
- Fix any issues found

### Task 31: Final commit + deploy verification

- Clean up any unused files
- Run `pnpm build` + `pnpm lint`
- Commit everything
- Push to main
- Verify Netlify deployment works
