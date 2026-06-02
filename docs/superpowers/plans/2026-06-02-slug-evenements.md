# Slugs d'événements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner aux événements un slug stable (`nom-ville`) et une route `/e/:slug`, pour des liens partagés propres (`flw.sh/e/foire-medievale-de-provins`) sans casser `/evenement/:uuid`.

**Architecture:** Migration additive : colonne `events.slug` + génération SQL (unaccent → kebab) via trigger BEFORE INSERT (slug figé) + backfill + index unique. Nouvelle route `/e/:slug` ; `useEvent` résout par id OU slug. Seuls les liens *partagés* (ShareModal) passent en `/e/:slug` en V1.

**Tech Stack:** React 19 + TS, Vite, Vitest, Supabase (Postgres + extension `unaccent`), react-router-dom.

**Spec :** `docs/superpowers/specs/2026-06-02-slug-evenements-design.md`

**Contrainte test :** logique pure testée (`event-link.ts`) ; le reste vérifié par build/lint + manuel (cf. `reference_react_test_infra`).

---

## File Structure

**Créés :**
- `supabase/migrations/20260602190000_event_slug.sql` — colonne + unaccent + fonctions + trigger + backfill + index.
- `src/lib/event-link.ts` — `eventShareUrl({slug,id}, origin)` (pur).
- `src/lib/event-link.test.ts` — tests.

**Modifiés :**
- `src/types/supabase.ts` — `slug` ajouté à `events` (manuel ; régénération distante non requise).
- `src/hooks/use-events.ts` — `useEvent(key, by)` résout par id ou slug.
- `src/pages/EventPage.tsx` — lit `:id` OU `:slug`.
- `src/App.tsx` — route `/e/:slug`.
- `src/lib/navModel.ts` — `/e/` dans `SHARED_PREFIXES`, `e` dans `RESERVED_TOP`.
- `src/lib/community.ts` — `slug` dans `FeedEventRef`.
- `src/hooks/use-community.ts` — `slug` dans le select events + le mapping.
- `src/components/cockpit/ProchainFestival.tsx` + `CompagnonsDeRoute.tsx` — liens de partage en `/e/:slug`.

---

## Task 1: Migration `events.slug` (+ types) — PAS de push prod

**Files:**
- Create: `supabase/migrations/20260602190000_event_slug.sql`
- Modify: `src/types/supabase.ts`

- [ ] **Step 1: Écrire la migration**

Create `supabase/migrations/20260602190000_event_slug.sql`:

```sql
-- Slugs d'événements : nom-ville, figés à la création.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;

-- Slug de base "nom-ville" sans accents, alphanumérique + tirets.
-- STABLE (pas IMMUTABLE) car unaccent() est STABLE ; on ne l'utilise PAS dans un index.
CREATE OR REPLACE FUNCTION events_base_slug(p_name text, p_city text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(extensions.unaccent(coalesce(p_name, '') || '-' || coalesce(p_city, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- BEFORE INSERT : remplit slug s'il est vide, en garantissant l'unicité (-2, -3…).
CREATE OR REPLACE FUNCTION events_set_slug() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN RETURN NEW; END IF;
  base := events_base_slug(NEW.name, NEW.city);
  IF base = '' THEN base := 'festival'; END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM events WHERE slug = candidate AND id <> NEW.id) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_set_slug ON events;
CREATE TRIGGER trg_events_set_slug BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION events_set_slug();

-- Backfill déterministe (du plus ancien au plus récent).
DO $$
DECLARE r record; base text; candidate text; n int;
BEGIN
  FOR r IN SELECT id, name, city FROM events WHERE slug IS NULL ORDER BY created_at LOOP
    base := events_base_slug(r.name, r.city);
    IF base = '' THEN base := 'festival'; END IF;
    candidate := base; n := 1;
    WHILE EXISTS (SELECT 1 FROM events WHERE slug = candidate) LOOP
      n := n + 1; candidate := base || '-' || n;
    END LOOP;
    UPDATE events SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
```

