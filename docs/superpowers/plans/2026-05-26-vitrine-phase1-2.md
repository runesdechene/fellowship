# Vitrine exposant — Phases 1 & 2 (données + vue publique DA) — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le backend des données de vitrine (galerie, liens, spécialités, vérifié) et refondre la vitrine publique (`PublicProfile`, route `/:slug`) au look maquette DA en lisant ces vraies données — en lecture seule (l'édition inline = Phase 3, plan séparé).

**Architecture:** Une migration ajoute 3 colonnes à `entities` + une table `entity_gallery` + un bucket `entity-gallery` (RLS via `can_act_as`). La page `PublicProfile` est réassemblée à partir de petits composants présentationnels (`src/components/vitrine/`) sur un nouveau `Vitrine.css` (tokens DA), avec deux helpers purs testés (`splitSeason`, helpers de liens). Le bouton Suivre réutilise `useFollowStatus`. Le lien nav « Ma vitrine » est rebranché vers `/{public_slug}`.

**Tech Stack:** React 19 + TS, Vite, Vitest, Tailwind v4 (CSS-first, tokens DA), Supabase (Postgres + RLS + Storage), pnpm. Stack Supabase locale (cf. `reference_supabase_cli`).

**Spec:** `docs/superpowers/specs/2026-05-26-vitrine-da-integration-design.md`
**Maquette (contrat visuel exact) :** `docs/decisions/assets/vitrine-exposant.html`

**Hors de CE plan (→ Phase 3-4, plan ultérieur) :** édition inline (cover/avatar/bio/specialties/links/galerie) et toggle vérifié admin. Ici tout est **lecture seule** ; les sections sans données sont simplement masquées.

---

## File Structure

- **Create** `supabase/migrations/20260526140000_vitrine.sql` — colonnes entities, trigger `verified`, table `entity_gallery` + RLS, bucket + policies storage.
- **Modify** `src/types/database.ts` — types dérivés `VitrineLink`, `EntityGalleryRow` (+ régénération `supabase.ts`).
- **Create** `src/lib/vitrine.ts` — helpers purs : `splitSeason`, `linkHost`, `linkTypeIcon`.
- **Create** `src/lib/vitrine.test.ts` — tests des helpers.
- **Create** `src/hooks/use-vitrine.ts` — fetch entité + galerie + participations + réseau pour un slug (extrait/regroupe la logique de `PublicProfile`).
- **Create** `src/components/vitrine/VitrineCover.tsx`, `VitrineHeader.tsx`, `VitrineStats.tsx`, `VitrineGallery.tsx`, `VitrineLinks.tsx`, `VitrineSeason.tsx`.
- **Create** `src/pages/Vitrine.css` — styles DA façon maquette.
- **Modify** `src/pages/PublicProfile.tsx` — réassemble la page avec les nouveaux composants + bouton Suivre + nudge.
- **Modify** `src/lib/navModel.ts` (+ son test) — lien « vitrine » dynamique vers `/{public_slug}`.

---

## PHASE 1 — Données & stockage

### Task 1 : Migration vitrine (schéma + RLS + bucket)

**Files:**
- Create: `supabase/migrations/20260526140000_vitrine.sql`

- [ ] **Step 1 : Écrire la migration**

`supabase/migrations/20260526140000_vitrine.sql` :
```sql
-- Vitrine exposant : colonnes entités + galerie + bucket. Cf. spec 2026-05-26-vitrine.

-- 1) Colonnes sur entities
ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS specialties text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS links       jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verified    boolean NOT NULL DEFAULT false;

-- 2) `verified` non modifiable par un client authentifié (anti auto-vérification).
--    Seul le service role / SQL direct (auth.uid() NULL) peut le changer.
CREATE OR REPLACE FUNCTION protect_entity_verified() RETURNS trigger AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified AND auth.uid() IS NOT NULL THEN
    NEW.verified := OLD.verified;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_entity_verified ON entities;
CREATE TRIGGER trg_protect_entity_verified BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION protect_entity_verified();

-- 3) Table galerie
CREATE TABLE IF NOT EXISTS entity_gallery (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_actor_id uuid NOT NULL REFERENCES entities(actor_id) ON DELETE CASCADE,
  image_url       text NOT NULL,
  position        int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entity_gallery_entity ON entity_gallery(entity_actor_id, position);

ALTER TABLE entity_gallery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gallery_select_all  ON entity_gallery;
DROP POLICY IF EXISTS gallery_write_owner ON entity_gallery;
CREATE POLICY gallery_select_all  ON entity_gallery FOR SELECT USING (true);
CREATE POLICY gallery_write_owner ON entity_gallery FOR ALL TO authenticated
  USING (can_act_as(entity_actor_id)) WITH CHECK (can_act_as(entity_actor_id));

-- 4) Bucket galerie (public en lecture, écriture propriétaire via dossier = actor_id)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('entity-gallery', 'entity-gallery', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "entity-gallery read"   ON storage.objects;
DROP POLICY IF EXISTS "entity-gallery write"  ON storage.objects;
DROP POLICY IF EXISTS "entity-gallery delete" ON storage.objects;
CREATE POLICY "entity-gallery read" ON storage.objects FOR SELECT
  USING (bucket_id = 'entity-gallery');
CREATE POLICY "entity-gallery write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'entity-gallery' AND can_act_as(((storage.foldername(name))[1])::uuid));
CREATE POLICY "entity-gallery delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'entity-gallery' AND can_act_as(((storage.foldername(name))[1])::uuid));
```

