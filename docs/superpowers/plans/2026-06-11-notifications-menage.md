# Ménage notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Séparer nettement les notifs perso (cloche, auto-read) de la vie du réseau (Communauté), afficher les nouveaux festivals dans le feed Communauté, ajouter un badge leftbar, et supprimer le broadcast `event_created` + le code mort.

**Architecture :** Deux maisons. La cloche lit la table `notifications` (perso). Communauté lit le feed dérivé `useCommunityFeed` auquel on ajoute une source « events créés » (plateforme entière, requête bornée — pas de notif, pas de fan-out). Le broadcast SQL `event_created` est retiré. Badge leftbar = compteur localStorage des nouveaux festivals depuis la dernière visite.

**Tech Stack :** React 19 + TS, Supabase (PostgREST + triggers SQL), Vitest, Tailwind v4.

**Spec :** `docs/superpowers/specs/2026-06-11-notifications-menage-design.md`

**Commandes :**
- Tests : `pnpm test` (vitest run) ou ciblé `npx vitest run src/lib/community.test.ts`
- Build : `pnpm build` (tsc -b + vite build)
- Lint : `pnpm lint`

---

## File Structure

- `supabase/migrations/<ts>_drop_event_created_broadcast.sql` — **créé** : retire le trigger/fonction broadcast.
- `src/lib/community.ts` — **modifié** : `FeedKind` + `filterBySegment` gèrent `'event_created'`.
- `src/lib/community.test.ts` — **modifié** : tests purs du nouveau kind.
- `src/hooks/use-community.ts` — **modifié** : 5ᵉ source (events plateforme) → `FeedItem`.
- `src/components/community/ActivityItem.tsx` — **modifié** : rendu `event_created`.
- `src/pages/Communaute.tsx` — **modifié** : header reformulé + écriture localStorage au montage.
- `src/components/notifications/NotificationItem.tsx` — **modifié** : prop `forceUnreadStyle`.
- `src/components/layout/SearchBar.tsx` — **modifié** : auto-read à l'ouverture, suppression « Tout lire ».
- `src/pages/Notifications.tsx` — **modifié** : liste perso unique, auto-read au montage.
- `src/lib/community-seen.ts` — **créé** : helpers localStorage purs (testables).
- `src/lib/community-seen.test.ts` — **créé** : tests purs.
- `src/hooks/use-community-badge.ts` — **créé** : compteur Pro (head count).
- `src/components/layout/Sidebar.tsx` — **modifié** : badge rouge sur l'entrée Communauté.
- `src/hooks/use-notifications.ts` — **modifié** : nettoyage exports devenus inutiles.
- **Supprimés** : `src/components/notifications/NotificationSlidePanel.tsx` (+ `.css`), `src/components/notifications/SidebarActivity.tsx`.

---

## Task 1 : Migration DB — couper le broadcast `event_created`

**Files:**
- Create: `supabase/migrations/<ts>_drop_event_created_broadcast.sql` (timestamp réel, format `YYYYMMDDHHMMSS`, postérieur à `20260602170000`)

- [ ] **Step 1 : Compter les lignes broadcast existantes (info, non destructif)**

Run (REST avec service role, depuis `.env`) :
```bash
SR="$SUPABASE_SERVICE_ROLE_KEY"; BASE="https://trbxpsknbtisqwefqoub.supabase.co/rest/v1"
curl -s "$BASE/notifications?type=eq.event_created&select=id" -H "apikey: $SR" -H "Authorization: Bearer $SR" -H "Prefer: count=exact" -H "Range: 0-0" -i | grep -i content-range
```
Expected : une ligne `Content-Range: 0-0/<N>`. Noter N (volume à purger éventuellement).

- [ ] **Step 2 : Écrire la migration**