- [ ] **Step 2: Ajouter `slug` aux types**

Read `src/types/supabase.ts`, find the `events` table block. Add `slug: string | null` to `Row`, `slug?: string | null` to `Insert` and `Update`, en respectant l'ordre alphabétique et le formatage des champs voisins.

- [ ] **Step 3: Vérifier la compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit** (NE PAS pousser, NE PAS lancer `supabase db push` — le contrôleur applique la migration en prod séparément)

```bash
git add supabase/migrations/20260602190000_event_slug.sql src/types/supabase.ts
git commit -m "feat(events): migration slug nom-ville (trigger + backfill + index) + types"
```

---

## Task 2: `lib/event-link.ts` (TDD)

**Files:**
- Create: `src/lib/event-link.ts`
- Test: `src/lib/event-link.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/lib/event-link.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { eventShareUrl } from './event-link'

describe('eventShareUrl', () => {
  it('utilise /e/{slug} quand un slug existe', () => {
    expect(eventShareUrl({ slug: 'foire-medievale-de-provins', id: 'uuid-1' }, 'https://flw.sh'))
      .toBe('https://flw.sh/e/foire-medievale-de-provins')
  })

  it('retombe sur /evenement/{id} si pas de slug', () => {
    expect(eventShareUrl({ slug: null, id: 'uuid-1' }, 'https://flw.sh'))
      .toBe('https://flw.sh/evenement/uuid-1')
  })
})
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `pnpm vitest run src/lib/event-link.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

Create `src/lib/event-link.ts`:

```ts
/** Lien partageable d'un événement : /e/{slug} si dispo, sinon fallback /evenement/{id}. */
export function eventShareUrl(event: { slug: string | null; id: string }, origin: string): string {
  return event.slug ? `${origin}/e/${event.slug}` : `${origin}/evenement/${event.id}`
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `pnpm vitest run src/lib/event-link.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/event-link.ts src/lib/event-link.test.ts
git commit -m "feat(events): eventShareUrl (lien /e/slug avec fallback) — testé"
```

---

## Task 3: `useEvent` résout par id OU slug + `EventPage`

**Files:**
- Modify: `src/hooks/use-events.ts`
- Modify: `src/pages/EventPage.tsx`

- [ ] **Step 1: Étendre `useEvent`**

Dans `src/hooks/use-events.ts`, remplacer la fonction `useEvent` par :

```ts
export function useEvent(key: string | undefined, by: 'id' | 'slug' = 'id') {
  const [event, setEvent] = useState<EventWithScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!key) return
    supabase
      .from('events')
      .select('*')
      .eq(by, key)
      .single()
      .then(({ data }) => {
        if (data) {
          setEvent({
            ...data,
            avg_overall: null,
            review_count: null,
            avg_affluence: null,
            avg_organisation: null,
            avg_rentabilite: null,
          })
        }
        setLoading(false)
      })
  }, [key, by])

  return { event, loading }
}
```

- [ ] **Step 2: `EventPage` lit `:id` OU `:slug`**

Dans `src/pages/EventPage.tsx`, remplacer la ligne `const { id } = useParams<{ id: string }>()` (≈ ligne 51) par :

```tsx
  const { id, slug } = useParams<{ id?: string; slug?: string }>()
```

Puis là où l'événement est chargé via `useEvent(id)`, remplacer par :

```tsx
  const { event, loading } = useEvent(slug ?? id, slug ? 'slug' : 'id')
