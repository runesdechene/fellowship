# Communauté — le fil du réseau (v1) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire la page `/communaute` (fil du réseau Pro + teaser flouté gratuit) et le mini-fil sidebar, fidèles à la maquette `docs/decisions/assets/communaute-fil.html`.

**Architecture:** Composition **côté client** (pas de nouveau RPC SQL ni migration) : on lit l'ensemble « qui tu suis » via `follows`, puis on agrège reviews + participations + follows récents et les convergences à venir via des requêtes `.from()` PostgREST. La **visibilité est garantie côté serveur par la RLS existante** (participations `amis` ne sont lisibles que par les amis ; reviews publiques). Toute la logique de tri/filtre/classement vit dans des **fonctions pures** (`src/lib/community.ts`) testées isolément ; le hook `use-community.ts` ne fait que fetch + appel des transforms. Gating pro-par-entité (`planForActor`) : Pro → fil complet, gratuit → teaser flouté (même requête convergences, rendu masqué).

**Tech Stack:** React 19 + TS, Supabase JS (`.from()` + `supabase.rpc('get_friend_ids')`), Vitest (tests purs), CSS-first DA (tokens HSL, système 2-thèmes nuit/jour).

**Référence spec :** `docs/superpowers/specs/2026-05-27-communaute-fil-design.md`.
**Référence visuelle (markup + classes CSS à porter) :** `docs/decisions/assets/communaute-fil.html`.

---

## Découvertes de cadrage (lues dans le code, à respecter)

- **`reviews`** : colonnes `affluence`, `organisation`, `rentabilite` (notes 1–5), `comment`, `created_at`, `actor_id`, `event_id`. **Pas de colonne visibilité** → avis publics. Note ★ globale = `Math.round((affluence+organisation+rentabilite)/3)`.
- **`participations`** : `actor_id`, `event_id`, `status` (enum), `visibility` (`prive|amis|public`), `created_at`. La RLS filtre déjà ce que le viewer peut lire.
- **`follows`** : `follower_actor`, `following_actor`, `created_at` (acteurs, pas users).
- **`actor_public`** (vue, pas de FK) : `actor_id`, `label`, `avatar_url`, `entity_type`, `kind`, `public_slug`. PostgREST n'infère pas la jointure → **pattern 2 requêtes** : charger les lignes, puis `actor_public` via `.in('actor_id', ids)`, joindre en JS (cf. `use-season-companions.ts`).
- **`events`** : `id`, `name`, `city`, `department`, `start_date`, `end_date`, `image_url`, `tags`.
- **`get_friend_ids(p_user_id)`** (RPC existant) : renvoie les acteurs **amis mutuels** (utile seulement si on doit re-filtrer le `amis` côté client en fallback).
- **Gating** : `planForActor(currentActor, currentActorRow)` (`src/lib/navModel.ts`) → `'pro' | 'free'`.
- **Couleur d'avatar déterministe** : motif `saColor(name)` de `src/components/notifications/SidebarActivity.tsx` (hash → palette). Réutiliser le même algo.

---