- [ ] **Step 2 : Appliquer sur la stack locale**

Run (binaire Supabase direct sur Windows — cf. `reference_supabase_cli`) :
`supabase db push` (ou `supabase migration up` selon le flux local).
Expected : migration appliquée sans erreur ; `entities` a les 3 colonnes, `entity_gallery` existe.

- [ ] **Step 3 : Vérifier le schéma + la RLS**

Run (SQL editor local ou `psql`) :
```sql
select column_name from information_schema.columns
  where table_name='entities' and column_name in ('specialties','links','verified');
-- attendu : 3 lignes
select count(*) from entity_gallery;            -- attendu : 0, table lisible
select * from storage.buckets where id='entity-gallery';  -- attendu : 1 ligne, public=true
```
Expected : colonnes présentes, table vide lisible, bucket public créé.

- [ ] **Step 4 : Commit**
```bash
git add supabase/migrations/20260526140000_vitrine.sql
git commit -m "feat(vitrine): migration — colonnes entities + entity_gallery + bucket + RLS"
```

> ⚠️ **Ne PAS pousser cette migration en prod** dans ce plan (main = prod, branche non mergée). Application **locale uniquement**. La prod sera migrée au merge de la branche.

---

### Task 2 : Types TypeScript

**Files:**
- Modify: `src/types/database.ts`
- (Régénérer `src/types/supabase.ts` si possible, sinon caster — cf. `reference_supabase_rpc_types`.)