```

(Si `useEvent(id)` est appelé sous une autre forme, adapter : la clé devient `slug ?? id` et le mode `slug ? 'slug' : 'id'`. Tout autre usage de `id` dans la page — ex. `updateEvent(id, …)`, liens — doit utiliser **`event.id`** (l'UUID réel chargé), PAS le param d'URL qui peut être un slug. Vérifier et remplacer les usages de `id` qui supposent un UUID par `event?.id`.)

- [ ] **Step 3: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS. Vérifier qu'aucun usage de `id` dans EventPage ne casse quand le param est un slug (les écritures/edit doivent passer par `event.id`).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-events.ts src/pages/EventPage.tsx
git commit -m "feat(events): useEvent par id ou slug + EventPage résout les deux"
```

---

## Task 4: Route `/e/:slug` + route-guard

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/navModel.ts`

- [ ] **Step 1: Ajouter la route**

Dans `src/App.tsx`, juste après la route `/evenement/:id` (`<Route path="/evenement/:id" element={<AuthenticatedApp><EventPage /></AuthenticatedApp>} />`), ajouter une route jumelle :

```tsx
          <Route path="/e/:slug" element={<AuthenticatedApp><EventPage /></AuthenticatedApp>} />
```

- [ ] **Step 2: Route-guard (navModel)**

Dans `src/lib/navModel.ts` :
- Dans `SHARED_PREFIXES`, ajouter `'/e/'` (AVEC le slash final — `'/e'` matcherait `/explorer`, `/evenement`…) :
  ```ts
  const SHARED_PREFIXES = ['/explorer', '/reglages', '/evenement', '/e/', '/notifications', '/suivis', '/boutique', '/abonnement']
  ```
- Dans `RESERVED_TOP`, ajouter `'e'` :
  ```ts
  const RESERVED_TOP = new Set([
    'explorer', 'calendrier', 'communaute', 'tableau-de-bord', 'dashboard',
    'mes-dates', 'mes-createurs', 'profil', 'reglages', 'suivis',
    'notifications', 'evenement', 'e', 'admin', 'onboarding', 'login', 'auth',
    'legal', 'boutique', 'abonnement',
  ])
  ```

- [ ] **Step 3: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/lib/navModel.ts
git commit -m "feat(events): route /e/:slug + route-guard (SHARED_PREFIXES /e/ + RESERVED_TOP e)"
```

---

## Task 5: `slug` dans `FeedEventRef` (convergences)

**Files:**
- Modify: `src/lib/community.ts`
- Modify: `src/hooks/use-community.ts`

- [ ] **Step 1: Ajouter `slug` au type**

Dans `src/lib/community.ts`, dans l'interface `FeedEventRef`, ajouter le champ `slug` :

```ts
export interface FeedEventRef {
  id: string
  name: string
  city: string | null
  startDate: string
  endDate: string
  imageUrl: string | null
  slug: string | null
}
```

- [ ] **Step 2: Charger et mapper le slug**

Dans `src/hooks/use-community.ts` :
- Dans le `select` de la requête `events` (cherche `from('events').select('id, name, city, start_date, end_date, image_url')`), ajouter `slug` :
  ```ts
  ? supabase.from('events').select('id, name, city, start_date, end_date, image_url, slug').in('id', eventIds)
  ```
- Dans le mapping `eventMap[e.id] = { ... }`, ajouter `slug: e.slug`:
  ```ts
  eventMap[e.id] = { id: e.id, name: e.name, city: e.city, startDate: e.start_date, endDate: e.end_date, imageUrl: e.image_url, slug: e.slug }
  ```