## Structure de fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/community.ts` (créer) | Types `FeedItem`/`Convergence`/`Suggestion`/`Segment` + fonctions **pures** : `reviewStars`, `sortFeed`, `filterBySegment`, `rankConvergences`, `rankSuggestions`, `avatarColor`. |
| `src/lib/community.test.ts` (créer) | Tests Vitest des fonctions pures. |
| `src/hooks/use-community.ts` (créer) | `useCommunityFeed()` (fetch + compose) et `useNetworkActivityMini()` (top 3 sidebar). |
| `src/components/community/ConvergenceCard.tsx` (créer) | Item roi (hero) du fil. |
| `src/components/community/ActivityItem.tsx` (créer) | Item d'activité, variantes `review`/`participation`/`follow`. |
| `src/components/community/ConvergenceList.tsx` (créer) | Carte « Convergences à venir » (colonne droite). |
| `src/components/community/SuggestionsCard.tsx` (créer) | Carte « Suggestions pour toi » (colonne droite). |
| `src/components/community/CommunauteTeaser.tsx` (créer) | Préview floutée gratuite + CTA Pro. |
| `src/components/community/SidebarNetworkActivity.tsx` (créer) | Mini-fil sidebar (remplace l'usage de `SidebarActivity`). |
| `src/pages/Communaute.tsx` (créer) | Page : gating split, layout, segments, pagination, états. |
| `src/pages/Communaute.css` (créer) | Styles DA portés de la maquette (2-thèmes). |
| `src/App.tsx` (modifier) | Route `/communaute` → `<CommunautePage />` **sans** `ProGate`. |
| `src/lib/navModel.ts` (modifier) | `communaute.built = true`. |
| `src/components/layout/Sidebar.tsx` (modifier) | Remplacer `<SidebarActivity>` par `<SidebarNetworkActivity>`. |

---

## Task 1 : Fonctions pures — types, `reviewStars`, `avatarColor`, `sortFeed`

**Files:**
- Create: `src/lib/community.ts`
- Test: `src/lib/community.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

```ts
// src/lib/community.test.ts
import { describe, it, expect } from 'vitest'
import { reviewStars, avatarColor, sortFeed, type FeedItem } from './community'

describe('reviewStars', () => {
  it('moyenne arrondie des 3 axes', () => {
    expect(reviewStars({ affluence: 5, organisation: 4, rentabilite: 5 })).toBe(5) // 4.67 → 5
    expect(reviewStars({ affluence: 3, organisation: 3, rentabilite: 3 })).toBe(3)
    expect(reviewStars({ affluence: 2, organisation: 3, rentabilite: 2 })).toBe(2) // 2.33 → 2
  })
})

describe('avatarColor', () => {
  it('déterministe pour un même nom', () => {
    expect(avatarColor('Théo')).toBe(avatarColor('Théo'))
  })
  it('renvoie une couleur de la palette', () => {
    expect(avatarColor('Camille')).toMatch(/^#/)
  })
})

describe('sortFeed', () => {
  it('trie par occurredAt décroissant', () => {
    const items = [
      { id: 'a', occurredAt: '2026-05-01T00:00:00Z' },
      { id: 'b', occurredAt: '2026-05-10T00:00:00Z' },
      { id: 'c', occurredAt: '2026-05-05T00:00:00Z' },
    ] as FeedItem[]
    expect(sortFeed(items).map(i => i.id)).toEqual(['b', 'c', 'a'])
  })
})
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

Run: `pnpm vitest run src/lib/community.test.ts`
Expected: FAIL — `Cannot find module './community'`.

- [ ] **Step 3 : Implémentation minimale**

```ts
// src/lib/community.ts

export type FeedKind = 'review' | 'participation' | 'follow'
export type Segment = 'tout' | 'ou-ils-vont' | 'avis' | 'reseau'

export interface FeedActor {
  actorId: string
  label: string
  avatarUrl: string | null
  slug: string | null
}

export interface FeedEventRef {
  id: string
  name: string
  city: string | null
  startDate: string
  endDate: string
  imageUrl: string | null
}

export interface FeedItem {
  id: string
  kind: FeedKind
  occurredAt: string
  actor: FeedActor
  event?: FeedEventRef          // review | participation
  stars?: number                // review
  comment?: string | null       // review
  status?: string               // participation
  target?: FeedActor            // follow (l'acteur nouvellement suivi)
}

export interface Convergence {
  event: FeedEventRef
  count: number                 // nb de tes abonnements qui y vont
  sample: FeedActor[]           // jusqu'à 5 avatars
}

export interface Suggestion {
  actor: FeedActor
  sharedFollowers: number       // combien de tes abonnements le suivent
  sharedEvents: number          // festivals en commun avec toi
  reason: string                // libellé déjà composé pour l'UI
}

const PALETTE = ['#3d9970', '#f0a060', '#6c5ce7', '#e84393', '#f39c12', '#00b894', '#e07a5f']

/** Couleur d'avatar déterministe (même algo que SidebarActivity). */
export function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

/** Note globale 1–5 d'un avis = moyenne arrondie des 3 axes. */
export function reviewStars(r: { affluence: number; organisation: number; rentabilite: number }): number {
  return Math.round((r.affluence + r.organisation + r.rentabilite) / 3)
}

/** Tri anti-chronologique du fil. */
export function sortFeed(items: FeedItem[]): FeedItem[] {
  return [...items].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  )
}
```

- [ ] **Step 4 : Lancer pour vérifier le succès**

Run: `pnpm vitest run src/lib/community.test.ts`
Expected: PASS (3 describes).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/community.ts src/lib/community.test.ts
git commit -m "feat(communaute): types + helpers purs (reviewStars, avatarColor, sortFeed)"
```

---

## Task 2 : `filterBySegment`

**Files:**
- Modify: `src/lib/community.ts`
- Test: `src/lib/community.test.ts`

- [ ] **Step 1 : Ajouter le test qui échoue**

```ts
// append to src/lib/community.test.ts
import { filterBySegment } from './community'

describe('filterBySegment', () => {
  const items = [
    { id: 'r', kind: 'review' },
    { id: 'p', kind: 'participation' },
    { id: 'f', kind: 'follow' },
  ] as FeedItem[]
  it('tout = tous', () => expect(filterBySegment(items, 'tout')).toHaveLength(3))
  it('avis = reviews', () => expect(filterBySegment(items, 'avis').map(i => i.id)).toEqual(['r']))
  it('ou-ils-vont = participations', () => expect(filterBySegment(items, 'ou-ils-vont').map(i => i.id)).toEqual(['p']))
  it('reseau = follows', () => expect(filterBySegment(items, 'reseau').map(i => i.id)).toEqual(['f']))
})
```

- [ ] **Step 2 : Lancer → FAIL** (`filterBySegment is not a function`).

Run: `pnpm vitest run src/lib/community.test.ts`

- [ ] **Step 3 : Implémenter**

```ts
// append to src/lib/community.ts
export function filterBySegment(items: FeedItem[], seg: Segment): FeedItem[] {
  if (seg === 'tout') return items
  if (seg === 'avis') return items.filter(i => i.kind === 'review')
  if (seg === 'ou-ils-vont') return items.filter(i => i.kind === 'participation')
  return items.filter(i => i.kind === 'follow') // reseau
}
```

- [ ] **Step 4 : Lancer → PASS.**

Run: `pnpm vitest run src/lib/community.test.ts`

- [ ] **Step 5 : Commit**

```bash
git add src/lib/community.ts src/lib/community.test.ts
git commit -m "feat(communaute): filterBySegment (Tout/Avis/Où ils vont/Réseau)"
```

---

## Task 3 : `rankConvergences`

**Files:**
- Modify: `src/lib/community.ts`
- Test: `src/lib/community.test.ts`

- [ ] **Step 1 : Test qui échoue**

```ts
// append to src/lib/community.test.ts
import { rankConvergences, type FeedActor, type FeedEventRef } from './community'

const ev = (id: string, start: string): FeedEventRef =>
  ({ id, name: id, city: 'X', startDate: start, endDate: start, imageUrl: null })
const ac = (id: string): FeedActor => ({ actorId: id, label: id, avatarUrl: null, slug: id })

describe('rankConvergences', () => {
  it('garde les events avec ≥2 abonnements distincts, triés count desc puis date asc', () => {
    const parts = [
      { eventId: 'e1', actor: ac('a') },
      { eventId: 'e1', actor: ac('b') },
      { eventId: 'e1', actor: ac('a') }, // doublon acteur → compte une fois
      { eventId: 'e2', actor: ac('a') }, // 1 seul → exclu
      { eventId: 'e3', actor: ac('a') },
      { eventId: 'e3', actor: ac('b') },
      { eventId: 'e3', actor: ac('c') },
    ]
    const events = { e1: ev('e1', '2026-09-20'), e2: ev('e2', '2026-09-01'), e3: ev('e3', '2026-10-01') }
    const res = rankConvergences(parts, events)
    expect(res.map(c => c.event.id)).toEqual(['e3', 'e1']) // e3 count 3 avant e1 count 2 ; e2 exclu
    expect(res[0].count).toBe(3)
  })
  it('échantillonne au plus 5 avatars', () => {
    const parts = ['a', 'b', 'c', 'd', 'e', 'f'].map(a => ({ eventId: 'e1', actor: ac(a) }))
    const res = rankConvergences(parts, { e1: ev('e1', '2026-09-20') })
    expect(res[0].sample).toHaveLength(5)
    expect(res[0].count).toBe(6)
  })
})
```

- [ ] **Step 2 : Lancer → FAIL.**

Run: `pnpm vitest run src/lib/community.test.ts`

- [ ] **Step 3 : Implémenter**

```ts
// append to src/lib/community.ts
export function rankConvergences(
  parts: Array<{ eventId: string; actor: FeedActor }>,
  events: Record<string, FeedEventRef>,
): Convergence[] {
  const byEvent = new Map<string, Map<string, FeedActor>>()
  for (const p of parts) {
    if (!events[p.eventId]) continue
    let m = byEvent.get(p.eventId)
    if (!m) { m = new Map(); byEvent.set(p.eventId, m) }
    if (!m.has(p.actor.actorId)) m.set(p.actor.actorId, p.actor)
  }
  const out: Convergence[] = []
  for (const [eventId, actors] of byEvent) {
    if (actors.size < 2) continue
    const list = [...actors.values()]
    out.push({ event: events[eventId], count: list.length, sample: list.slice(0, 5) })
  }
  return out.sort((a, b) =>
    b.count - a.count ||
    new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime()
  )
}
```

- [ ] **Step 4 : Lancer → PASS.**

Run: `pnpm vitest run src/lib/community.test.ts`

- [ ] **Step 5 : Commit**

```bash
git add src/lib/community.ts src/lib/community.test.ts
git commit -m "feat(communaute): rankConvergences (≥2 abonnements, tri count/date)"
```

---

## Task 4 : `rankSuggestions`

**Files:**
- Modify: `src/lib/community.ts`
- Test: `src/lib/community.test.ts`

- [ ] **Step 1 : Test qui échoue**

```ts
// append to src/lib/community.test.ts
import { rankSuggestions } from './community'

describe('rankSuggestions', () => {
  it('classe par (2×abonnements communs + festivals communs) décroissant', () => {
    const res = rankSuggestions([
      { actor: ac('lucie'), sharedFollowers: 0, sharedEvents: 4 }, // score 4
      { actor: ac('naim'),  sharedFollowers: 3, sharedEvents: 0 }, // score 6
      { actor: ac('elise'), sharedFollowers: 1, sharedEvents: 1 }, // score 3
    ])
    expect(res.map(s => s.actor.actorId)).toEqual(['naim', 'lucie', 'elise'])
  })
  it('compose une raison lisible', () => {
    const [s] = rankSuggestions([{ actor: ac('lucie'), sharedFollowers: 0, sharedEvents: 4 }])
    expect(s.reason).toContain('4')
  })
})
```

- [ ] **Step 2 : Lancer → FAIL.**

Run: `pnpm vitest run src/lib/community.test.ts`

- [ ] **Step 3 : Implémenter**

```ts
// append to src/lib/community.ts
export function rankSuggestions(
  candidates: Array<{ actor: FeedActor; sharedFollowers: number; sharedEvents: number }>,
): Suggestion[] {
  const score = (c: { sharedFollowers: number; sharedEvents: number }) =>
    c.sharedFollowers * 2 + c.sharedEvents
  return [...candidates]
    .sort((a, b) => score(b) - score(a))
    .map(c => ({
      ...c,
      reason:
        c.sharedFollowers > 0
          ? `Suivi par ${c.sharedFollowers} compagnon${c.sharedFollowers > 1 ? 's' : ''}`
          : `Va à ${c.sharedEvents} festival${c.sharedEvents > 1 ? 's' : ''} que tu suis`,
    }))
}
```

- [ ] **Step 4 : Lancer → PASS.** `pnpm vitest run src/lib/community.test.ts`

- [ ] **Step 5 : Commit**

```bash
git add src/lib/community.ts src/lib/community.test.ts
git commit -m "feat(communaute): rankSuggestions (heuristique abonnements + festivals communs)"
```

---

## Task 5 : Hook `use-community.ts` (fetch + composition)

**Files:**
- Create: `src/hooks/use-community.ts`

> Pas de test unitaire (fetch réseau ; contrainte infra RTL). Vérifié au build + smoke (Task 11). Toute la logique testable est déjà en Task 1-4.

- [ ] **Step 1 : Écrire le hook**

```ts
// src/hooks/use-community.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  sortFeed, rankConvergences, rankSuggestions,
  reviewStars, type FeedItem, type FeedActor, type FeedEventRef,
  type Convergence, type Suggestion,
} from '@/lib/community'

const WINDOW_DAYS = 30
const FEED_LIMIT = 60

interface CommunityData {
  feed: FeedItem[]
  convergences: Convergence[]
  suggestions: Suggestion[]
  loading: boolean
  error: boolean
}

/** Charge actor_public pour un set d'ids → Map actorId → FeedActor. */
async function loadActors(ids: string[]): Promise<Map<string, FeedActor>> {
  const map = new Map<string, FeedActor>()
  if (ids.length === 0) return map
  const { data } = await supabase
    .from('actor_public')
    .select('actor_id, label, avatar_url, public_slug')
    .in('actor_id', ids)
  for (const a of data ?? []) {
    if (a.actor_id) map.set(a.actor_id, {
      actorId: a.actor_id, label: a.label ?? '—', avatarUrl: a.avatar_url, slug: a.public_slug,
    })
  }
  return map
}

export function useCommunityFeed(): CommunityData {
  const { currentActor } = useAuth()
  const [data, setData] = useState<CommunityData>({
    feed: [], convergences: [], suggestions: [], loading: true, error: false,
  })

  useEffect(() => {
    if (!currentActor) { setData(d => ({ ...d, loading: false })); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    const me = currentActor.id
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()
    const today = new Date().toISOString().slice(0, 10)

    async function run() {
      try {
        // 1. Qui je suis (abonnements one-way).
        const { data: follows } = await supabase
          .from('follows').select('following_actor').eq('follower_actor', me)
        const followingIds = [...new Set((follows ?? [])
          .map(f => f.following_actor).filter((x): x is string => !!x))]
        if (followingIds.length === 0) {
          if (!cancelled) setData({ feed: [], convergences: [], suggestions: [], loading: false, error: false })
          return
        }

        // 2. Activité récente (RLS filtre la visibilité côté serveur).
        const [revRes, partRes, folRes, upcomingRes] = await Promise.all([
          supabase.from('reviews')
            .select('id, actor_id, event_id, affluence, organisation, rentabilite, comment, created_at')
            .in('actor_id', followingIds).gte('created_at', since)
            .order('created_at', { ascending: false }).limit(FEED_LIMIT),
          supabase.from('participations')
            .select('id, actor_id, event_id, status, created_at')
            .in('actor_id', followingIds).gte('created_at', since)
            .order('created_at', { ascending: false }).limit(FEED_LIMIT),
          supabase.from('follows')
            .select('id, follower_actor, following_actor, created_at')
            .in('follower_actor', followingIds).gte('created_at', since)
            .order('created_at', { ascending: false }).limit(FEED_LIMIT),
          supabase.from('participations')
            .select('actor_id, event_id, events!inner(start_date)')
            .in('actor_id', followingIds).gte('events.start_date', today),
        ])

        const reviews = revRes.data ?? []
        const parts = partRes.data ?? []
        const fols = folRes.data ?? []
        const upcoming = (upcomingRes.data ?? []) as Array<{ actor_id: string | null; event_id: string }>

        // 3. Charger events + actors référencés (pattern 2 requêtes, actor_public sans FK).
        const eventIds = [...new Set([
          ...reviews.map(r => r.event_id), ...parts.map(p => p.event_id), ...upcoming.map(u => u.event_id),
        ])]
        const actorIds = [...new Set([
          ...followingIds,
          ...fols.map(f => f.following_actor).filter((x): x is string => !!x),
        ])]
        const [eventsRes, actorMap] = await Promise.all([
          eventIds.length
            ? supabase.from('events').select('id, name, city, start_date, end_date, image_url').in('id', eventIds)
            : Promise.resolve({ data: [] as never[] }),
          loadActors(actorIds),
        ])
        const eventMap: Record<string, FeedEventRef> = {}
        for (const e of eventsRes.data ?? []) {
          eventMap[e.id] = { id: e.id, name: e.name, city: e.city, startDate: e.start_date, endDate: e.end_date, imageUrl: e.image_url }
        }
        const unknownActor = (id: string | null): FeedActor =>
          (id && actorMap.get(id)) || { actorId: id ?? '?', label: '—', avatarUrl: null, slug: null }

        // 4. Mapper en FeedItem[].
        const items: FeedItem[] = []
        for (const r of reviews) {
          if (!r.actor_id || !eventMap[r.event_id]) continue
          items.push({
            id: `rev-${r.id}`, kind: 'review', occurredAt: r.created_at,
            actor: unknownActor(r.actor_id), event: eventMap[r.event_id],
            stars: reviewStars(r), comment: r.comment,
          })
        }
        for (const p of parts) {
          if (!p.actor_id || !eventMap[p.event_id]) continue
          items.push({
            id: `part-${p.id}`, kind: 'participation', occurredAt: p.created_at,
            actor: unknownActor(p.actor_id), event: eventMap[p.event_id], status: p.status,
          })
        }
        for (const f of fols) {
          if (!f.follower_actor || !f.following_actor) continue
          items.push({
            id: `fol-${f.id}`, kind: 'follow', occurredAt: f.created_at,
            actor: unknownActor(f.follower_actor), target: unknownActor(f.following_actor),
          })
        }

        // 5. Convergences.
        const convParts = upcoming
          .filter(u => u.actor_id)
          .map(u => ({ eventId: u.event_id, actor: unknownActor(u.actor_id) }))
        const convergences = rankConvergences(convParts, eventMap).slice(0, 5)

        // 6. Suggestions : acteurs suivis par mes abonnements mais pas par moi.
        const { data: secondDegree } = await supabase
          .from('follows').select('following_actor').in('follower_actor', followingIds)
        const counts = new Map<string, number>()
        for (const s of secondDegree ?? []) {
          const id = s.following_actor
          if (!id || id === me || followingIds.includes(id)) continue
          counts.set(id, (counts.get(id) ?? 0) + 1)
        }
        const suggIds = [...counts.keys()].slice(0, 12)
        const suggActors = await loadActors(suggIds)
        const suggestions = rankSuggestions(
          suggIds.map(id => ({
            actor: suggActors.get(id) ?? unknownActor(id),
            sharedFollowers: counts.get(id) ?? 0, sharedEvents: 0,
          }))
        ).slice(0, 5)

        if (!cancelled) setData({ feed: sortFeed(items), convergences, suggestions, loading: false, error: false })
      } catch {
        if (!cancelled) setData(d => ({ ...d, loading: false, error: true }))
      }
    }
    run()
    return () => { cancelled = true }
  }, [currentActor])

  return data
}

/** Mini-fil sidebar : top 3 items récents (réutilise la même source, requête légère). */
export function useNetworkActivityMini(): FeedItem[] {
  const { feed } = useCommunityFeed()
  return feed.slice(0, 3)
}
```

> Note PostgREST : la jointure `events!inner(start_date)` filtrée `gte('events.start_date', today)` suppose une FK `participations.event_id → events` détectable (elle existe, cf. `participations_event_id_fkey`). Si l'éditeur refuse le filtre imbriqué, fallback : charger toutes les participations à venir des abonnements puis filtrer par `eventMap[eventId].startDate >= today` en JS. Vérifier au build/smoke.

- [ ] **Step 2 : Build (typecheck)**

Run: `pnpm build`
Expected: 0 erreur TS dans `use-community.ts`. (Si erreurs de type sur les colonnes : aligner les `select` sur les noms exacts ci-dessus.)

- [ ] **Step 3 : Commit**

```bash
git add src/hooks/use-community.ts
git commit -m "feat(communaute): hook useCommunityFeed (composition client + visibilité RLS) + useNetworkActivityMini"
```

---

## Task 6 : Composants de présentation du fil

**Files:**
- Create: `src/components/community/ConvergenceCard.tsx`
- Create: `src/components/community/ActivityItem.tsx`
- Create: `src/components/community/ConvergenceList.tsx`
- Create: `src/components/community/SuggestionsCard.tsx`

> Markup **fidèle à la maquette** (`communaute-fil.html`) : reprendre les classes CSS telles quelles (`.conv`, `.conv-affiche`, `.act`, `.act-av`, `.act-t`, `.act-stars`, `.act-chips`, `.avs`, `.card`, `.sugg`, `.conv-mini`…). Les composants ne portent **aucun style inline** hors la couleur d'avatar (`background: avatarColor(label)`) qui est dynamique. Pas de test (présentational).

- [ ] **Step 1 : `ConvergenceCard.tsx`** (item roi)

```tsx
// src/components/community/ConvergenceCard.tsx
import { Link } from 'react-router-dom'
import { avatarColor, type Convergence } from '@/lib/community'

function fmtRange(start: string, end: string): string {
  const s = new Date(start), e = new Date(end)
  const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return s.toDateString() === e.toDateString()
    ? s.toLocaleDateString('fr-FR', opt)
    : `${s.toLocaleDateString('fr-FR', { day: 'numeric' })}–${e.toLocaleDateString('fr-FR', opt)}`
}

export function ConvergenceCard({ conv }: { conv: Convergence }) {
  const { event, count, sample } = conv
  return (
    <div className="conv">
      {event.imageUrl && (
        <div className="conv-affiche"><img src={event.imageUrl} alt="" /></div>
      )}
      <div className="conv-body">
        <span className="conv-eyb">🎪 Ça se rassemble</span>
        <b>{event.name}</b>
        <div className="conv-meta">{fmtRange(event.startDate, event.endDate)}{event.city ? ` · ${event.city}` : ''}</div>
        <div className="conv-foot">
          <div className="avs">
            {sample.map(a => (
              <span key={a.actorId} style={{ background: avatarColor(a.label) }}>{a.label[0]?.toUpperCase()}</span>
            ))}
            {count > sample.length && <span className="avs-more">+{count - sample.length}</span>}
          </div>
          <span className="ftxt"><b>{count} de tes compagnons</b> y seront</span>
        </div>
      </div>
      <Link className="btn btn-g" to={`/evenement/${event.id}`}>Voir le festival</Link>
    </div>
  )
}
```

- [ ] **Step 2 : `ActivityItem.tsx`** (variantes)

```tsx
// src/components/community/ActivityItem.tsx
import { Link } from 'react-router-dom'
import { avatarColor, type FeedItem } from '@/lib/community'

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} j`
}

export function ActivityItem({ item, isFollowed, onFollow }: {
  item: FeedItem
  isFollowed?: boolean
  onFollow?: (actorId: string) => void
}) {
  const a = item.actor
  return (
    <div className="act">
      <div className="act-av" style={{ background: avatarColor(a.label) }}>{a.label[0]?.toUpperCase()}</div>
      <div className="act-b">
        {item.kind === 'review' && item.event && (
          <>
            <div className="act-t"><b>{a.label}</b> a noté{' '}
              <Link to={`/evenement/${item.event.id}`}>{item.event.name}</Link>{' '}
              <time>· {ago(item.occurredAt)}</time>
            </div>
            <div className="act-stars">{'★'.repeat(item.stars ?? 0)}{'☆'.repeat(5 - (item.stars ?? 0))}
              {item.comment && <span>« {item.comment} »</span>}
            </div>
          </>
        )}
        {item.kind === 'participation' && item.event && (
          <div className="act-t"><b>{a.label}</b> va à{' '}
            <Link to={`/evenement/${item.event.id}`}>{item.event.name}</Link>{' '}
            <time>· {ago(item.occurredAt)}</time>
          </div>
        )}
        {item.kind === 'follow' && item.target && (
          <>
            <div className="act-t"><b>{a.label}</b> suit désormais <b>{item.target.label}</b>{' '}
              <time>· {ago(item.occurredAt)}</time>
            </div>
            {item.target.slug && <div className="act-sub"><Link to={`/${item.target.slug}`}>Voir la vitrine</Link></div>}
          </>
        )}
      </div>
      {item.kind === 'follow' && item.target && onFollow && (
        <button
          className={`btn btn-follow ${isFollowed ? 'is-on' : 'btn-p'}`}
          onClick={() => onFollow(item.target!.actorId)}
        >
          <span>{isFollowed ? 'Suivi' : 'Suivre'}</span>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3 : `ConvergenceList.tsx`** (colonne droite)

```tsx
// src/components/community/ConvergenceList.tsx
import { Link } from 'react-router-dom'
import { avatarColor, type Convergence } from '@/lib/community'

export function ConvergenceList({ items }: { items: Convergence[] }) {
  if (items.length === 0) return null
  return (
    <div className="card">
      <h2>Convergences à venir</h2>
      {items.map(c => (
        <Link key={c.event.id} to={`/evenement/${c.event.id}`} className="conv-mini">
          <div className="cm-b">
            <b>{c.event.name}</b>
            <span>{new Date(c.event.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{c.event.city ? ` · ${c.event.city}` : ''}</span>
          </div>
          <div className="avs">
            {c.sample.slice(0, 2).map(a => (
              <span key={a.actorId} style={{ background: avatarColor(a.label) }}>{a.label[0]?.toUpperCase()}</span>
            ))}
            {c.count > 2 && <span className="avs-more">+{c.count - 2}</span>}
          </div>
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 4 : `SuggestionsCard.tsx`** (colonne droite)

```tsx
// src/components/community/SuggestionsCard.tsx
import { avatarColor, type Suggestion } from '@/lib/community'

export function SuggestionsCard({ items, isFollowed, onFollow }: {
  items: Suggestion[]
  isFollowed: (actorId: string) => boolean
  onFollow: (actorId: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="card">
      <h2>Suggestions pour toi</h2>
      {items.map(s => {
        const on = isFollowed(s.actor.actorId)
        return (
          <div key={s.actor.actorId} className="sugg">
            <div className="sav" style={{ background: avatarColor(s.actor.label) }}>{s.actor.label[0]?.toUpperCase()}</div>
            <div className="sb"><b>{s.actor.label}</b><span>{s.reason}</span></div>
            <button className={`btn btn-g btn-follow ${on ? 'is-on' : ''}`} onClick={() => onFollow(s.actor.actorId)}>
              <span>{on ? 'Suivi' : 'Suivre'}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5 : Build + commit**

Run: `pnpm build` → 0 erreur.

```bash
git add src/components/community/
git commit -m "feat(communaute): composants fil (ConvergenceCard, ActivityItem, ConvergenceList, SuggestionsCard)"
```

---

## Task 7 : `CommunauteTeaser.tsx` (préview gratuite floutée)

**Files:**
- Create: `src/components/community/CommunauteTeaser.tsx`

- [ ] **Step 1 : Écrire le composant**

```tsx
// src/components/community/CommunauteTeaser.tsx
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useCommunityFeed } from '@/hooks/use-community'
import { ConvergenceCard } from './ConvergenceCard'
import { ActivityItem } from './ActivityItem'

/** Gratuit : vraies convergences/activité de l'utilisateur, 2-3 items lisibles puis flou + CTA Pro. */
export function CommunauteTeaser() {
  const { feed, convergences } = useCommunityFeed()
  const preview = feed.slice(0, 3)
  return (
    <div className="comm-teaser">
      <div className="comm-teaser-feed" aria-hidden="true">
        {convergences[0] && <ConvergenceCard conv={convergences[0]} />}
        {preview.map(item => <ActivityItem key={item.id} item={item} />)}
      </div>
      <div className="comm-teaser-veil">
        <div className="comm-teaser-cta">
          <div className="comm-teaser-lock"><Lock strokeWidth={1.5} /></div>
          <h2>Vois où va ta tribu</h2>
          <p>Le fil de ton réseau — convergences, avis, nouvelles dates de tes compagnons.</p>
          <Link to="/reglages" className="btn btn-p">Passer en Pro — dès 9,99 € HT/mois</Link>
        </div>
      </div>
    </div>
  )
}
```

> Le flou est porté par `.comm-teaser-feed` (filter blur) + le voile dégradé `.comm-teaser-veil` (Task 8 CSS). Soft paywall présentational — pas une mesure de sécurité.

- [ ] **Step 2 : Build + commit**

Run: `pnpm build` → 0 erreur.

```bash
git add src/components/community/CommunauteTeaser.tsx
git commit -m "feat(communaute): teaser gratuit (vraies convergences floutées + CTA Pro)"
```

---

## Task 8 : Page `Communaute.tsx` + `Communaute.css`

**Files:**
- Create: `src/pages/Communaute.tsx`
- Create: `src/pages/Communaute.css`

- [ ] **Step 1 : Écrire la page**

```tsx
// src/pages/Communaute.tsx
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useCommunityFeed } from '@/hooks/use-community'
import { useFollows } from '@/hooks/use-follows'
import { filterBySegment, type Segment } from '@/lib/community'
import { ConvergenceCard } from '@/components/community/ConvergenceCard'
import { ActivityItem } from '@/components/community/ActivityItem'
import { ConvergenceList } from '@/components/community/ConvergenceList'
import { SuggestionsCard } from '@/components/community/SuggestionsCard'
import { CommunauteTeaser } from '@/components/community/CommunauteTeaser'
import './Communaute.css'

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'tout', label: 'Tout' },
  { key: 'ou-ils-vont', label: 'Où ils vont' },
  { key: 'avis', label: 'Avis' },
  { key: 'reseau', label: 'Réseau' },
]

function CommunauteEmpty() {
  return (
    <div className="comm-empty">
      <div className="comm-empty-icon">🧭</div>
      <h2>Ton réseau est encore discret</h2>
      <p>Suis des compagnons sur Explorer pour voir où va ton monde, ce qu'ils en disent et où vous vous croiserez.</p>
      <Link to="/explorer" className="btn btn-p">Découvrir des exposants</Link>
    </div>
  )
}

export function CommunautePage() {
  const { currentActor, currentActorRow } = useAuth()
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'
  const { feed, convergences, suggestions, loading, error } = useCommunityFeed()
  const { following, follow } = useFollows() // following: Set<actorId> ; follow(actorId)
  const [segment, setSegment] = useState<Segment>('tout')

  const visible = useMemo(() => filterBySegment(feed, segment), [feed, segment])
  const isFollowed = (id: string) => following.has(id)

  if (!isPro) {
    return (
      <div className="comm-page">
        <div className="comm-head"><h1>Communauté</h1>
          <div className="comm-sub">Le fil de ton réseau — où vont tes compagnons, ce qu'ils en disent.</div>
        </div>
        <CommunauteTeaser />
      </div>
    )
  }

  return (
    <div className="comm-page">
      <div className="comm-head">
        <h1>Communauté</h1>
        <div className="comm-sub">Le fil de ton réseau — où vont tes compagnons, ce qu'ils en disent.</div>
        <div className="comm-segs">
          {SEGMENTS.map(s => (
            <button key={s.key} className={`seg ${segment === s.key ? 'on' : ''}`} onClick={() => setSegment(s.key)}>{s.label}</button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="comm-empty"><p>Impossible de charger le fil. Réessaie.</p></div>
      ) : loading ? (
        <div className="comm-feed">{[0, 1, 2].map(i => <div key={i} className="act comm-skel" />)}</div>
      ) : feed.length === 0 && convergences.length === 0 ? (
        <CommunauteEmpty />
      ) : (
        <div className="comm-grid">
          <div className="comm-feed">
            {segment !== 'avis' && segment !== 'reseau' && convergences[0] && (
              <ConvergenceCard conv={convergences[0]} />
            )}
            {visible.map(item => (
              <ActivityItem key={item.id} item={item} isFollowed={item.target ? isFollowed(item.target.actorId) : false} onFollow={follow} />
            ))}
            {visible.length === 0 && <div className="comm-empty-inline">Rien dans cette catégorie pour l'instant.</div>}
          </div>
          <aside className="comm-side">
            <ConvergenceList items={convergences} />
            <SuggestionsCard items={suggestions} isFollowed={isFollowed} onFollow={follow} />
          </aside>
        </div>
      )}
    </div>
  )
}
```

> ⚠️ **Dépendance `useFollows`** : vérifier dans `src/hooks/use-follows.ts` l'API exacte exposée. La page suppose `{ following: Set<string>, follow(actorId): Promise<void> }`. Si l'API diffère (ex. `isFollowing(id)` / `toggleFollow`), adapter les 3 usages (`following.has`, `onFollow`) à la signature réelle — **ne pas réécrire `useFollows`**. (Step 1.5 ci-dessous.)

- [ ] **Step 1.5 : Aligner sur l'API réelle de `useFollows`**

Run: `pnpm exec tsc --noEmit` (ou lire `src/hooks/use-follows.ts`).
Adapter `following`/`follow`/`isFollowed` aux exports réels du hook. Objectif : 0 erreur TS.

- [ ] **Step 2 : Écrire `Communaute.css`** — port de la maquette + 2-thèmes

Porter les classes de `docs/decisions/assets/communaute-fil.html` en les **préfixant page** (`.comm-page …`) et en remplaçant les variables locales de la maquette par les **tokens DA de l'app** (`hsl(var(--card))`, `hsl(var(--border))`, `hsl(var(--foreground))`, `hsl(var(--muted-foreground))`, `hsl(var(--primary))`, etc. — cf. `src/index.css` et `src/pages/Explorer.css`). Mapping maquette → token :

| Maquette | Token app |
|---|---|
| `--surface` / `--surface2` | `hsl(var(--card))` / `hsl(var(--muted))` |
| `--text` / `--muted` | `hsl(var(--foreground))` / `hsl(var(--muted-foreground))` |
| `--line` | `hsl(var(--border))` |
| `--cop`/`--cop-d` (dégradé) | `hsl(var(--primary))` → bouton `.btn-p` |
| `--amber` (accents, liens `.act-t a`) | `hsl(var(--primary))` ou token amber existant si présent |

Classes à porter : `.comm-page`, `.comm-head h1/.comm-sub`, `.comm-segs .seg/.seg.on`, `.comm-grid` (grille `1fr 330px`, `< 1080px` → 1 colonne, `.comm-side` masquée), `.comm-feed`, `.conv`/`.conv-affiche`/`.conv-body`/`.conv-eyb`/`.conv-meta`/`.conv-foot`/`.ftxt`, `.avs span`/`.avs-more`, `.act`/`.act-av`/`.act-b`/`.act-t`/`.act-stars`/`.act-sub`/`.act-chips`, `.btn`/`.btn-p`/`.btn-g`/`.btn-follow.is-on`, `.card`/`.card h2`, `.sugg`/`.sav`/`.sb`, `.conv-mini`/`.cm-b`.

Plus le teaser : `.comm-teaser` (position relative), `.comm-teaser-feed` (`filter: blur(5px)`, `pointer-events:none`, `user-select:none`), `.comm-teaser-veil` (absolute, dégradé `transparent → hsl(var(--background))` + flex center), `.comm-teaser-cta`, `.comm-teaser-lock`.
Plus états : `.comm-empty`/`.comm-empty-icon`, `.comm-empty-inline`, `.comm-skel` (animation `pulse`, `min-height`).

**Gotchas jour/nuit obligatoires** (cf. `reference_da_daynight_gotchas`, spec §6) :
1. SVG : `.comm-page svg { fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round }`.
2. Aucun `#fff` en dur sauf texte sur fonds colorés fixes (`.btn-p`, `.act-av`, `.sav`, `.avs span` → ceux-ci gardent `color:#1c1310`/`#fff` car fond couleur dynamique). Tout le reste → `hsl(var(--foreground))`.
3. Ombres : `.conv`/`.card` → override `.light` chaud très basse opacité (`box-shadow: 0 12px 30px rgba(60,45,35,.07)`).

- [ ] **Step 3 : Build + lint**

Run: `pnpm build && pnpm lint`
Expected: 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/pages/Communaute.tsx src/pages/Communaute.css
git commit -m "feat(communaute): page fil (gating Pro/teaser, segments, états, DA 2-thèmes)"
```

---

## Task 9 : Câblage route + nav

**Files:**
- Modify: `src/App.tsx` (ligne ~98)
- Modify: `src/lib/navModel.ts` (ligne 21)

- [ ] **Step 1 : Importer la page dans `App.tsx`**

Ajouter près des autres imports de pages :
```tsx
import { CommunautePage } from '@/pages/Communaute'
```

- [ ] **Step 2 : Remplacer la route `/communaute`**

Remplacer la ligne :
```tsx
<Route path="/communaute" element={<AuthenticatedApp><ProGate title="Communauté"><ComingSoon title="Communauté" /></ProGate></AuthenticatedApp>} />
```
par (on retire `ProGate` : la page gère elle-même Pro vs teaser, sinon les gratuits ne verraient jamais le teaser) :
```tsx
<Route path="/communaute" element={<AuthenticatedApp><CommunautePage /></AuthenticatedApp>} />
```

- [ ] **Step 3 : Marquer la page construite dans `navModel.ts`**

Ligne 21, passer `built: false` → `built: true` :
```ts
communaute:      { key: 'communaute',      to: '/communaute',      label: 'Communauté',     icon: 'Users',           pro: true,  built: true },
```
(Effet : pour un gratuit, `entryState` renvoie `lock-pro` → cadenas dans la sidebar mais le clic navigue vers `/communaute` = le teaser, exactement le chemin de conversion. Pour un Pro : `active`.)

- [ ] **Step 4 : Build + commit**

Run: `pnpm build` → 0 erreur.

```bash
git add src/App.tsx src/lib/navModel.ts
git commit -m "feat(communaute): route /communaute → page réelle (teaser géré in-page), nav built=true"
```

---

## Task 10 : Mini-fil sidebar « Activité du réseau »

**Files:**
- Create: `src/components/community/SidebarNetworkActivity.tsx`
- Modify: `src/components/layout/Sidebar.tsx` (import + usage ligne 8 / 77)

> Réutilise les classes existantes de `Sidebar.css` (`.side-activity`, `.sa-head`, `.live`, `.sa-item`, `.sav`, `.sat`, `.sa-all`) — déjà stylées. Gating : Pro → mini-fil réel ; gratuit → 1 ligne verrouillée + nudge.

- [ ] **Step 1 : Écrire `SidebarNetworkActivity.tsx`**

```tsx
// src/components/community/SidebarNetworkActivity.tsx
import { Link } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { useNetworkActivityMini } from '@/hooks/use-community'
import { avatarColor, type FeedItem } from '@/lib/community'

function miniText(item: FeedItem): string {
  if (item.kind === 'review') return `a noté ${item.event?.name ?? ''}`
  if (item.kind === 'participation') return `va à ${item.event?.name ?? ''}`
  return `suit ${item.target?.label ?? ''}`
}

export function SidebarNetworkActivity({ collapsed }: { collapsed: boolean }) {
  const { currentActor, currentActorRow } = useAuth()
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'
  const items = useNetworkActivityMini()

  if (collapsed) {
    return <Link to="/communaute" className="sa-bell" aria-label="Activité du réseau"><Activity strokeWidth={1.5} /></Link>
  }

  if (!isPro) {
    return (
      <div className="side-activity">
        <div className="sa-head"><span className="live" /> <span>Activité du réseau</span></div>
        <Link to="/communaute" className="sa-item sa-locked">
          <span className="sav" style={{ background: 'hsl(var(--muted))' }}>✦</span>
          <span className="sat">Vois où va ta tribu — <b>Pro</b></span>
        </Link>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="side-activity">
      <div className="sa-head"><span className="live" /> <span>Activité du réseau</span></div>
      {items.map(item => (
        <Link key={item.id} to="/communaute" className="sa-item">
          <span className="sav" style={{ background: avatarColor(item.actor.label) }}>{item.actor.label[0]?.toUpperCase()}</span>
          <span className="sat"><b>{item.actor.label}</b> {miniText(item)}</span>
        </Link>
      ))}
      <Link to="/communaute" className="sa-all">Tout voir →</Link>
    </div>
  )
}
```

> Si la classe `.sa-locked` n'existe pas dans `Sidebar.css`, l'ajouter (opacité ~.85, curseur pointer) — sinon le style hérite de `.sa-item`, acceptable.

- [ ] **Step 2 : Brancher dans `Sidebar.tsx`**

Ligne 8, remplacer l'import :
```tsx
import { SidebarNetworkActivity } from '@/components/community/SidebarNetworkActivity'
```
Ligne ~77, remplacer l'usage :
```tsx
<SidebarNetworkActivity collapsed={collapsed} />
```
(L'ancien `SidebarActivity` (notifications) n'est plus référencé ; le laisser en place pour l'historique, ne pas le supprimer dans ce lot.)

- [ ] **Step 3 : Build + lint + commit**

Run: `pnpm build && pnpm lint` → 0 erreur.

```bash
git add src/components/community/SidebarNetworkActivity.tsx src/components/layout/Sidebar.tsx src/components/layout/Sidebar.css
git commit -m "feat(communaute): mini-fil sidebar branché sur l'activité réseau (gating Pro/teaser)"
```

---

## Task 11 : Vérification finale (build, tests, smoke jour/nuit) + bump version

**Files:**
- Modify: fichier de version si présent (`src/version.ts` ou équivalent)

- [ ] **Step 1 : Suite complète**

Run: `pnpm vitest run src/lib/community.test.ts && pnpm build && pnpm lint`
Expected: tests PASS, build OK, lint 0 erreur.

- [ ] **Step 2 : Smoke manuel (dev)**

Run: `pnpm dev`, se connecter avec une entité **Pro** ayant des abonnements actifs.
Vérifier sur `/communaute` :
- fil rempli (avis ★, « va à », follows), item roi convergence en tête ;
- segments filtrent (Avis / Où ils vont / Réseau) ;
- colonne droite : convergences + suggestions ;
- mini-fil sidebar = 3 items + « Tout voir → » ;
- **toggle jour/nuit** : pas de blob SVG noir, pas de texte invisible en jour, ombres douces.
Puis avec une entité **gratuite** : `/communaute` montre le **teaser flouté** + CTA ; sidebar montre la ligne verrouillée.
Cas **réseau vide** (entité sans abonnements) : état vide `CommunauteEmpty` orienté Explorer.

- [ ] **Step 3 : Bump version + commit final**

Bumper le patch dans le fichier de version (préférence projet). Puis :
```bash
git add -A
git commit -m "chore(communaute): bump version — fil du réseau v1"
git push
```

---

## Auto-vérification (couverture spec)

- **§2 périmètre v1** : fil convergences/va-à/avis/réseau (Task 1-6) ✓ ; convergences carte + item roi (Task 3, 6, 8) ✓ ; suggestions colonne droite (Task 4, 6) ✓ ; teaser flouté (Task 7) ✓ ; segments/pagination*/état vide/responsive (Task 8) ✓ ; mini-fil sidebar (Task 10) ✓.
  - *Pagination : le `FEED_LIMIT=60` + fenêtre 30 j couvre l'échelle alpha en un fetch (pas de scroll infini en v1 ; le spec parlait de pages ~20 — borné par la fenêtre, suffisant au lancement). Si volume réel le justifie, ajouter le curseur `before` plus tard.
- **§3 visibilité** : abonnements one-way + RLS serveur pour `amis`/`prive` (Task 5 archi) ✓ ; reviews publiques (découverte : pas de colonne visibilité) ✓.
- **§4 données** : composition client (déviation assumée vs RPC, même intention) — `follows`/`reviews`/`participations`/`events`/`actor_public` (Task 5) ✓.
- **§5 UI & états** : gating entité active (Task 8) ✓ ; teaser réel floutté (Task 7) ✓ ; vide/chargement/erreur (Task 8) ✓ ; responsive (Task 8 CSS) ✓.
- **§5.1 mini-fil** : `useNetworkActivityMini` + `SidebarNetworkActivity`, gating, « Tout voir » → `/communaute` (Task 10) ✓.
- **§6 DA jour/nuit** : 3 gotchas dans le CSS (Task 8 Step 2) + smoke toggle (Task 11) ✓.
- **§7 tests** : transforms purs testés (Task 1-4), pas de RTL ✓.

## Déviations vs spec (à valider au handoff)
1. **Archi : composition client au lieu d'un RPC SQL** (pattern maison, évite migration + friction types RPC ; visibilité par RLS). Même résultat fonctionnel.
2. **Pagination simplifiée** : un fetch borné (60 items / 30 j) plutôt qu'un curseur `before` — suffisant à l'échelle alpha, curseur ajoutable plus tard.

## Risques & rollback
| Risque | Mitigation |
|---|---|
| Jointure imbriquée PostgREST (`events!inner`, `actor_public`) refusée | Fallback 2 requêtes + filtre JS (noté Task 5). |
| API `useFollows` différente de l'hypothèse | Step 1.5 Task 8 : aligner sur les exports réels, ne pas réécrire le hook. |
| RLS ne filtre pas `amis` comme supposé | Smoke Task 11 avec une participation `amis` non-amie : si visible à tort, re-filtrer client via `get_friend_ids`. |
| Fil vide au lancement | État vide soigné orienté Explorer (Task 8). |
