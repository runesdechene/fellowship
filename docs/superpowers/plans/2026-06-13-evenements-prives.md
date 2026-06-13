# Événements privés (non répertoriés) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à un exposant de créer des événements **privés** (non répertoriés) : visibles seulement de lui (calendrier/cockpit) + de qui a le lien, invisibles de toute recherche/listing, pour tracker ses petites dates non publiques.

**Architecture:** Un seul champ `events.is_private`. Modèle **unlisted** (RLS lecture inchangée ; confidentialité = absence de listage partout + slug suffixé non devinable). Invariant : toute lecture d'`events` qui n'est pas une surface perso du créateur ni un accès par slug exclut `is_private`. La création passe un toggle + auto-crée la participation du créateur (branche sur le suivi financier déjà livré).

**Tech Stack:** Supabase (Postgres, RLS, triggers, RPC SECURITY DEFINER), React 19 + TS, Vitest, alias `@/`→`src/`.

**Spec de référence :** `docs/superpowers/specs/2026-06-13-evenements-prives-design.md` (décision : **unlisted pur**, durcissement anti-énumération écarté).

**Conventions projet :**
- pnpm. `pnpm build` (tsc+vite), `pnpm lint`, `pnpm test`.
- Migration prod via push non-interactif Supabase CLI (cf. mémoire `reference_supabase_cli`) **avec le GO d'Uriel**.
- Régén types après migration (`supabase gen types`). Tables/colonnes neuves : cast `as any` en attendant la régén si nécessaire (précédent projet).
- Auto-commit conventional commits par tâche. Build peut rester rouge en intermédiaire (rien n'est poussé git avant la dernière tâche).

**Ground truth (vérifié dans le code, corrige/complète la spec) :**
- Le **broadcast de notif à la création d'event est déjà supprimé** (`20260611120000_drop_event_created_broadcast`) → rien à garder côté notif création.
- Les RPC `get_following/followers/friends_with_dates` ne renvoient que le **graphe de follow** (aucun event) → pas de fuite, pas de changement.
- Le **fil Communauté** est client-side (`use-community.ts`) avec un **`eventMap` central** : tous les items sont sautés si leur event n'y est pas → filtrer 2 requêtes suffit.
- Le **slug est généré par un trigger DB** `events_set_slug` (BEFORE INSERT) → le suffixe aléatoire des privés se fait **dans le trigger** (pas de helper JS, pas de `Math.random` testé).

---

## File Structure

- **Create** `supabase/migrations/20260613130000_events_private.sql` — colonne `is_private` + index partiel + trigger slug (suffixe privé) + recréation `search_similar_events` et `get_coevent_suggestions` avec garde `is_private`.
- **Modify** `src/types/supabase.ts` — régénéré (Task 2).
- **Modify** `src/hooks/use-events.ts` — `useEvents`/`useRecentEvents` excluent le privé ; `createEvent` inchangé (l'appelant passe `is_private`).
- **Modify** `src/hooks/use-map-events.ts` — exclut le privé.
- **Modify** `src/hooks/use-admin.ts` — exclut le privé (back-office).
- **Modify** `src/hooks/use-vitrine.ts` — exclut le privé des dates de la vitrine.
- **Modify** `src/hooks/use-community.ts` — exclut le privé (newEvents + eventMap).
- **Modify** `src/components/events/EventForm.tsx` — toggle « 🔒 Privé », dédup/ tags adaptés, `is_private` à l'insert, auto-participation.
- **Modify** `src/pages/EventPage.tsx` — convertibilité (toggle en édition + garde public→privé) + cadenas dans l'en-tête.
- **Modify** `src/hooks/use-participations.ts` — `useMyParticipations` remonte `is_private` (pour le cadenas calendrier).
- **Modify** `src/hooks/use-calendar.ts` + `src/components/calendar/*` — cadenas 🔒 sur l'event privé.

---

## Task 1: Migration — colonne, slug privé, RPC gardées

**Files:**
- Create: `supabase/migrations/20260613130000_events_private.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Événements privés (non répertoriés). Modèle unlisted : RLS lecture inchangée,
-- exclusion au niveau applicatif + RPC ; confidentialité = pas de listage + slug suffixé.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Requêtes du créateur sur ses events privés (calendrier/cockpit lisent via participations,
-- mais l'index aide les éventuels scans created_by_actor).
CREATE INDEX IF NOT EXISTS idx_events_private_creator
  ON public.events (created_by_actor) WHERE is_private = true;

-- Slug : pour un event privé, suffixe hexa aléatoire non devinable (la capability du lien).
-- On réécrit events_set_slug en gardant le comportement public à l'identique.
CREATE OR REPLACE FUNCTION events_set_slug() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base text; candidate text; n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN RETURN NEW; END IF;
  base := events_base_slug(NEW.name, NEW.city);
  IF base = '' THEN base := 'festival'; END IF;
  IF NEW.is_private THEN
    -- Slug privé = la capability du lien (modèle unlisted) : ~122 bits d'entropie
    -- (UUID v4 sans tirets), JAMAIS de compteur prévisible. Régénère en cas de collision.
    LOOP
      candidate := base || '-' || replace(gen_random_uuid()::text, '-', '');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM events WHERE slug = candidate AND id <> NEW.id);
    END LOOP;
    NEW.slug := candidate;
    RETURN NEW;
  END IF;
  -- Public : slug lisible « nom-ville » + compteur d'unicité (comportement existant inchangé).
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM events WHERE slug = candidate AND id <> NEW.id) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

-- Dédup à la création : NE DOIT PAS révéler d'event privé. Recréée avec le garde.
CREATE OR REPLACE FUNCTION search_similar_events(
  search_name text,
  search_year int DEFAULT NULL,
  threshold float DEFAULT 0.25
)
RETURNS TABLE(id uuid, name text, city text, department text, start_date date, end_date date, score float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.name, e.city, e.department, e.start_date, e.end_date,
         similarity(lower(e.name), lower(search_name)) AS score
  FROM events e
  WHERE e.is_private = false
    AND similarity(lower(e.name), lower(search_name)) > threshold
    AND (search_year IS NULL OR EXTRACT(YEAR FROM e.start_date) = search_year)
  ORDER BY score DESC
  LIMIT 5;
$$;

-- Suggestions co-event : défensif (les privés sont solo, donc aucun co-participant,
-- mais on garde l'invariant explicite).
CREATE OR REPLACE FUNCTION get_coevent_suggestions(p_actor_id uuid)
RETURNS TABLE (suggested_actor uuid, shared_events bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p2.actor_id, count(DISTINCT p2.event_id)::bigint
  FROM participations p1
  JOIN events ev ON ev.id = p1.event_id AND ev.is_private = false
  JOIN participations p2 ON p2.event_id = p1.event_id
  JOIN actors a2 ON a2.id = p2.actor_id AND a2.kind = 'entity'
  WHERE can_act_as(p_actor_id)
    AND p1.actor_id = p_actor_id
    AND p1.status <> 'refuse'
    AND p2.actor_id IS NOT NULL
    AND p2.actor_id <> p_actor_id
    AND NOT can_act_as(p2.actor_id)
    AND p2.status <> 'refuse'
    AND p2.visibility = 'public'
    AND p2.actor_id NOT IN (
      SELECT following_actor FROM follows
      WHERE follower_actor = p_actor_id AND following_actor IS NOT NULL
    )
  GROUP BY p2.actor_id
  ORDER BY count(DISTINCT p2.event_id) DESC
  LIMIT 12;
$$;
GRANT EXECUTE ON FUNCTION get_coevent_suggestions(uuid) TO authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260613130000_events_private.sql
git commit -m "feat(db): events.is_private + slug privé suffixé + RPC dédup/coevent gardées"
```

---

## Task 2: Push migration (CHECKPOINT) + régén types

> **CHECKPOINT** : push prod. Migration **additive** (colonne `default false` → tous les events existants restent publics) + remplacement de 3 fonctions. Demander le GO d'Uriel avant le push.

- [ ] **Step 1: Vérifier les migrations en attente**

```bash
export SUPABASE_ACCESS_TOKEN="$(grep '^SUPABASE_ACCESS_TOKEN=' .env | sed 's/^SUPABASE_ACCESS_TOKEN=//; s/\r$//; s/^"//; s/"$//')"
export SUPABASE_DB_PASSWORD="$(grep '^SUPABASE_DB_PASSWORD=' .env | sed 's/^SUPABASE_DB_PASSWORD=//; s/\r$//; s/^"//; s/"$//')"
npx --no-install supabase migration list --linked
```
Expected: `20260613130000` colonne remote vide (en attente).

- [ ] **Step 2: Pusher (après GO Uriel)**

```bash
echo "y" | npx --no-install supabase db push --linked
```
Expected: `Applying migration 20260613130000_events_private.sql... Finished`.

- [ ] **Step 3: Régénérer les types**

```bash
npx --no-install supabase gen types typescript --linked --schema public > src/types/supabase.ts
grep -c "is_private" src/types/supabase.ts   # > 0 attendu
```

- [ ] **Step 4: Build + commit**

Run: `pnpm build`
Expected: PASS (la nouvelle colonne n'est lue/écrite nulle part encore).

```bash
git add src/types/supabase.ts
git commit -m "chore(types): régénère supabase types (events.is_private)"
```

---

## Task 3: Exclure le privé des listings (Explorer, Carte, Admin)

**Files:**
- Modify: `src/hooks/use-events.ts`
- Modify: `src/hooks/use-map-events.ts`
- Modify: `src/hooks/use-admin.ts`

- [ ] **Step 1: `use-events.ts` — `useEvents` exclut le privé**

Dans `fetchEvents` (juste après le `.order('start_date', ...)`), ajouter le filtre. Remplacer :
```typescript
    let query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })
```
par :
```typescript
    let query = supabase
      .from('events')
      .select('*')
      .eq('is_private', false)   // events privés jamais listés (Explorer)
      .order('start_date', { ascending: true })
```

- [ ] **Step 2: `use-events.ts` — `useRecentEvents` exclut le privé**

Remplacer dans `useRecentEvents` :
```typescript
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
```
par :
```typescript
      .from('events')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(limit)
```

> ⚠️ Ne PAS toucher `useEvent(key, by)` (accès unitaire par id/slug) : c'est l'accès par lien, il DOIT pouvoir charger un event privé.

- [ ] **Step 3: `use-map-events.ts` — la Carte exclut le privé**

Remplacer :
```typescript
        .from('events')
        .select('id, slug, name, city, department, start_date, end_date, created_at, tags, image_url, latitude, longitude')
        .not('latitude', 'is', null)
```
par :
```typescript
        .from('events')
        .select('id, slug, name, city, department, start_date, end_date, created_at, tags, image_url, latitude, longitude')
        .eq('is_private', false)   // events privés jamais sur la carte de découverte
        .not('latitude', 'is', null)
```

- [ ] **Step 4: `use-admin.ts` — back-office exclut le privé**

À la requête liste (l. ~71, `from('events')` avec select complet) et au compteur (l. ~39), ajouter `.eq('is_private', false)`. Repérer la requête de liste :
```typescript
      .from('events')
```
et ajouter `.eq('is_private', false)` à la chaîne (liste ET le compteur `head:true` ligne 39). L'admin n'accède pas aux events privés des exposants (cohérent avec « aucun admin sur les données perso »).

- [ ] **Step 5: Build + commit**

Run: `pnpm build`
Expected: PASS.

```bash
git add src/hooks/use-events.ts src/hooks/use-map-events.ts src/hooks/use-admin.ts
git commit -m "feat(privacy): exclure les events privés de Explorer/Carte/Admin"
```

---

## Task 4: Exclure le privé de la Vitrine et du fil Communauté

**Files:**
- Modify: `src/hooks/use-vitrine.ts`
- Modify: `src/hooks/use-community.ts`

- [ ] **Step 1: `use-vitrine.ts` — la vitrine publique du créateur n'expose pas ses events privés**

Remplacer le bloc qui charge la saison :
```typescript
      const { data: parts } = await supabase
        .from('participations')
        .select('events(id, name, start_date, end_date, city, department, tags, image_url, slug)')
        // « Accepté » = on y va (présence acquise), payé ou pas. `confirme` inclus par robustesse.
        .eq('actor_id', entity.actor_id).in('status', ['inscrit', 'confirme'])
      const season = ((parts ?? []) as Array<{ events: SeasonEvent | null }>)
        .map(p => p.events).filter((e): e is SeasonEvent => !!e)
```
par (on remonte `is_private` dans le nested select et on filtre côté client) :
```typescript
      const { data: parts } = await supabase
        .from('participations')
        .select('events(id, name, start_date, end_date, city, department, tags, image_url, slug, is_private)')
        // « Accepté » = on y va (présence acquise), payé ou pas. `confirme` inclus par robustesse.
        .eq('actor_id', entity.actor_id).in('status', ['inscrit', 'confirme'])
      const season = ((parts ?? []) as Array<{ events: (SeasonEvent & { is_private?: boolean }) | null }>)
        .map(p => p.events)
        .filter((e): e is SeasonEvent & { is_private?: boolean } => !!e && !e.is_private)
```

- [ ] **Step 2: `use-community.ts` — le fil n'expose aucun event privé**

Deux filtres (le `eventMap` central + la source « nouveaux events »).

(a) Requête « nouveaux events » (l. ~82) — remplacer :
```typescript
          supabase.from('events')
            .select('id, name, city, start_date, end_date, image_url, slug, created_by_actor, created_at')
            .gte('created_at', since)
            .neq('created_by_actor', me)
            .order('created_at', { ascending: false })
            .limit(FEED_LIMIT),
```
par :
```typescript
          supabase.from('events')
            .select('id, name, city, start_date, end_date, image_url, slug, created_by_actor, created_at')
            .eq('is_private', false)
            .gte('created_at', since)
            .neq('created_by_actor', me)
            .order('created_at', { ascending: false })
            .limit(FEED_LIMIT),
```

(b) `eventMap` central (l. ~110) — remplacer :
```typescript
          eventIds.length
            ? supabase.from('events').select('id, name, city, start_date, end_date, image_url, slug').in('id', eventIds)
            : Promise.resolve({ data: [] as never[] }),
```
par :
```typescript
          eventIds.length
            ? supabase.from('events').select('id, name, city, start_date, end_date, image_url, slug').eq('is_private', false).in('id', eventIds)
            : Promise.resolve({ data: [] as never[] }),
```

> Effet : un event privé n'entre pas dans `eventMap` → tout item (participation/avis/convergence) qui le référence est **sauté** par les gardes `if (!eventMap[...]) continue` déjà présents. Combiné à (a), aucune trace de privé dans le fil.

- [ ] **Step 3: Build + commit**

Run: `pnpm build`
Expected: PASS.

```bash
git add src/hooks/use-vitrine.ts src/hooks/use-community.ts
git commit -m "feat(privacy): exclure les events privés de la vitrine et du fil Communauté"
```

---

## Task 5: Création — toggle privé + auto-participation

**Files:**
- Modify: `src/components/events/EventForm.tsx`

- [ ] **Step 1: État `isPrivate` + import addParticipation**

a) Import :
```typescript
import { createEvent, searchSimilarEvents } from '@/hooks/use-events'
import { addParticipation } from '@/hooks/use-participations'
import { Lock } from 'lucide-react'
```
(ajouter `addParticipation` et `Lock` aux imports existants ; garder le reste.)

b) Après `const [step, setStep] = useState(0)` ajouter :
```typescript
  const [isPrivate, setIsPrivate] = useState(false)
```

- [ ] **Step 2: Dédup sautée en privé**

Remplacer le `useEffect` de recherche de doublons :
```typescript
  useEffect(() => {
    if (form.name.length < 3 || dismissed) {
      setSuggestions([])
      return
    }
```
par :
```typescript
  useEffect(() => {
    if (form.name.length < 3 || dismissed || isPrivate) {
      // En privé : pas de dédup (l'event n'entre pas au répertoire, et search_similar_events
      // exclut déjà le privé — on évite juste le bruit de suggestions).
      setSuggestions([])
      return
    }
```
et ajouter `isPrivate` aux deps du useEffect : `}, [form.name, form.start_date, dismissed, isPrivate])`.

- [ ] **Step 3: Gating des étapes adapté au privé**

Remplacer :
```typescript
  const canProceedStep0 = form.name.length >= 3 && suggestions.length === 0
  const canProceedStep1 = location.city && location.department && form.start_date
  const canProceedStep2 = selectedTags.length > 0
```
par :
```typescript
  const canProceedStep0 = form.name.length >= 3 && (isPrivate || suggestions.length === 0)
  const canProceedStep1 = location.city && location.department && form.start_date
  const canProceedStep2 = isPrivate || selectedTags.length > 0   // tags optionnels en privé
```

- [ ] **Step 4: `is_private` à l'insert + auto-participation du créateur**

Dans `eventData`, ajouter le champ :
```typescript
        created_by_actor: currentActor.id,
        acted_by_user_id: user.id,
        is_private: isPrivate,
```
Puis, dans le bloc `if (data) { ... }`, AVANT `navigate(eventPath(data))`, créer la participation du créateur quand c'est privé :
```typescript
      if (data) {
        if (isPrivate) {
          // Event privé = suivi perso solo : on auto-crée la participation du créateur
          // (statut « j'y vais ») pour que le paiement + le bilan soient dispo direct.
          await addParticipation({
            event_id: data.id,
            actor_id: currentActor.id,
            acted_by_user_id: user.id,
            status: 'inscrit',
            visibility: 'amis',
          })
        }
        onClose?.()
        navigate(eventPath(data))
      }
```

- [ ] **Step 5: Le toggle 🔒 dans l'UI (étape 0)**

Dans le JSX de l'étape 0 (`key="name"`), juste après le `<div>` du champ Nom (avant `<DeduplicateSuggestions>`), insérer le toggle :
```tsx
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 cursor-pointer">
        <span className="flex items-center gap-2 text-sm">
          <Lock className="h-4 w-4 text-primary" />
          <span>
            <span className="font-medium">Événement privé</span>
            <span className="block text-xs text-muted-foreground">Visible seulement de toi et de qui a le lien — jamais dans les recherches</span>
          </span>
        </span>
        <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="h-5 w-5 accent-[var(--copper)]" />
      </label>
```

- [ ] **Step 6: Build + commit**

Run: `pnpm build`
Expected: PASS.

```bash
git add src/components/events/EventForm.tsx
git commit -m "feat(event): création d'événement privé (toggle 🔒 + auto-participation)"
```

---

## Task 6: Convertibilité + cadenas (EventPage)

**Files:**
- Modify: `src/pages/EventPage.tsx`

- [ ] **Step 1: `is_private` dans l'état d'édition**

Dans `editForm` (state, l. ~88), ajouter le champ initial `is_private: false`. Dans le `setEditForm({...})` de l'ouverture d'édition (l. ~177), ajouter `is_private: (event as { is_private?: boolean }).is_private ?? false`.

- [ ] **Step 2: État d'erreur d'édition (EventPage n'en a pas)**

EventPage n'a aucun mécanisme d'erreur d'édition. Ajouter un état dédié près de `const [editSaving, setEditSaving] = useState(false)` :
```typescript
  const [editError, setEditError] = useState<string | null>(null)
```
Et vérifier que `supabase` est importé en tête du fichier ; sinon ajouter `import { supabase } from '@/lib/supabase'`.

- [ ] **Step 3: Garde public→privé + payload**

Dans `handleSaveEdit`, tout en haut (après `setEditSaving(true)`), réinitialiser l'erreur puis poser la garde AVANT `const updates = {...}` :
```typescript
    setEditError(null)
    // Bascule public → privé : interdite si d'autres exposants ont déjà rejoint l'event
    // (on ne fait pas disparaître un event sous les pieds des autres).
    const wasPrivate = (event as { is_private?: boolean }).is_private ?? false
    if (!wasPrivate && editForm.is_private) {
      const { count } = await supabase
        .from('participations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
      if ((count ?? 0) > 1) {
        setEditSaving(false)
        setEditError('Impossible de rendre privé : d\'autres exposants y participent déjà.')
        return
      }
    }
```
Puis dans l'objet `updates`, ajouter :
```typescript
      is_private: editForm.is_private,
```
Et rendre l'erreur près du bouton « Enregistrer » du formulaire d'édition :
```tsx
{editError && <p className="text-sm text-destructive">{editError}</p>}
```

- [ ] **Step 4: Toggle privé dans le formulaire d'édition**

Dans le JSX du formulaire d'édition (là où sont les champs `editForm`), ajouter un toggle identique en esprit à celui de la création :
```tsx
      <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 cursor-pointer">
        <span className="flex items-center gap-2 text-sm">
          <Lock className="h-4 w-4 text-primary" />
          <span>
            <span className="font-medium">Événement privé</span>
            <span className="block text-xs text-muted-foreground">Privé → public : entre au répertoire. Public → privé : disparaît des recherches.</span>
          </span>
        </span>
        <input type="checkbox" checked={editForm.is_private} onChange={e => setEditForm(f => ({ ...f, is_private: e.target.checked }))} className="h-5 w-5 accent-[var(--copper)]" />
      </label>
```
(Importer `Lock` de `lucide-react` dans EventPage si pas déjà importé.)

- [ ] **Step 5: Cadenas 🔒 dans l'en-tête de la page event**

Là où le titre/nom de l'event est rendu dans l'en-tête (`EventHero` ou le header de `EventPage`), afficher un badge cadenas quand privé :
```tsx
{(event as { is_private?: boolean }).is_private && (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
    <Lock className="h-3 w-3" /> Privé
  </span>
)}
```
Placer ce badge à côté du nom de l'event (repérer le `<h1>`/titre dans le rendu de EventPage et l'insérer juste après).

- [ ] **Step 6: Build + commit**

Run: `pnpm build`
Expected: PASS.

```bash
git add src/pages/EventPage.tsx
git commit -m "feat(event): convertibilité privé/public + badge cadenas"
```

---

## Task 7: Cadenas sur le calendrier du créateur

**Files:**
- Modify: `src/hooks/use-participations.ts`
- Modify: `src/hooks/use-calendar.ts`
- Modify: `src/components/calendar/CalendarMonth.tsx`
- Modify: `src/components/calendar/MobileAgenda.tsx`

- [ ] **Step 1: Remonter `is_private` dans les participations**

Dans `useMyParticipations` (`use-participations.ts`), le select des participations imbrique `events(...)`. Ajouter `is_private` à la liste des colonnes du nested `events(...)`. Repérer la chaîne `events(` dans le `.select(...)` et y ajouter `, is_private` (ou `is_private` si liste). Si le select est `events(*)`, rien à faire (déjà inclus).

- [ ] **Step 2: `CalendarEvent` porte `isPrivate`**

Dans `use-calendar.ts`, ajouter au type `CalendarEvent` :
```typescript
  slug: string | null
  isPrivate?: boolean
```
et dans `buildCalendarMonths`, au `push({...})`, ajouter :
```typescript
      slug: p.events.slug,
      isPrivate: (p.events as { is_private?: boolean }).is_private ?? false,
```

- [ ] **Step 3: Rendre le cadenas**

Dans `CalendarMonth.tsx` et `MobileAgenda.tsx`, là où chaque event de calendrier est rendu (nom + ville), ajouter quand `ev.isPrivate` un petit cadenas inline :
```tsx
{ev.isPrivate && <Lock className="inline h-3 w-3 opacity-70" strokeWidth={2.2} />}
```
(Importer `Lock` de `lucide-react` dans chaque fichier. Le placer juste avant ou après le nom selon le layout existant.)

- [ ] **Step 4: Build + commit**

Run: `pnpm build`
Expected: PASS.

```bash
git add src/hooks/use-participations.ts src/hooks/use-calendar.ts src/components/calendar/CalendarMonth.tsx src/components/calendar/MobileAgenda.tsx
git commit -m "feat(calendar): cadenas 🔒 sur les événements privés du créateur"
```

---

## Task 8: Vérification end-to-end + version bump

- [ ] **Step 1: Build + lint + tests**

Run: `pnpm build && pnpm lint && pnpm test`
Expected: build PASS, lint 0 erreur (warnings préexistants Settings.tsx/use-community OK), tests verts (aucune régression — pas de nouveau test pur ici, la logique ajoutée est query-level ; cf. contrainte infra `reference_react_test_infra`).

- [ ] **Step 2: Smoke test manuel (dev) — les 3 chemins critiques**

Run: `pnpm dev`, en exposant :
1. **Création** : créer un event avec toggle 🔒 → on arrive sur sa page, badge « Privé », participation déjà présente (stepper paiement dispo).
2. **Non-listage** : l'event privé n'apparaît PAS dans Explorer, Carte, recherche. Sur la page de **création d'un autre event** au **même nom**, la dédup ne le suggère pas. Il n'est pas sur ma **vitrine publique** (ouvrir `/@monslug` en navigation privée).
3. **Accès par lien** : copier `/e/slug-suffixé`, ouvrir en navigation privée (anonyme) → la page s'affiche ; le bilan/paiement ne sont PAS visibles.
4. **Calendrier** : l'event privé apparaît sur MON calendrier avec le cadenas.
5. **Convertibilité** : éditer → passer public → il entre dans l'Explorer ; re-privé OK (solo).

- [ ] **Step 3: Bump version + commit + push**

Bumper `package.json` version (patch), ajouter une entrée `src/changelog.ts`, puis :
```bash
git add -A
git commit -m "chore: bump version — événements privés"
git push
```

---

## Self-review (couverture spec)

- `events.is_private` + index → Task 1. ✓
- Slug non devinable (suffixe privé) → Task 1 (trigger). ✓ (réalisé server-side, pas via helper JS — corrige la spec, même intention.)
- Création gratuite + toggle + tags optionnels + auto-participation → Task 5. ✓
- Pas de notif/fil à la création → notif déjà supprimée (ground truth) ; fil exclu en Task 4. ✓
- Surfaces exclues : Explorer/Carte/Admin (Task 3), Vitrine + fil Communauté (Task 4), dédup `search_similar_events` (Task 1), co-event (Task 1). ✓
- Surfaces visibles : Calendrier + Cockpit (participations propres, inchangé ; cadenas Task 7), page `/e/slug` (`useEvent` non filtré — Task 3 Step 2 le préserve explicitement). ✓
- Cadenas 🔒 → EventPage (Task 6) + calendrier (Task 7). ✓
- Convertibilité + garde public→privé si >1 participation → Task 6. ✓
- RPC follow-graph : aucun changement (ne touchent pas aux events) — vérifié. ✓
- Modèle unlisted assumé (durcissement écarté) → aucune RLS resserrée, aucun RPC get_event_by_slug. ✓
```