- [ ] **Step 3: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS. (Si un autre endroit construit un `FeedEventRef` sans `slug`, le compilateur le signalera → ajouter `slug: null` ou la vraie valeur à ces endroits.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/community.ts src/hooks/use-community.ts
git commit -m "feat(events): slug dans FeedEventRef (pour le partage des convergences)"
```

---

## Task 6: Liens de partage en `/e/:slug`

**Files:**
- Modify: `src/components/cockpit/ProchainFestival.tsx`
- Modify: `src/components/cockpit/CompagnonsDeRoute.tsx`

- [ ] **Step 1: ProchainFestival**

Dans `src/components/cockpit/ProchainFestival.tsx` :
- Ajouter l'import : `import { eventShareUrl } from '@/lib/event-link'`
- Remplacer la construction du lien de partage. Trouver :
  ```tsx
  const shareUrl = `${window.location.origin}/evenement/${ev.id}`
  ```
  par :
  ```tsx
  const shareUrl = eventShareUrl({ slug: ev.slug, id: ev.id }, window.location.origin)
  ```
  (Le `shareMessage` qui référence `${shareUrl}` reste inchangé.)

- [ ] **Step 2: CompagnonsDeRoute**

Dans `src/components/cockpit/CompagnonsDeRoute.tsx` :
- Ajouter l'import : `import { eventShareUrl } from '@/lib/event-link'`
- Remplacer, dans le `.map(c => {...})` des convergences :
  ```tsx
  const url = `${window.location.origin}/evenement/${c.event.id}`
  ```
  par :
  ```tsx
  const url = eventShareUrl({ slug: c.event.slug, id: c.event.id }, window.location.origin)
  ```
  (`message` qui référence `${url}` reste inchangé.)

- [ ] **Step 3: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS. (`ev.slug` typé via Task 1 ; `c.event.slug` via Task 5.)

- [ ] **Step 4: Commit**

```bash
git add src/components/cockpit/ProchainFestival.tsx src/components/cockpit/CompagnonsDeRoute.tsx
git commit -m "feat(events): liens de partage en /e/slug (Prochain festival + Convergences)"
```

---

## Task 7: Vérification finale + bump (migration prod = contrôleur)

**Files:**
- Modify: `package.json`, `src/changelog.ts`

- [ ] **Step 1: Suite complète**

Run: `pnpm vitest run` → tous verts (dont `event-link.test.ts`).
Run: `pnpm build && pnpm lint` → PASS, pas de nouvelle alerte.

- [ ] **Step 2: Bump + changelog**

Bumper `package.json` (patch) + entrée en tête de `src/changelog.ts` : titre « Liens d'événements lisibles », changes : [« Liens partagés en flw.sh/e/nom-du-festival (slug stable) ; les anciens liens restent valides »].

```bash
git add -A
git commit -m "chore(events): vérif + bump version <new-version>"
```

- [ ] **Step 3: (Contrôleur) appliquer la migration prod puis pousser**

Le contrôleur applique `20260602190000_event_slug.sql` en prod (`echo y | npx --no-install supabase db push --linked`, env depuis `.env` — cf. `reference_supabase_cli`), vérifie le backfill (`select id, name, slug from events limit 5`), PUIS `git push`. **Vérif manuelle ensuite** : ouvrir `/e/<un-slug-réel>` (doit afficher la page), tester le bouton Partager (lien `/e/...`).

---

## Self-Review (effectué)

**Couverture spec :** slug nom-ville stable (trigger BEFORE INSERT, pas UPDATE) → T1 ✓ ; backfill + index unique → T1 ✓ ; route `/e/:slug` + back-compat `/evenement/:id` → T3/T4 ✓ ; route-guard `/e/` + `e` → T4 ✓ ; liens partagés (origin + slug, fallback id) → T2/T6 ✓ ; slug convergences → T5 ✓ ; liens internes inchangés (différé) ✓ ; migration prod sous contrôle → T7 ✓.

**Placeholder scan :** aucun ; tout le code est explicite.

**Cohérence types :** `eventShareUrl({slug,id}, origin)` défini en T2, appelé en T6 avec `ev.slug`/`c.event.slug` (ajoutés en T1/T5). `useEvent(key, by)` (T3) — signature unique. `FeedEventRef.slug` (T5) consommé en T6.

**Dépendance :** T1 nécessite l'extension `unaccent` (dispo Supabase) ; migration appliquée par le contrôleur (T7) — fallback manuel des types déjà fait en T1 pour que le code compile sans push.