- [ ] **Step 1 : Régénérer les types générés (si l'outil est dispo)**

Run : `supabase gen types typescript --local > src/types/supabase.ts`
Expected : `EntityRow` (dérivé de `supabase.ts`) gagne `specialties: string[]`, `links: Json`, `verified: boolean` ; un type `entity_gallery` apparaît.
Si la régénération n'est pas possible localement, **caster** les accès neufs (`(entity as any).links`) comme précédent projet — mais préférer la régénération.

- [ ] **Step 2 : Ajouter les types métier dans `database.ts`**

Dans `src/types/database.ts`, ajouter :
```ts
export type EntityGalleryRow = Database['public']['Tables']['entity_gallery']['Row']

/** Un lien externe de vitrine (stocké dans entities.links jsonb). */
export interface VitrineLink {
  type: 'website' | 'shop' | 'instagram' | 'facebook' | 'other'
  label: string
  url: string
}
```
(Si `entity_gallery` n'est pas dans `supabase.ts` après régénération, définir `EntityGalleryRow` à la main : `{ id: string; entity_actor_id: string; image_url: string; position: number; created_at: string }`.)

- [ ] **Step 3 : Vérifier la compilation**

Run : `pnpm build`
Expected : build OK (aucun usage des nouveaux champs encore, on type-check juste les ajouts).

- [ ] **Step 4 : Commit**
```bash
git add src/types/database.ts src/types/supabase.ts
git commit -m "feat(vitrine): types EntityGalleryRow + VitrineLink, EntityRow étendu"
```

---

## PHASE 2 — Vue publique (re-skin DA, lecture seule)

### Task 3 : Helper pur `splitSeason` (TDD)

**Files:**
- Create: `src/lib/vitrine.ts`
- Test: `src/lib/vitrine.test.ts`

Sépare les participations « inscrit » en à venir / passés, triées (à venir : début croissant ; passés : début décroissant), comme la maquette « Où me rencontrer ».

- [ ] **Step 1 : Test qui échoue**

`src/lib/vitrine.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { splitSeason, type SeasonEvent } from './vitrine'

const ev = (id: string, start: string): SeasonEvent =>
  ({ id, name: id, start_date: start, end_date: start, city: 'X', department: '01', tags: null, image_url: null })

describe('splitSeason', () => {
  const now = new Date('2026-06-15')
  it('sépare à venir / passés et trie', () => {
    const evs = [ev('a', '2026-09-05'), ev('b', '2026-01-10'), ev('c', '2026-07-01'), ev('d', '2026-03-02')]
    const { upcoming, past } = splitSeason(evs, now)
    expect(upcoming.map(e => e.id)).toEqual(['c', 'a'])   // croissant
    expect(past.map(e => e.id)).toEqual(['d', 'b'])        // décroissant
  })
  it('listes vides si rien', () => {
    expect(splitSeason([], now)).toEqual({ upcoming: [], past: [] })
  })
})
```

- [ ] **Step 2 : Lancer → échec**

Run : `pnpm vitest run src/lib/vitrine.test.ts`
Expected : FAIL (import non résolu).

- [ ] **Step 3 : Implémenter**

`src/lib/vitrine.ts` :
```ts
export interface SeasonEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  city: string
  department?: string
  tags: string[] | null
  image_url?: string | null
}

/** Sépare les événements en à venir (début ≥ now, tri croissant) et passés (tri décroissant). */
export function splitSeason(events: SeasonEvent[], now: Date): { upcoming: SeasonEvent[]; past: SeasonEvent[] } {
  const upcoming = events
    .filter(e => new Date(e.start_date) >= now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  const past = events
    .filter(e => new Date(e.start_date) < now)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
  return { upcoming, past }
}
```

- [ ] **Step 4 : Lancer → succès**

Run : `pnpm vitest run src/lib/vitrine.test.ts`
Expected : PASS (2 tests).

- [ ] **Step 5 : Commit**
```bash
git add src/lib/vitrine.ts src/lib/vitrine.test.ts
git commit -m "feat(vitrine): helper pur splitSeason (à venir / passés) testé"
```

---

### Task 4 : Helpers de liens `linkHost` / `linkTypeIcon` (TDD)

**Files:**
- Modify: `src/lib/vitrine.ts`
- Modify: `src/lib/vitrine.test.ts`

`linkHost` extrait l'hôte affichable d'une URL (`https://terresetflammes.fr/x` → `terresetflammes.fr`). `linkTypeIcon` mappe un `VitrineLink['type']` vers un nom d'icône lucide.

- [ ] **Step 1 : Test qui échoue (ajouter au fichier)**

Ajouter dans `src/lib/vitrine.test.ts` :
```ts
import { linkHost, linkTypeIcon } from './vitrine'

describe('linkHost', () => {
  it('extrait l\'hôte sans www', () => {
    expect(linkHost('https://www.terresetflammes.fr/boutique')).toBe('terresetflammes.fr')
  })
  it('renvoie la chaîne brute si URL invalide', () => {
    expect(linkHost('pas une url')).toBe('pas une url')
  })
})

describe('linkTypeIcon', () => {
  it('mappe les types connus', () => {
    expect(linkTypeIcon('instagram')).toBe('Instagram')
    expect(linkTypeIcon('shop')).toBe('ShoppingBag')
    expect(linkTypeIcon('website')).toBe('Globe')
  })
  it('type inconnu → Link', () => {
    expect(linkTypeIcon('other')).toBe('Link')
  })
})
```

- [ ] **Step 2 : Lancer → échec**

Run : `pnpm vitest run src/lib/vitrine.test.ts`
Expected : FAIL (linkHost/linkTypeIcon non exportés).

- [ ] **Step 3 : Implémenter (ajouter à `vitrine.ts`)**
```ts
import type { VitrineLink } from '@/types/database'

/** Hôte affichable d'une URL ; renvoie l'entrée brute si non parsable. */
export function linkHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/** Nom d'icône lucide pour un type de lien de vitrine. */
export function linkTypeIcon(type: VitrineLink['type']): string {
  switch (type) {
    case 'website': return 'Globe'
    case 'shop': return 'ShoppingBag'
    case 'instagram': return 'Instagram'
    case 'facebook': return 'Facebook'
    default: return 'Link'
  }
}
```

- [ ] **Step 4 : Lancer → succès**

Run : `pnpm vitest run src/lib/vitrine.test.ts`
Expected : PASS (4 tests ajoutés).

- [ ] **Step 5 : Commit**
```bash
git add src/lib/vitrine.ts src/lib/vitrine.test.ts
git commit -m "feat(vitrine): helpers linkHost + linkTypeIcon testés"
```

---

### Task 5 : Hook `use-vitrine` (chargement des données)

**Files:**
- Create: `src/hooks/use-vitrine.ts`

Extrait/regroupe le fetch déjà présent dans `PublicProfile.tsx` (entité par slug, participations `inscrit`, friends, followers) et **ajoute** le chargement de la galerie. Retourne tout ce dont la page a besoin. Garder la logique de résolution slug→entité et fallback actor_id existante.

- [ ] **Step 1 : Créer le hook**

`src/hooks/use-vitrine.ts` :
```ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { EntityRow, EntityGalleryRow } from '@/types/database'
import type { NetworkMember } from '@/lib/profile-network'
import type { SeasonEvent } from '@/lib/vitrine'

export interface VitrineData {
  entity: EntityRow | null
  gallery: EntityGalleryRow[]
  season: SeasonEvent[]
  friends: NetworkMember[]
  followers: NetworkMember[]
  loading: boolean
  notFound: boolean
}

export function useVitrine(slug: string | undefined): VitrineData {
  const [data, setData] = useState<VitrineData>({
    entity: null, gallery: [], season: [], friends: [], followers: [],
    loading: true, notFound: false,
  })

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    async function run() {
      // 1) entité par slug, fallback actor_id (liens de notif)
      let entity: EntityRow | null = null
      const { data: bySlug } = await supabase.from('entities').select('*').eq('public_slug', slug!).single()
      if (bySlug) entity = bySlug as EntityRow
      else {
        const { data: byId } = await supabase.from('entities').select('*').eq('actor_id', slug!).single()
        entity = (byId as EntityRow) ?? null
      }
      if (!entity) { if (!cancelled) setData(d => ({ ...d, loading: false, notFound: true })); return }

      // 2) galerie
      const { data: gal } = await supabase
        .from('entity_gallery').select('*')
        .eq('entity_actor_id', entity.actor_id)
        .order('position', { ascending: true })

      // 3) participations inscrites (saison)
      const { data: parts } = await supabase
        .from('participations')
        .select('events(id, name, start_date, end_date, city, department, tags, image_url)')
        .eq('actor_id', entity.actor_id).eq('status', 'inscrit')
      const season = ((parts ?? []) as Array<{ events: SeasonEvent | null }>)
        .map(p => p.events).filter((e): e is SeasonEvent => !!e)

      // 4) réseau (friends + followers) — même logique que l'ancien PublicProfile
      const { friends, followers } = await fetchNetwork(entity.actor_id)

      if (!cancelled) setData({
        entity, gallery: (gal as EntityGalleryRow[] | null) ?? [], season,
        friends, followers, loading: false, notFound: false,
      })
    }
    run()
    return () => { cancelled = true }
  }, [slug])

  return data
}

// Reprend la récupération friends + followers de l'ancien PublicProfile.tsx (RPC get_friends_with_dates + table follows → actor_public).
async function fetchNetwork(actorId: string): Promise<{ friends: NetworkMember[]; followers: NetworkMember[] }> {
  const toMember = (a: { actor_id: string | null; label: string | null; avatar_url: string | null; public_slug: string | null }, joinedAt: string): NetworkMember => ({
    id: a.actor_id ?? '', display_name: null, brand_name: a.label, avatar_url: a.avatar_url,
    public_slug: a.public_slug, craft_type: null, city: null, joinedAt,
  })
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: friendRows } = await (supabase.rpc as any)('get_friends_with_dates', { p_user_id: actorId })
    const friendDates = (friendRows as Array<{ friend_id: string; friended_at: string }> | null) ?? []
    let friends: NetworkMember[] = []
    if (friendDates.length) {
      const { data: actors } = await supabase.from('actor_public')
        .select('actor_id, label, avatar_url, public_slug').in('actor_id', friendDates.map(f => f.friend_id))
      const dm = new Map(friendDates.map(f => [f.friend_id, f.friended_at]))
      friends = ((actors ?? []) as any[]).map(a => toMember(a, dm.get(a.actor_id ?? '') ?? new Date(0).toISOString()))
    }
    const { data: links } = await supabase.from('follows')
      .select('created_at, follower_actor').eq('following_actor', actorId).order('created_at', { ascending: false })
    const fl = (links as Array<{ created_at: string; follower_actor: string | null }> | null) ?? []
    const ids = fl.map(l => l.follower_actor).filter((id): id is string => !!id)
    let followers: NetworkMember[] = []
    if (ids.length) {
      const { data: actors } = await supabase.from('actor_public')
        .select('actor_id, label, avatar_url, public_slug').in('actor_id', ids)
      const dm = new Map(fl.map(l => [l.follower_actor ?? '', l.created_at]))
      followers = ((actors ?? []) as any[]).map(a => toMember(a, dm.get(a.actor_id ?? '') ?? new Date(0).toISOString()))
    }
    return { friends, followers }
  } catch { return { friends: [], followers: [] } }
}
```

- [ ] **Step 2 : Vérifier compilation + lint**

Run : `pnpm build && pnpm lint`
Expected : OK (le hook n'est pas encore monté).

- [ ] **Step 3 : Commit**
```bash
git add src/hooks/use-vitrine.ts
git commit -m "feat(vitrine): hook use-vitrine (entité + galerie + saison + réseau)"
```

---

### Task 6 : `Vitrine.css` + `VitrineCover` + `VitrineHeader`

**Files:**
- Create: `src/pages/Vitrine.css`
- Create: `src/components/vitrine/VitrineCover.tsx`
- Create: `src/components/vitrine/VitrineHeader.tsx`

Reproduire les blocs `.cover`, `.vhead`, `.vav`, `.vid`, `.chips`, `.vact`, `.btn*`, `.iconbtn` de la maquette `docs/decisions/assets/vitrine-exposant.html`, **en tokens DA** : surfaces/textes `hsl(var(--token))`, marque/amber `var(--copper)`/`var(--amber)`. Fondu cover vers `hsl(var(--background))`. Fallback avatar = dégradé + initiales (motif `avatarGradient` de `src/lib/avatar-gradient.ts`).

- [ ] **Step 1 : `Vitrine.css`** — porter les règles de la maquette (cover, page max-width 1000px, vhead, vav, vid/brand/person/chips, btn-p/btn-g/iconbtn, grid `1fr 340px` + media < 1080px empilé) en tokens DA. Aucun `rgba(61,48,40)` ni `#fff` en dur (sauf texte sur dégradé d'avatar).

- [ ] **Step 2 : `VitrineCover.tsx`**
```tsx
export function VitrineCover({ url }: { url: string | null }) {
  return (
    <div className="v-cover">
      {url
        ? <img src={url} alt="" />
        : <div className="v-cover-fallback" aria-hidden="true" />}
    </div>
  )
}
```

- [ ] **Step 3 : `VitrineHeader.tsx`** — props `{ entity, isOwner, isFollowing, onToggleFollow, onShare, onQR }`. Affiche avatar (fallback `avatarGradient(entity.brand_name)`), `brand_name` + badge `verified` (icône lucide `BadgeCheck`, classe `.v-verified`, seulement si `entity.verified`), sous-titre `{craft_type} · {city} ({department})`, chips `entity.specialties`, et les actions :
  - visiteur connecté non-propriétaire → bouton Suivre/Suivi (`btn-follow`, état `is-on` si `isFollowing`) + iconbtn Partager + iconbtn QR.
  - propriétaire → iconbtn Partager + iconbtn QR (les contrôles d'édition viendront en Phase 3 ; pas de bouton Suivre).
  - visiteur déconnecté → iconbtn Partager + QR (le Suivre nécessitera login — masquer le bouton Suivre si pas de `currentActor`, géré par le parent via `onToggleFollow` absent).

  Utiliser les icônes lucide (`UserPlus`, `Check`, `Share2`, `QrCode`, `BadgeCheck`).

- [ ] **Step 4 : Vérifier compilation**

Run : `pnpm build`
Expected : OK.

- [ ] **Step 5 : Commit**
```bash
git add src/pages/Vitrine.css src/components/vitrine/VitrineCover.tsx src/components/vitrine/VitrineHeader.tsx
git commit -m "feat(vitrine): Vitrine.css + VitrineCover + VitrineHeader (DA maquette)"
```

---

### Task 7 : `VitrineStats`

**Files:**
- Create: `src/components/vitrine/VitrineStats.tsx`

Reproduit `.vstats` : carte abonnés (count + 3 avatars empilés), carte compagnons (count + avatars), carte plate « N festivals {année} ». Props `{ followers, friends, seasonCount, year }`. Avatars empilés via `avatarGradient(member.brand_name ?? '?')` + initiale, ou `<img>` si `avatar_url`. Cliquer une carte → (Phase ultérieure) ; ici non-cliquable ou lien vers la liste réseau si déjà existante (`/suivis`). Garder simple : non interactif pour l'instant.

- [ ] **Step 1 : Composant** (avatars : `slice(0,3)`, classes `.v-stat`, `.v-avs`, `.v-stat-plain` portées de la maquette dans `Vitrine.css`).
- [ ] **Step 2 : Ajouter les règles `.vstats`/`.stat`/`.avs`/`.stat-plain` à `Vitrine.css`** (tokens DA).
- [ ] **Step 3 : `pnpm build`** → OK.
- [ ] **Step 4 : Commit**
```bash
git add src/components/vitrine/VitrineStats.tsx src/pages/Vitrine.css
git commit -m "feat(vitrine): VitrineStats (abonnés / compagnons / festivals)"
```

---

### Task 8 : `VitrineGallery` + `VitrineLinks`

**Files:**
- Create: `src/components/vitrine/VitrineGallery.tsx`
- Create: `src/components/vitrine/VitrineLinks.tsx`

- [ ] **Step 1 : `VitrineGallery.tsx`** — props `{ photos: EntityGalleryRow[] }`. Si `photos.length === 0` → rendre `null` (caché pour le public ; l'état propriétaire viendra en Phase 3). Sinon carte `.card` avec titre « Sélection » et grille `.gallery` 3 colonnes de `.gphoto` (`<img src={p.image_url}>`).

- [ ] **Step 2 : `VitrineLinks.tsx`** — props `{ links: VitrineLink[] }`. Si vide → `null`. Sinon carte « Liens » avec `.linkrow` par lien : icône (`linkTypeIcon(type)` → composant lucide via une petite map locale `{ Globe, ShoppingBag, Instagram, Facebook, Link }`), label, `linkHost(url)` en sous-texte, ouverture `target="_blank" rel="noopener noreferrer"`, icône `ExternalLink`.

- [ ] **Step 3 : Styles `.gallery`/`.gphoto`/`.links`/`.linkrow` dans `Vitrine.css`** (DA).
- [ ] **Step 4 : `pnpm build`** → OK.
- [ ] **Step 5 : Commit**
```bash
git add src/components/vitrine/VitrineGallery.tsx src/components/vitrine/VitrineLinks.tsx src/pages/Vitrine.css
git commit -m "feat(vitrine): VitrineGallery + VitrineLinks"
```

---

### Task 9 : `VitrineSeason` (« Où me rencontrer »)

**Files:**
- Create: `src/components/vitrine/VitrineSeason.tsx`

Reproduit `.card` « Où me rencontrer » : intro, liste `.fest` (image `fimg`, `fb` nom + `fmeta` dates·ville), section « Déjà passés » (`.past-head` + `.fest.past`). Props `{ season: SeasonEvent[] }`. Utilise `splitSeason(season, new Date())`. Chaque `.fest` est un `<Link to={/evenement/:id} state={{ from: '/' }}>`. Format dates court (réutiliser `formatDateRange` de `@/lib/calendar-format`). Si saison vide → carte avec message « Aucune date publiée ».

- [ ] **Step 1 : Composant** (importe `splitSeason` de `@/lib/vitrine`, `formatDateRange` de `@/lib/calendar-format`).
- [ ] **Step 2 : Styles `.fest`/`.fimg`/`.fb`/`.fmeta`/`.past-head` dans `Vitrine.css`** (DA).
- [ ] **Step 3 : `pnpm build`** → OK.
- [ ] **Step 4 : Commit**
```bash
git add src/components/vitrine/VitrineSeason.tsx src/pages/Vitrine.css
git commit -m "feat(vitrine): VitrineSeason (saison à venir / passés)"
```

---

### Task 10 : Réassembler `PublicProfile` + Suivre + nudge

**Files:**
- Modify: `src/pages/PublicProfile.tsx`

Remplace le fetch interne par `useVitrine(slug)` et le layout par les composants Vitrine, sur la grille maquette. Garde : résolution slug, écran `loading`, écran 404, modales QR (`QRCodeModal`) et embed (`EmbedModal`) existantes, `FellowshipFooter` (restylé si besoin). Le bouton Suivre utilise `useFollowStatus(entity.actor_id)`.

- [ ] **Step 1 : Réécrire le composant**
```tsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useVitrine } from '@/hooks/use-vitrine'
import { useFollowStatus } from '@/hooks/use-follows'
import { VitrineCover } from '@/components/vitrine/VitrineCover'
import { VitrineHeader } from '@/components/vitrine/VitrineHeader'
import { VitrineStats } from '@/components/vitrine/VitrineStats'
import { VitrineGallery } from '@/components/vitrine/VitrineGallery'
import { VitrineLinks } from '@/components/vitrine/VitrineLinks'
import { VitrineSeason } from '@/components/vitrine/VitrineSeason'
import { QRCodeModal } from '@/components/profile/QRCodeModal'
import { EmbedModal } from '@/components/profile/EmbedModal'
import { FellowshipFooter } from '@/components/profile/FellowshipFooter'
import type { VitrineLink } from '@/types/database'
import './Vitrine.css'

export function PublicProfilePage({ overrideSlug }: { overrideSlug?: string } = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = overrideSlug ?? paramSlug?.replace(/^@/, '')
  const { currentActor } = useAuth()
  const { entity, gallery, season, friends, followers, loading, notFound } = useVitrine(slug)
  const { isFollowing, toggleFollow } = useFollowStatus(entity?.actor_id)
  const [showQR, setShowQR] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)

  if (loading) return <div className="profile-loading">Chargement…</div>
  if (notFound || !entity) return (
    <div className="profile-not-found">
      <div className="profile-not-found-code">404</div>
      <h1 className="profile-not-found-title">Profil introuvable</h1>
      <p className="profile-not-found-text">Aucun profil ne correspond à <span>@{slug}</span>.</p>
      <Link to="/" className="profile-not-found-link">Retour à l'accueil</Link>
    </div>
  )

  const isOwner = currentActor?.id === entity.actor_id
  const canFollow = !!currentActor && !isOwner
  const links = (entity.links as unknown as VitrineLink[]) ?? []
  const year = new Date().getFullYear()

  return (
    <div className="v-page-root">
      <VitrineCover url={entity.banner_url} />
      <div className="v-page">
        <VitrineHeader
          entity={entity}
          isOwner={isOwner}
          isFollowing={isFollowing}
          onToggleFollow={canFollow ? toggleFollow : undefined}
          onShare={() => navigator.share?.({ url: window.location.href }).catch(() => {})}
          onQR={() => setShowQR(true)}
        />
        <VitrineStats followers={followers} friends={friends} seasonCount={season.length} year={year} />

        <div className="v-grid">
          <div className="v-col-main">
            {entity.bio && (
              <div className="card v-about"><h2>À propos</h2><p>{entity.bio}</p></div>
            )}
            <VitrineGallery photos={gallery} />
            {canFollow && !isFollowing && (
              <div className="nudge">
                <span className="ic">🔔</span>
                <div className="nt"><b>Ne rate plus ses dates</b><span>Suis {entity.brand_name} pour être prévenu de ses prochains festivals.</span></div>
                <button className="btn btn-p" onClick={toggleFollow}>Suivre</button>
              </div>
            )}
          </div>
          <aside className="v-col-side">
            <VitrineLinks links={links} />
            <VitrineSeason season={season} />
          </aside>
        </div>

        <FellowshipFooter />
      </div>

      {showQR && entity.public_slug && <QRCodeModal slug={entity.public_slug} onClose={() => setShowQR(false)} />}
      {showEmbed && entity.public_slug && <EmbedModal slug={entity.public_slug} onClose={() => setShowEmbed(false)} />}
    </div>
  )
}
```
> Note : l'ancien `EmailSignupPlaceholder`, `ProfileHeader`, `ProfileNetworkStats`, `EventCarousel`, `entityAsProfile` ne sont plus utilisés **par cette page** (laissés en place s'ils servent ailleurs — vérifier à l'étape lint/build qu'aucun import mort ne casse).

- [ ] **Step 2 : Ajouter styles `.v-page-root`/`.v-page`/`.v-grid`/`.v-col-main`/`.v-col-side`/`.nudge`/`.card`/`.about` à `Vitrine.css`** (DA, maquette).

- [ ] **Step 3 : Build + lint**

Run : `pnpm build && pnpm lint`
Expected : OK. Si lint signale des imports devenus inutilisés dans d'anciens fichiers, ne PAS les supprimer s'ils servent ailleurs ; ne nettoyer que `PublicProfile.tsx`.

- [ ] **Step 4 : Commit**
```bash
git add src/pages/PublicProfile.tsx src/pages/Vitrine.css
git commit -m "feat(vitrine): PublicProfile réassemblé au layout DA + Suivre + nudge"
```

---

### Task 11 : Rebrancher le lien nav « Ma vitrine »

**Files:**
- Modify: `src/lib/navModel.ts`
- Modify: `src/lib/navModel.test.ts`

Aujourd'hui `vitrine.to = '/profil'`. On veut `/{public_slug}` du propriétaire (fallback `/profil` si pas de slug). Comme `navModel` est statique, on expose un helper qui calcule le `to` de la vitrine selon l'acteur courant ; le composant de nav l'utilise.

- [ ] **Step 1 : Test qui échoue (ajouter à `navModel.test.ts`)**
```ts
import { vitrineHref } from './navModel'

describe('vitrineHref', () => {
  it('slug présent → /{slug}', () => expect(vitrineHref('terres-et-flammes')).toBe('/terres-et-flammes'))
  it('slug absent → /profil', () => {
    expect(vitrineHref(null)).toBe('/profil')
    expect(vitrineHref(undefined)).toBe('/profil')
  })
})
```

- [ ] **Step 2 : Lancer → échec**

Run : `pnpm vitest run src/lib/navModel.test.ts`
Expected : FAIL (`vitrineHref` non exporté).

- [ ] **Step 3 : Implémenter dans `navModel.ts`**
```ts
/** Lien de la vitrine du propriétaire : sa page publique si elle a un slug, sinon /profil. */
export function vitrineHref(publicSlug: string | null | undefined): string {
  return publicSlug ? `/${publicSlug}` : '/profil'
}
```

- [ ] **Step 4 : Brancher dans la nav** — dans le composant qui rend les liens (Sidebar / BottomBar / AccountSheet), pour l'item `vitrine`, utiliser `vitrineHref(currentActorRow?.public_slug)` comme `to` au lieu de `def.to`. (Repérer l'usage de `NAV_DEFS[...]` / `entryState` dans `Sidebar.tsx` et adapter uniquement la clé `vitrine`.)

```tsx
const to = key === 'vitrine' ? vitrineHref(currentActorRow?.public_slug) : def.to
```

- [ ] **Step 5 : Lancer tests + build + lint**

Run : `pnpm vitest run src/lib/navModel.test.ts && pnpm build && pnpm lint`
Expected : tests PASS, build/lint OK.

- [ ] **Step 6 : Commit**
```bash
git add src/lib/navModel.ts src/lib/navModel.test.ts src/components/layout/Sidebar.tsx
git commit -m "feat(vitrine): lien nav Ma vitrine → /{public_slug} (vitrineHref)"
```

---

### Task 12 : Vérification finale Phases 1-2 + bump

**Files:**
- Modify: `package.json`

- [ ] **Step 1 : Suite complète**

Run : `pnpm build && pnpm lint && pnpm vitest run`
Expected : build OK, lint OK, tous tests verts (126 + nouveaux helpers vitrine/navModel).

- [ ] **Step 2 : Vérif visuelle** (`pnpm dev`, stack locale avec données + une entité avec slug) :
  - `/{slug}` en **nuit ET jour**, en **visiteur connecté** (bouton Suivre, nudge si pas suivi), **propriétaire** (pas de Suivre), **déconnecté** (pas de Suivre) ;
  - cover (avec et sans `banner_url`), header + badge si `verified` (mettre `update entities set verified=true where ...` en DB pour tester), chips si `specialties`, stats, galerie (insérer 2-3 lignes `entity_gallery` en DB + une image dans le bucket pour tester), liens (mettre un `links` jsonb de test), « Où me rencontrer », footer ;
  - lien sidebar « Ma vitrine » ouvre bien `/{slug}` ;
  - sections vides (galerie/liens) **masquées** côté visiteur.
- [ ] **Step 3 : `grep`** : `pnpm exec grep -n "rgba(61, 48, 40" src/pages/Vitrine.css` → **aucun** résultat.
- [ ] **Step 4 : Bump + commit + push**
```bash
npm version patch --no-git-tag-version
git add package.json
git commit -m "chore: bump version (vitrine phases 1-2)"
git push
```

---

## Self-Review

**Spec coverage (Phases 1-2) :**
- Colonnes entities + trigger verified → Task 1 ✓
- Table entity_gallery + RLS → Task 1 ✓
- Bucket entity-gallery + policies → Task 1 ✓
- Types → Task 2 ✓
- splitSeason + helpers liens (purs, testés) → Tasks 3-4 ✓
- Chargement données (galerie incluse) → Task 5 ✓
- Cover, header (badge vérifié lecture, chips, sous-titre métier·ville), stats, galerie, liens, saison, nudge, footer → Tasks 6-10 ✓
- Suivre/Suivi (réutilise useFollowStatus) → Task 10 ✓
- Sections vides masquées (public) → Tasks 8, 10 ✓
- Rebranchement nav « Ma vitrine » → Task 11 ✓
- Tokens DA / pas de rgba brun → Tasks 6-10 + vérif Task 12 ✓
- **Différé Phase 3-4 (plan séparé) :** édition inline + toggle vérifié admin — hors de ce plan, annoncé en tête.

**Placeholders :** aucun ; le portage CSS référence la maquette HTML (contrat visuel exact fourni) plutôt que de dupliquer 200 lignes de styles — les classes à reproduire sont nommées par tâche.

**Cohérence des types :** `VitrineData`/`SeasonEvent`/`VitrineLink`/`EntityGalleryRow` cohérents entre Tasks 2-5-9-10 ; `useFollowStatus(targetId)` conforme à `src/hooks/use-follows.ts` ; `splitSeason`/`linkHost`/`linkTypeIcon` conformes entre définition (3-4) et usage (9, 8).