Créer le fichier avec ce contenu :
```sql
-- Retire le broadcast event_created (fan-out N×M : 1 notif par utilisateur et par event).
-- La découverte des nouveaux festivals passe désormais par le feed Communauté (item dérivé,
-- plateforme entière) et Explorer — plus aucune notification générée pour event_created.
DROP TRIGGER IF EXISTS on_event_created ON events;
DROP FUNCTION IF EXISTS notify_event_created();

-- Si des triggers d'activité photo/info existent encore (alimentaient l'onglet Activité
-- supprimé), les retirer aussi. No-op si absents.
DROP TRIGGER IF EXISTS on_event_image_added ON events;
DROP FUNCTION IF EXISTS notify_event_image_added();
DROP TRIGGER IF EXISTS on_event_info_added ON events;
DROP FUNCTION IF EXISTS notify_event_info_added();
```

> **Purge des vieilles lignes** (`DELETE FROM notifications WHERE type = 'event_created';`) :
> NON incluse par défaut (destructif). À ajouter sur décision explicite d'Uriel après Step 1.

- [ ] **Step 3 : Pousser la migration**

Run : `supabase db push`
Expected : la migration `<ts>_drop_event_created_broadcast` s'applique sans erreur.
(Si `db push` la saute pour cause de divergence, voir mémoire « Supabase migration repair ».)

- [ ] **Step 4 : Vérifier que le trigger est parti**

Run :
```bash
SR="$SUPABASE_SERVICE_ROLE_KEY"; BASE="https://trbxpsknbtisqwefqoub.supabase.co/rest/v1"
curl -s "$BASE/rpc/exec_sql" -H "apikey: $SR" -H "Authorization: Bearer $SR" -H "Content-Type: application/json" \
  -d '{"query":"select tgname from pg_trigger where tgname = '"'"'on_event_created'"'"'"}' 2>/dev/null || \
echo "Pas de RPC exec_sql — vérifier via le dashboard SQL : select tgname from pg_trigger where tgname='on_event_created'; (0 ligne attendue)"
```
Expected : aucune ligne `on_event_created` (sinon, vérifier au dashboard SQL editor).

- [ ] **Step 5 : Commit**

```bash
git add supabase/migrations
git commit -m "feat(db): retire le broadcast event_created (fan-out N×M)"
```

---

## Task 2 : Feed — `event_created` dans le type et le filtre (TDD pur)

**Files:**
- Modify: `src/lib/community.ts:1` (FeedKind), `src/lib/community.ts:64-69` (filterBySegment)
- Test: `src/lib/community.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à `src/lib/community.test.ts` (les helpers `ev`/`ac` existent déjà en haut du fichier) :
```ts
describe('filterBySegment — event_created', () => {
  const items: FeedItem[] = [
    { id: 'evc-1', kind: 'event_created', occurredAt: '2026-06-10', actor: ac('a'), event: ev('e1', '2026-07-01') },
    { id: 'part-1', kind: 'participation', occurredAt: '2026-06-09', actor: ac('b'), event: ev('e2', '2026-07-02') },
  ]
  it("apparaît sous 'tout'", () => {
    expect(filterBySegment(items, 'tout').map(i => i.id)).toContain('evc-1')
  })
  it("est exclu des segments avis / reseau / ou-ils-vont", () => {
    expect(filterBySegment(items, 'avis').some(i => i.id === 'evc-1')).toBe(false)
    expect(filterBySegment(items, 'reseau').some(i => i.id === 'evc-1')).toBe(false)
    expect(filterBySegment(items, 'ou-ils-vont').some(i => i.id === 'evc-1')).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec de TYPE**

Run : `npx vitest run src/lib/community.test.ts`
Expected : échec de compilation TS — `'event_created'` n'est pas assignable à `FeedKind`.

- [ ] **Step 3 : Étendre `FeedKind`**

`src/lib/community.ts` ligne 1 :
```ts
export type FeedKind = 'review' | 'participation' | 'follow' | 'event_created'
```
`filterBySegment` (lignes 64-69) reste inchangé : `'tout'` renvoie tout ; les autres
segments filtrent par kind précis, donc `event_created` n'apparaît que sous `'tout'`.
Vérifier que c'est bien le cas (aucune modif nécessaire si le code matche la spec).

- [ ] **Step 4 : Lancer le test, vérifier le succès**

Run : `npx vitest run src/lib/community.test.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/community.ts src/lib/community.test.ts
git commit -m "feat(community): kind 'event_created' dans le feed (type + filtre)"
```

---

## Task 3 : Feed — source « events plateforme » dans `useCommunityFeed`

**Files:**
- Modify: `src/hooks/use-community.ts:60-128`

- [ ] **Step 1 : Ajouter la requête events au `Promise.all`**

Dans `src/hooks/use-community.ts`, le `Promise.all` (lignes 60-79) destructure
`[revRes, partRes, folRes, upcomingRes]`. Ajouter une 5ᵉ entrée `evtRes` :
```ts
const [revRes, partRes, folRes, upcomingRes, evtRes] = await Promise.all([
  // ... revRes, partRes, folRes, upcomingRes inchangés ...
  // 5e source : nouveaux festivals sur TOUTE la plateforme (cold-start), bornée.
  supabase.from('events')
    .select('id, name, city, start_date, end_date, image_url, slug, created_by_actor, created_at')
    .gte('created_at', since)
    .neq('created_by_actor', me)
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT),
])
```

- [ ] **Step 2 : Parser les events et enrichir eventMap + actorIds**

Juste après `const upcoming = ...` (ligne 84) :
```ts
const newEvents = (evtRes.data ?? []) as Array<{
  id: string; name: string; city: string | null; start_date: string; end_date: string;
  image_url: string | null; slug: string | null; created_by_actor: string | null; created_at: string
}>
```
Inclure leurs ids/acteurs dans les sets existants (lignes 86-92) :
```ts
const eventIds = [...new Set([
  ...reviews.map(r => r.event_id), ...parts.map(p => p.event_id),
  ...upcoming.map(u => u.event_id), ...newEvents.map(e => e.id),
])]
const actorIds = [...new Set([
  ...followingIds,
  ...fols.flatMap(f => [f.src_actor, f.dst_actor]).filter((x): x is string => !!x),
  ...newEvents.map(e => e.created_by_actor).filter((x): x is string => !!x),
])]
```
Et alimenter `eventMap` avec ces events (après la boucle `for (const e of eventsRes.data ...)`,
lignes 99-102) — ils peuvent déjà y être via la requête `events` par ids, mais on garantit leur présence :
```ts
for (const e of newEvents) {
  eventMap[e.id] ??= { id: e.id, name: e.name, city: e.city, startDate: e.start_date, endDate: e.end_date, imageUrl: e.image_url, slug: e.slug ?? null }
}
```

- [ ] **Step 3 : Construire les `FeedItem` event_created**

Après la boucle `for (const f of fols)` (vers ligne 128), ajouter :
```ts
for (const e of newEvents) {
  if (!e.created_by_actor || !eventMap[e.id]) continue
  items.push({
    id: `evc-${e.id}`, kind: 'event_created', occurredAt: e.created_at,
    actor: unknownActor(e.created_by_actor), event: eventMap[e.id],
  })
}
```
`sortFeed(items)` (déjà appelé ligne 146) les classe par `occurredAt`.

- [ ] **Step 4 : Vérifier le build**

Run : `pnpm build`
Expected : tsc + vite OK, zéro erreur de type.

- [ ] **Step 5 : Commit**

```bash
git add src/hooks/use-community.ts
git commit -m "feat(community): source events plateforme dans le feed"
```

---

## Task 4 : Rendu `event_created` dans `ActivityItem`

**Files:**
- Modify: `src/components/community/ActivityItem.tsx:42` (après le bloc `follow`)

- [ ] **Step 1 : Ajouter la branche de rendu**

Dans `src/components/community/ActivityItem.tsx`, après le bloc `{item.kind === 'follow' && ...}`
(et avant la fermeture de `</div>` de `.act-b`), ajouter :
```tsx
{item.kind === 'event_created' && item.event && (
  <div className="act-t"><ActorName actor={a} /> a ajouté{' '}
    <Link to={eventPath(item.event)}>{item.event.name}</Link>{' '}
    <time>· {ago(item.occurredAt)}</time>
  </div>
)}
```

- [ ] **Step 2 : Vérifier le build**

Run : `pnpm build`
Expected : OK.

- [ ] **Step 3 : Commit**

```bash
git add src/components/community/ActivityItem.tsx
git commit -m "feat(community): rendu 'X a ajouté <festival>' dans le feed"
```

---

## Task 5 : Header Communauté reformulé

**Files:**
- Modify: `src/pages/Communaute.tsx:47,58`

- [ ] **Step 1 : Reformuler les deux occurrences de `comm-sub`**

Remplacer le texte `Le fil de ton réseau — où vont tes compagnons, ce qu'ils en disent.`
(lignes 47 ET 58) par :
```tsx
<div className="comm-sub">Ce que vit ta tribu, et les nouveaux festivals sur Fellowship.</div>
```

- [ ] **Step 2 : Vérifier le build**

Run : `pnpm build`
Expected : OK.

- [ ] **Step 3 : Commit**

```bash
git add src/pages/Communaute.tsx
git commit -m "feat(community): header reflète le scope plateforme (pas que le réseau)"
```

---

## Task 6 : `NotificationItem` — prop `forceUnreadStyle`

**Files:**
- Modify: `src/components/notifications/NotificationItem.tsx:129-134,167-220`

- [ ] **Step 1 : Ajouter la prop à l'interface**

`NotificationItemProps` (lignes 129-134) :
```ts
interface NotificationItemProps {
  notification: Notification
  isFriend: boolean
  onRead: (id: string) => void
  compact?: boolean
  forceUnreadStyle?: boolean
}
```
Et la signature (ligne 136) :
```ts
export function NotificationItem({ notification, isFriend, onRead, compact = false, forceUnreadStyle = false }: NotificationItemProps) {
```

- [ ] **Step 2 : Découpler l'affichage « non lu » de `read`**

Juste après la ligne `const data = ...` (ligne 139), ajouter :
```ts
const showUnread = !notification.read || forceUnreadStyle
```
Puis remplacer les 4 usages de `!notification.read` qui pilotent le STYLE par `showUnread` :
- ligne 173 : `${showUnread ? 'bg-primary/5' : ''}`
- ligne 183 : `${showUnread ? 'font-medium' : 'text-muted-foreground'}`
- ligne 220 : `{showUnread && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />}`
NE PAS toucher la ligne 170 (`onClick={() => !notification.read && onRead(...)}`) : le clic
reste basé sur l'état réel `read`.

- [ ] **Step 3 : Vérifier le build**

Run : `pnpm build`
Expected : OK (prop optionnelle, rétro-compatible).

- [ ] **Step 4 : Commit**

```bash
git add src/components/notifications/NotificationItem.tsx
git commit -m "feat(notif): prop forceUnreadStyle (surlignage découplé de read)"
```

---

## Task 7 : Cloche — auto-read à l'ouverture, suppression « Tout lire »

**Files:**
- Modify: `src/components/layout/SearchBar.tsx:39,46,181-235`

- [ ] **Step 1 : Snapshot + auto-read à l'ouverture**

Dans `SearchBar.tsx`, ajouter un état snapshot près de `const [bellOpen, setBellOpen] = useState(false)` (ligne 46) :
```ts
const [bellSnapshot, setBellSnapshot] = useState<Set<string>>(new Set())
```
Remplacer le `onClick` du bouton cloche (ligne 186) par un handler qui, à l'OUVERTURE,
fige les non-lus puis marque tout lu :
```tsx
onClick={() => {
  setBellOpen(prev => {
    const next = !prev
    if (next) {
      setBellSnapshot(new Set(personalNotifs.filter(n => !n.read).map(n => n.id)))
      if (personalUnread > 0) markAllAsRead()
    }
    return next
  })
}}
```

- [ ] **Step 2 : Supprimer le bouton « Tout lire » et passer le snapshot aux items**

Dans le `notif-dropdown-header` (lignes 198-205), retirer le bloc :
```tsx
{personalUnread > 0 && (
  <button onClick={markAllAsRead} className="notif-dropdown-mark-all">Tout lire</button>
)}
```
Dans le `.map` des items (lignes 210-222), ajouter la prop :
```tsx
<NotificationItem
  key={n.id}
  notification={n}
  isFriend={!!actorId && followingIds.has(actorId)}
  onRead={markAsRead}
  forceUnreadStyle={bellSnapshot.has(n.id)}
  compact
/>
```

- [ ] **Step 3 : Nettoyer l'import devenu inutile si besoin**

`markAllAsRead` reste utilisé (Step 1). Vérifier qu'aucun import/var n'est orphelin.
Run : `pnpm lint`
Expected : pas d'erreur `no-unused-vars`.

- [ ] **Step 4 : Vérifier le build**

Run : `pnpm build`
Expected : OK.

- [ ] **Step 5 : Commit**

```bash
git add src/components/layout/SearchBar.tsx
git commit -m "feat(notif): cloche auto-read à l'ouverture, suppression 'Tout lire'"
```

---

## Task 8 : Page `/notifications` — liste perso unique

**Files:**
- Modify: `src/pages/Notifications.tsx` (réécriture)

- [ ] **Step 1 : Réécrire le composant sans onglets, auto-read au montage**

Remplacer l'intégralité de `src/pages/Notifications.tsx` par :
```tsx
import { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from '@/components/notifications/NotificationItem'

export function NotificationsPage() {
  const { personalNotifs, personalUnread, loading, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()

  // Auto-read au montage (cohérent avec la cloche). markAllAsRead est idempotent.
  useEffect(() => {
    if (personalUnread > 0) markAllAsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalUnread])

  return (
    <div className="page-width page-padding">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Notifications</h1>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Chargement...</p>
      ) : personalNotifs.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {personalNotifs.map(n => {
            const data = (n.data ?? {}) as Record<string, unknown>
            const actorId = typeof data.actor_id === 'string' ? data.actor_id : undefined
            return (
              <NotificationItem
                key={n.id}
                notification={n}
                isFriend={!!actorId && followingIds.has(actorId)}
                onRead={markAsRead}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier le build**

Run : `pnpm build`
Expected : OK. (Plus d'usage de `activities`, `unreadCount`, `Activity`, `Check`, `Button`, `useState` ici.)

- [ ] **Step 3 : Commit**

```bash
git add src/pages/Notifications.tsx
git commit -m "feat(notif): page /notifications = liste perso unique (fin onglet Activité)"
```

---

## Task 9 : Helpers localStorage « vu » (TDD pur)

**Files:**
- Create: `src/lib/community-seen.ts`
- Test: `src/lib/community-seen.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

`src/lib/community-seen.test.ts` :
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { seenKey, getLastSeen, markSeenNow } from './community-seen'

beforeEach(() => localStorage.clear())

describe('community-seen', () => {
  it('seenKey est scopé par acteur', () => {
    expect(seenKey('abc')).toBe('fellowship-communaute-seen-abc')
  })
  it("getLastSeen renvoie l'epoch 0 ISO si rien", () => {
    expect(getLastSeen('abc')).toBe(new Date(0).toISOString())
  })
  it('markSeenNow puis getLastSeen renvoie la valeur écrite', () => {
    markSeenNow('abc', '2026-06-11T10:00:00.000Z')
    expect(getLastSeen('abc')).toBe('2026-06-11T10:00:00.000Z')
  })
})
```

- [ ] **Step 2 : Lancer, vérifier l'échec**

Run : `npx vitest run src/lib/community-seen.test.ts`
Expected : FAIL — module introuvable.

- [ ] **Step 3 : Implémenter**

`src/lib/community-seen.ts` :
```ts
// Mémoire locale « dernière visite de Communauté », par acteur, pour le badge leftbar.
export function seenKey(actorId: string): string {
  return `fellowship-communaute-seen-${actorId}`
}

export function getLastSeen(actorId: string): string {
  return localStorage.getItem(seenKey(actorId)) ?? new Date(0).toISOString()
}

// `nowIso` injectable pour les tests (sinon new Date().toISOString()).
export function markSeenNow(actorId: string, nowIso?: string): void {
  localStorage.setItem(seenKey(actorId), nowIso ?? new Date().toISOString())
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**

Run : `npx vitest run src/lib/community-seen.test.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/community-seen.ts src/lib/community-seen.test.ts
git commit -m "feat(community): helpers localStorage 'dernière visite'"
```

---

## Task 10 : Hook `use-community-badge` (compteur Pro)

**Files:**
- Create: `src/hooks/use-community-badge.ts`

- [ ] **Step 1 : Implémenter le hook**

`src/hooks/use-community-badge.ts` :
```ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { getLastSeen } from '@/lib/community-seen'

// Badge leftbar Communauté : nb de nouveaux festivals depuis la dernière visite.
// Pro only (la ligne est lockée pour les gratuits). Choix assumé : on compte les events
// (signal dominant, requête O(1) head:true), pas chaque micro-activité réseau.
export function useCommunityBadge(): number {
  const { currentActor, currentActorRow } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    const isPro = planForActor(currentActor, currentActorRow) === 'pro'
    if (!currentActor || !isPro) { setCount(0); return } // eslint-disable-line react-hooks/set-state-in-effect
    let cancelled = false
    const me = currentActor.id
    const lastSeen = getLastSeen(me)
    supabase.from('events').select('id', { count: 'exact', head: true })
      .gt('created_at', lastSeen).neq('created_by_actor', me)
      .then(({ count: c }) => { if (!cancelled) setCount(c ?? 0) })
    return () => { cancelled = true }
  }, [currentActor, currentActorRow])

  return count
}
```

- [ ] **Step 2 : Vérifier le build**

Run : `pnpm build`
Expected : OK.

- [ ] **Step 3 : Commit**

```bash
git add src/hooks/use-community-badge.ts
git commit -m "feat(community): hook compteur badge Communauté (Pro)"
```

---

## Task 11 : Badge leftbar + reset au montage de Communauté

**Files:**
- Modify: `src/components/layout/Sidebar.tsx:4-10,55-69`
- Modify: `src/pages/Communaute.tsx` (import + useEffect montage)

- [ ] **Step 1 : Brancher le compteur dans la Sidebar**

`src/components/layout/Sidebar.tsx`, ajouter l'import :
```ts
import { useCommunityBadge } from '@/hooks/use-community-badge'
```
Dans le composant (près des autres hooks, ~ligne 35) :
```ts
const communityBadge = useCommunityBadge()
```
Dans le rendu de l'entrée nav active (bloc `state === 'active'`, lignes 60-69), à côté de
`showCount`, ajouter l'affichage du badge pour la clé `communaute` :
```tsx
const showCount = key === 'calendrier' && myDatesCount > 0
const showCommBadge = key === 'communaute' && communityBadge > 0
return (
  <NavLink key={key} to={to} title={collapsed ? def.label : undefined}
    className={({ isActive }) => (isActive ? 'active' : '')}>
    <Icon strokeWidth={2} />
    <span className="navlabel">{def.label}</span>
    {showCount && <span className="nav-count">{myDatesCount}</span>}
    {showCommBadge && <span className="navbadge">{communityBadge > 9 ? '9+' : communityBadge}</span>}
  </NavLink>
)
```
(`navbadge` = style rouge déjà défini pour l'entrée Admin.)

- [ ] **Step 2 : Reset localStorage au montage de Communauté**

`src/pages/Communaute.tsx`, ajouter les imports :
```ts
import { useEffect } from 'react'
import { markSeenNow } from '@/lib/community-seen'
```
(`useEffect` est peut-être déjà importé via `useState, useMemo` — fusionner l'import React.)
Dans `CommunautePage`, après `const { currentActor, currentActorRow } = useAuth()` :
```ts
useEffect(() => {
  if (currentActor) markSeenNow(currentActor.id)
}, [currentActor])
```

- [ ] **Step 3 : Vérifier le build + lint**

Run : `pnpm build && pnpm lint`
Expected : OK.

- [ ] **Step 4 : Commit**

```bash
git add src/components/layout/Sidebar.tsx src/pages/Communaute.tsx
git commit -m "feat(community): badge rouge leftbar + reset à l'ouverture"
```

---

## Task 12 : Suppression du code mort + nettoyage `use-notifications`

**Files:**
- Delete: `src/components/notifications/NotificationSlidePanel.tsx`, `src/components/notifications/NotificationSlidePanel.css`, `src/components/notifications/SidebarActivity.tsx`
- Modify: `src/hooks/use-notifications.ts`

- [ ] **Step 1 : Confirmer l'absence d'imports**

Run : `npx grep -rn "NotificationSlidePanel\|SidebarActivity" src` (ou Grep).
Expected : seulement les définitions elles-mêmes (aucun import tiers). Si un import existe, STOP et le traiter.

- [ ] **Step 2 : Supprimer les fichiers morts**

```bash
git rm src/components/notifications/NotificationSlidePanel.tsx src/components/notifications/NotificationSlidePanel.css src/components/notifications/SidebarActivity.tsx
```

- [ ] **Step 3 : Nettoyer `use-notifications.ts`**

Vérifier les usages restants de `activities` et `unreadCount` :
Run : `npx grep -rn "\.activities\|unreadCount\|\bACTIVITY_TYPES\b" src`
- Si plus aucun consommateur de `activities` / `unreadCount` : retirer leur calcul et leur
  présence dans le `return` de `useNotifications` (lignes 71-75), ainsi que `ACTIVITY_TYPES`
  s'il n'est plus référencé. Garder `personalNotifs` / `personalUnread` (filtrage défensif
  conservé). Ne PAS retirer ce qui est encore consommé ailleurs.

- [ ] **Step 4 : Vérifier le build + lint**

Run : `pnpm build && pnpm lint`
Expected : OK, zéro import cassé, zéro `no-unused-vars`.

- [ ] **Step 5 : Commit**

```bash
git add -A
git commit -m "chore(notif): supprime le code mort (SlidePanel, SidebarActivity) + nettoie use-notifications"
```

---

## Task 13 : Vérification finale + bump version + push

- [ ] **Step 1 : Suite de tests complète**

Run : `pnpm test`
Expected : tous les tests passent (dont `community.test.ts`, `community-seen.test.ts`).

- [ ] **Step 2 : Build + lint**

Run : `pnpm build && pnpm lint`
Expected : OK.

- [ ] **Step 3 : Bump version**

Incrémenter le patch dans `package.json` (`"version"`).

- [ ] **Step 4 : Commit + push**

```bash
git add package.json
git commit -m "chore: bump version (ménage notifications)"
git push
```

- [ ] **Step 5 : Vérif manuelle en prod (après déploiement Netlify)**

Sur `fellowship-app.netlify.app`, login, hard-reload (SW PWA) :
1. Ouvrir la cloche → le badge tombe à 0, les items restent surlignés ; recharger → surlignage parti.
2. Ajouter un festival depuis un autre compte → apparaît dans Communauté (« X a ajouté … ») et incrémente le badge leftbar.
3. Ouvrir Communauté → badge à 0.

---

## Notes de dépendances entre tâches

- Task 1 (DB) est indépendante — peut se faire en premier ou en parallèle.
- Task 2 → Task 3 → Task 4 (feed : type, puis source, puis rendu) : ordre strict.
- Task 6 → Task 7 (la cloche dépend de la prop `forceUnreadStyle`).
- Task 9 → Task 10 → Task 11 (helpers → hook → UI).
- Task 12 (cleanup) après les autres pour ne pas casser des imports en cours de route.
- Task 13 en dernier.
