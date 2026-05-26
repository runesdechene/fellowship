# Calendrier — Intégration DA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer la DA « Nuit de Festival » à la page Calendrier en consommant le vocabulaire de statut unifié (`participationChip`), sans régresser la logique existante (fenêtre glissante, filtres, modal, vues mobiles).

**Architecture :** `CalendarEvent` gagne `paymentStatus` ; `CalendarMonth` remplace son `STATUS_CONFIG` maison par `participationChip` (statut de l'utilisateur) et regroupe les événements d'amis dans une section « Tes compagnons ce mois-ci » ; `Calendar.css` est réécrit sur les tokens DA corrects (triplets via `hsl(var(--token))`, couleurs de statut via `var(--status-*)`) au look maquette ; `MonthBanner` et les vues mobiles passent sur les tokens.

**Tech Stack :** React 19, TS, Tailwind v4 (CSS-first), Vitest, lucide-react. Référence visuelle : `docs/decisions/assets/calendar-exposant.html`.

**Hors périmètre :** teaser `ProGate`, application migration/types, vocab des autres surfaces tierces.

---

## File Structure

- **Modify** `src/hooks/use-calendar.ts` — `CalendarEvent.paymentStatus`, propagation dans `useCalendarYear`.
- **Test** `src/hooks/use-calendar.test.ts` (create) — test pur de propagation.
- **Modify** `src/components/calendar/CalendarMonth.tsx` — chip via `participationChip` ; section « Tes compagnons ce mois-ci ».
- **Modify** `src/components/calendar/MonthBanner.tsx` — couleur token-aware.
- **Modify** `src/components/calendar/MobileMonthView.tsx` — statut via `participationChip` ; suppression `rgba(61,48,40,…)`.
- **Modify** `src/components/calendar/MobileYearGrid.tsx` — fallback couleur token.
- **Modify** `src/pages/Calendar.css` — réécriture complète sur tokens DA + look maquette.
- **Modify** `src/pages/Calendar.tsx` — passe le `actorKind` de l'utilisateur à `CalendarMonth` (depuis `useAuth`).

---

## Task 1: Données — `paymentStatus` dans `CalendarEvent`

**Files:**
- Modify: `src/hooks/use-calendar.ts`
- Test: `src/hooks/use-calendar.test.ts` (create)

- [ ] **Step 1: Écrire le test**

```ts
// src/hooks/use-calendar.test.ts
import { describe, it, expect } from 'vitest'
import { buildCalendarMonths } from './use-calendar'
import type { ParticipationWithEvent } from '@/types/database'

const part = (over: Partial<ParticipationWithEvent> & { events: Record<string, unknown> }): ParticipationWithEvent => ({
  id: 'p1', actor_id: 'a1', event_id: 'e1', status: 'inscrit', visibility: 'public',
  payment_status: 'a_payer', payments: null, created_at: '2026-01-01',
  ...over,
} as unknown as ParticipationWithEvent)

describe('buildCalendarMonths', () => {
  it('propage payment_status dans CalendarEvent', () => {
    const p = part({ events: { id: 'e1', name: 'Salon', start_date: '2026-03-10', end_date: '2026-03-11', city: 'Lyon', department: '69', tags: ['salon'], image_url: null } })
    const months = buildCalendarMonths([p], 2026)
    const ev = months[2].events[0]
    expect(ev.paymentStatus).toBe('a_payer')
    expect(ev.status).toBe('inscrit')
  })

  it('paymentStatus null si absent', () => {
    const p = part({ payment_status: null, events: { id: 'e1', name: 'X', start_date: '2026-05-01', end_date: '2026-05-01', city: 'Paris', department: '75', tags: [], image_url: null } })
    const months = buildCalendarMonths([p], 2026)
    expect(months[4].events[0].paymentStatus).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer le test → échoue** (`buildCalendarMonths` n'est pas exporté).

Run: `pnpm vitest run src/hooks/use-calendar.test.ts`
Expected: FAIL (import).

- [ ] **Step 3: Refactor `use-calendar.ts`** — extraire la logique pure `buildCalendarMonths` et ajouter `paymentStatus`.

Dans `CalendarEvent` (interface), ajouter après `status: string` :
```ts
  paymentStatus: string | null
```

Extraire le corps de `useCalendarYear` en une fonction pure exportée, et faire consommer celle-ci par le hook :
```ts
export function buildCalendarMonths(participations: ParticipationWithEvent[], year: number): CalendarMonth[] {
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

    for (let m = start.getMonth(); m <= end.getMonth(); m++) {
      if (start.getFullYear() === year || end.getFullYear() === year) {
        months[m]?.events.push({
          id: p.events.id,
          name: p.events.name,
          startDate: start,
          endDate: end,
          primaryTag: p.events.tags?.[0] ?? 'autre',
          status: p.status,
          paymentStatus: (p.payment_status as string | null) ?? null,
          visibility: p.visibility,
          city: p.events.city,
          department: p.events.department,
          imageUrl: p.events.image_url,
        })
      }
    }
  }

  for (const m of months) {
    m.events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }

  return months
}

export function useCalendarYear(participations: ParticipationWithEvent[], year: number): CalendarMonth[] {
  return useMemo(() => buildCalendarMonths(participations, year), [participations, year])
}
```

- [ ] **Step 4: Lancer le test → passe.**

Run: `pnpm vitest run src/hooks/use-calendar.test.ts`
Expected: PASS (2).

- [ ] **Step 5: Corriger le mapping des événements amis** dans `src/pages/Calendar.tsx` (l'objet `calEvent`, vers ligne 89-102) — ajouter le champ requis :
```ts
        status: '',
        paymentStatus: null,
```
(ajouter `paymentStatus: null` juste après la ligne `status: '',` pour satisfaire le type `CalendarEvent`.)

- [ ] **Step 6: Build + lint + tests.**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: vert.

- [ ] **Step 7: Commit.**
```bash
git add src/hooks/use-calendar.ts src/hooks/use-calendar.test.ts src/pages/Calendar.tsx
git commit -m "feat(calendar): carry payment_status into CalendarEvent (+ pure buildCalendarMonths + test)"
```

---

## Task 2: `CalendarMonth` — chip unifié + section compagnons

**Files:**
- Modify: `src/components/calendar/CalendarMonth.tsx`
- Modify: `src/pages/Calendar.tsx` (passe `actorKind`)

- [ ] **Step 1: Passer le `actorKind` de l'utilisateur à `CalendarMonth` depuis `Calendar.tsx`.**

Dans `Calendar.tsx`, là où `<CalendarMonth ... />` est rendu (vers ligne 254), ajouter la prop `actorKind`. Calculer en amont (près du `useAuth`/profile) :
```tsx
  const { profile } = useAuth()
  const actorKind: 'entity' | 'person' = profile?.type === 'exposant' ? 'entity' : 'person'
```
> `useAuth()` est déjà appelé dans `Calendar.tsx` ; récupérer `profile`. Si `profile` n'est pas déjà destructuré, le faire.

Et sur le composant :
```tsx
                <CalendarMonth data={month} actorKind={actorKind} friendParticipations={friendActivity} onOpenFriends={(id, name) => setModalEvent({ id, name })} />
```

- [ ] **Step 2: Réécrire `CalendarMonth.tsx`** — remplacer `STATUS_CONFIG` par `participationChip`, séparer événements perso / amis.

Remplacer le contenu de `src/components/calendar/CalendarMonth.tsx` par :

```tsx
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { MonthBanner } from './MonthBanner'
import { useTags } from '@/hooks/use-tags'
import { getTagIcon } from '@/components/ui/TagBadge'
import { participationChip, type ActorKind } from '@/lib/explorer'
import type { CalendarMonth as CalendarMonthType, CalendarEvent } from '@/hooks/use-calendar'
import type { FriendParticipation } from '@/hooks/use-participations'

function useTagColor() {
  const { tags } = useTags()
  return (slug: string) => {
    const t = tags.find(t => t.value === slug)
    return t ? { bg: t.bg, color: t.color } : { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
  }
}

const AVATAR_GRADIENTS = [
  ['#f0a060', '#e74c3c'], ['#6c5ce7', '#a29bfe'], ['#00b894', '#00cec9'],
  ['#fd79a8', '#e84393'], ['#f39c12', '#d68910'],
]
function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

interface CalendarMonthProps {
  data: CalendarMonthType
  actorKind: ActorKind
  friendParticipations?: FriendParticipation[]
  onOpenFriends?: (eventId: string, eventName: string) => void
}

export function CalendarMonth({ data, actorKind, friendParticipations = [], onOpenFriends }: CalendarMonthProps) {
  const { month, label, events } = data
  const { profile } = useAuth()
  const getTagColor = useTagColor()
  const now = new Date()
  const displayName = profile?.brand_name ?? profile?.display_name ?? 'Moi'

  const mine = events.filter(e => !e.isFriend)
  const friendsOnly = events.filter(e => e.isFriend)
  const isEmpty = events.length === 0

  const dayCount = (ev: CalendarEvent) =>
    Math.max(1, Math.round((ev.endDate.getTime() - ev.startDate.getTime()) / 86400000) + 1)

  return (
    <div>
      <MonthBanner month={month} label={label} year={data.year} />

      {isEmpty && <div className="calendar-month-empty-note">Ce mois est libre</div>}

      {/* Mes événements */}
      {mine.map(ev => {
        const tc = getTagColor(ev.primaryTag)
        const I = getTagIcon(ev.primaryTag)
        const isPast = ev.endDate < now
        const chip = participationChip(ev.status, ev.paymentStatus, actorKind, { isPast })
        const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
        const days = dayCount(ev)
        return (
          <div key={ev.id} className="calendar-event-wrapper">
            <Link to={`/evenement/${ev.id}`} state={{ from: '/calendrier' }} className="calendar-event-row">
              {ev.imageUrl && (
                <div className="calendar-event-image"><img src={ev.imageUrl} alt="" /></div>
              )}
              <div className="calendar-event-info">
                <div className="calendar-event-name">{ev.name}</div>
                <span className="calendar-event-tag" style={{ background: tc.bg, color: tc.color }}>
                  <I size={10} strokeWidth={2} />{ev.primaryTag}
                </span>
                <div className="calendar-event-meta">
                  <MapPin /><span>{ev.city} ({ev.department})</span><span>—</span>
                  <span>{days} jour{days > 1 ? 's' : ''}</span>
                </div>
              </div>
              {chip && <span className={'calendar-evst ' + chip.variant}>{chip.label}</span>}
              <div className="calendar-event-date">
                <b>{ev.startDate.getDate()}</b>
                <span>{ev.startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
              </div>
            </Link>

            {friendsAtEvent.length > 0 && (
              <button className="calendar-companions" onClick={e => { e.preventDefault(); onOpenFriends?.(ev.id, ev.name) }}>
                <div className="calendar-pav">
                  {friendsAtEvent.slice(0, 4).map((fp, i) => {
                    const nm = fp.actor_public?.label ?? '?'
                    const url = fp.actor_public?.avatar_url
                    const [from, to] = AVATAR_GRADIENTS[hashName(nm) % AVATAR_GRADIENTS.length]
                    return (
                      <span key={fp.actor_id} className="calendar-pav-item"
                        style={{ background: url ? 'transparent' : `linear-gradient(135deg, ${from}, ${to})`, zIndex: 4 - i }}>
                        {url ? <img src={url} alt={nm} /> : nm[0].toUpperCase()}
                      </span>
                    )
                  })}
                </div>
                <span>{friendsAtEvent.length} compagnon{friendsAtEvent.length > 1 ? 's' : ''} sur cette date</span>
              </button>
            )}
          </div>
        )
      })}

      {/* Tes compagnons ce mois-ci (événements d'amis où tu ne vas pas) */}
      {friendsOnly.length > 0 && (
        <>
          <div className="calendar-friend-lbl">Tes compagnons ce mois-ci</div>
          {friendsOnly.map(ev => {
            const url = ev.imageUrl
            const fname = ev.friendName ?? 'Un ami'
            const [from, to] = AVATAR_GRADIENTS[hashName(fname) % AVATAR_GRADIENTS.length]
            return (
              <Link key={ev.id} to={`/evenement/${ev.id}`} state={{ from: '/calendrier' }} className="calendar-evF">
                {url && <img src={url} alt="" />}
                <div className="calendar-evF-info">
                  <div className="calendar-evF-name">{ev.name}</div>
                  <div className="calendar-evF-meta">{fname} y va · {ev.startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</div>
                </div>
                <span className="calendar-evF-av" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>{fname[0].toUpperCase()}</span>
              </Link>
            )
          })}
        </>
      )}

      {/* Ma présence sur mes événements (badge nom) — conservée sous chaque event ? Non : le chip suffit. */}
      <span className="sr-only">{displayName}</span>
    </div>
  )
}
```

> Note : on a retiré le badge « présence moi » redondant (le chip de statut le remplace). Le `displayName` reste référencé en `sr-only` pour ne pas casser l'import `profile`; si lint râle sur `displayName` inutile, le supprimer proprement ainsi que la ligne `sr-only`.

- [ ] **Step 3: Build + lint.**

Run: `pnpm build && pnpm lint`
Expected: vert. (Le CSS des classes `calendar-evst`, `calendar-companions`, `calendar-friend-lbl`, `calendar-evF*`, `calendar-month-empty-note` arrive en Task 3 — le rendu sera brut jusque-là, c'est attendu.)

- [ ] **Step 4: Commit.**
```bash
git add src/components/calendar/CalendarMonth.tsx src/pages/Calendar.tsx
git commit -m "feat(calendar): month card uses unified participationChip + 'Tes compagnons ce mois-ci' section"
```

---

## Task 3: Réécriture `Calendar.css` (look maquette + tokens DA)

> **C'est la grosse pièce.** Référence visuelle : `docs/decisions/assets/calendar-exposant.html` (ouvrir en parallèle). Le fichier actuel est cassé sous les tokens DA. On réécrit **section par section**.

**Files:**
- Modify: `src/pages/Calendar.css`

**Règles non négociables (checklist DA) :**
- Tokens shadcn = **triplets HSL** → toujours `hsl(var(--foreground))`, `hsl(var(--card))`, `hsl(var(--muted))`, `hsl(var(--muted-foreground))`, `hsl(var(--border))`, `hsl(var(--primary))`. **Jamais** `var(--foreground)` brut.
- Tokens de statut/marque = **couleurs brutes** → `var(--status-repere)`, `var(--copper)`, etc. **sans** `hsl()`.
- **Supprimer TOUS** les `rgba(61, 48, 40, …)` (brun jour en dur) → remplacer par le token sémantique adéquat.
- Pas de `#fff`/`#000` en dur pour le texte ; surfaces de carte via `hsl(var(--card))`.
- Mode jour : ombres douces (`.light` override si besoin).

- [ ] **Step 1: Auditer l'existant.**

Run: `pnpm exec grep -n "rgba(61" src/pages/Calendar.css | wc -l` puis `pnpm exec grep -n "hsl(var(--" src/pages/Calendar.css | head`
Noter les sections : page, header, year-nav, filters, grid, month-card, month-banner, event-row, event-tag, event-date, presence, modal, skeleton, mobile (year-grid, month-view, event-pill).

- [ ] **Step 2: Réécrire les couleurs des sections existantes** en remplaçant chaque `rgba(61,48,40,a)` par :
  - texte principal → `hsl(var(--foreground))`
  - texte atténué/meta → `hsl(var(--muted-foreground))`
  - bordures/séparateurs → `hsl(var(--border))`
  - surfaces de survol → `hsl(var(--muted))`
  et chaque `rgb(252, 250, 247)` (carte claire en dur) → `hsl(var(--card))`.

- [ ] **Step 3: Ajouter/ajuster les classes du nouveau markup (Task 2)** au look maquette (valeurs maquette `calendar-exposant.html`) :

```css
/* Carte-mois */
.calendar-month-card { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 18px; padding: 15px; }
.calendar-month-card.empty { opacity: 0.5; }
.calendar-month-empty-note { display: flex; align-items: center; justify-content: center; text-align: center; color: hsl(var(--muted-foreground)); font-size: 12.5px; padding: 18px 10px; }

/* Ligne événement */
.calendar-event-wrapper { margin-bottom: 12px; }
.calendar-event-row { display: flex; gap: 11px; align-items: center; text-decoration: none; color: hsl(var(--foreground)); background: hsl(var(--secondary)); border-radius: 12px; padding: 10px 12px; }
.calendar-event-image { width: 54px; height: 74px; flex-shrink: 0; border-radius: 9px; overflow: hidden; border: 1px solid hsl(var(--border)); }
.calendar-event-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.calendar-event-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.calendar-event-name { font-family: var(--font-heading); font-weight: 700; font-size: 13.5px; line-height: 1.2; color: hsl(var(--foreground)); }
.calendar-event-tag { align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 99px; }
.calendar-event-meta { display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: hsl(var(--muted-foreground)); }
.calendar-event-meta svg { width: 11px; height: 11px; }
.calendar-event-date { padding-left: 4px; text-align: center; display: flex; flex-direction: column; justify-content: center; gap: 4px; flex-shrink: 0; width: 46px; }
.calendar-event-date b { font-family: var(--font-heading); font-size: 20px; line-height: 1; color: hsl(var(--foreground)); }
.calendar-event-date span { font-size: 9.5px; opacity: 0.8; text-transform: uppercase; color: hsl(var(--muted-foreground)); }

/* Pastille de statut (vocabulaire unifié) — verticale icône+label */
.calendar-evst { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; align-self: center; font-size: 10px; font-weight: 700; padding: 5px 10px; border-radius: 99px; white-space: nowrap; }
.calendar-evst.repere  { background: color-mix(in srgb, var(--status-repere)  18%, transparent); color: var(--status-repere); }
.calendar-evst.dossier { background: color-mix(in srgb, var(--status-dossier) 18%, transparent); color: var(--status-dossier); }
.calendar-evst.accepte { background: color-mix(in srgb, var(--status-accepte) 18%, transparent); color: var(--status-accepte); }
.calendar-evst.apayer  { background: color-mix(in srgb, var(--status-apayer)  18%, transparent); color: var(--status-apayer); }
.calendar-evst.inscrit { background: color-mix(in srgb, var(--status-inscrit) 18%, transparent); color: var(--status-inscrit); }
.calendar-evst.refuse  { background: color-mix(in srgb, var(--status-refuse)  16%, transparent); color: var(--status-refuse); }
.calendar-evst.termine { background: rgba(255,240,225,.08); color: hsl(var(--muted-foreground)); }
.calendar-evst.going   { background: color-mix(in srgb, var(--status-inscrit) 18%, transparent); color: var(--status-inscrit); }

/* Compagnons sur une de mes dates */
.calendar-companions { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: hsl(var(--muted-foreground)); padding: 9px 2px 0; background: none; border: none; cursor: pointer; }
.calendar-pav { display: flex; }
.calendar-pav-item { width: 24px; height: 24px; border-radius: 50%; border: 2px solid hsl(var(--card)); margin-left: -7px; font-size: 9px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #1c1310; overflow: hidden; }
.calendar-pav-item:first-child { margin-left: 0; }
.calendar-pav-item img { width: 100%; height: 100%; object-fit: cover; }

/* Section « Tes compagnons ce mois-ci » */
.calendar-friend-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: hsl(var(--muted-foreground)); opacity: 0.7; margin-top: 14px; padding-top: 13px; border-top: 1px solid hsl(var(--border)); }
.calendar-evF { display: flex; gap: 9px; align-items: center; padding: 8px 2px; opacity: 0.72; text-decoration: none; }
.calendar-evF img { width: 32px; height: 42px; border-radius: 6px; object-fit: cover; flex-shrink: 0; border: 1px solid hsl(var(--border)); }
.calendar-evF-info { flex: 1; min-width: 0; }
.calendar-evF-name { font-family: var(--font-heading); font-size: 12px; font-weight: 600; line-height: 1.2; color: hsl(var(--foreground)); }
.calendar-evF-meta { font-size: 11px; color: hsl(var(--muted-foreground)); }
.calendar-evF-av { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: #1c1310; flex-shrink: 0; }
```

- [ ] **Step 4: Filtres au style maquette** (chips arrondis) — remplacer les règles `.calendar-filter-btn` :
```css
.calendar-filter-btn { display: flex; align-items: center; gap: 7px; padding: 8px 15px; border-radius: 99px; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); color: hsl(var(--muted-foreground)); font-family: var(--font-body); font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s, color 0.15s; }
.calendar-filter-btn:hover { color: hsl(var(--foreground)); }
.calendar-filter-btn.active { background: color-mix(in srgb, var(--copper) 18%, transparent); color: var(--amber); border-color: transparent; }
.calendar-filter-btn svg { width: 14px; height: 14px; }
```

- [ ] **Step 5: Bannière du mois** (`.calendar-month-banner*`) — fond `hsl(var(--secondary))`, label `hsl(var(--foreground))`, année `hsl(var(--muted-foreground))`. Garder la structure existante, juste les couleurs.

- [ ] **Step 6: Vues mobiles** — dans le même fichier, remplacer tous les `rgba(61,48,40,…)` des sections `.mobile-year-*` / `.mobile-month-*` / `.mobile-event-pill*` par les tokens (`hsl(var(--card))`, `hsl(var(--muted-foreground))`, `hsl(var(--border))`).

- [ ] **Step 7: Skeleton + modal** — `.calendar-skeleton-*` et `.calendar-modal-*` : remplacer les `rgba(61,48,40,…)` par tokens.

- [ ] **Step 8: Vérifier qu'il ne reste aucun brun jour en dur.**

Run: `pnpm exec grep -n "rgba(61, 48, 40\|rgb(252, 250, 247" src/pages/Calendar.css`
Expected: **aucun** résultat.

- [ ] **Step 9: Build + lint.**

Run: `pnpm build && pnpm lint`
Expected: vert.

- [ ] **Step 10: Commit.**
```bash
git add src/pages/Calendar.css
git commit -m "feat(calendar): rewrite Calendar.css on DA tokens + maquette look (night/day)"
```

---

## Task 4: `MonthBanner` token-aware + vues mobiles (statut)

**Files:**
- Modify: `src/components/calendar/MonthBanner.tsx`
- Modify: `src/components/calendar/MobileMonthView.tsx`
- Modify: `src/components/calendar/MobileYearGrid.tsx`

- [ ] **Step 1: `MonthBanner` — couleur token-aware.**

`MonthBanner` reçoit une `color`. Localiser où la couleur est définie (prop par défaut ou valeur figée) :
Run: `pnpm exec grep -n "color" src/components/calendar/MonthBanner.tsx | head`
Faire en sorte que la couleur du SVG saisonnier utilise une teinte douce token-aware. Si le composant a une valeur par défaut en dur, la remplacer par `'hsl(var(--muted-foreground))'` (ou recevoir la couleur depuis `CalendarMonth`). Vérifier que les `<svg>` ont bien `fill="none"` au niveau racine et que les `fill={c}`/`stroke={c}` utilisent la prop.

- [ ] **Step 2: `MobileMonthView` — statut via `participationChip`.**

Remplacer le `STATUS_CONFIG` maison (lignes 16-20) et son usage par `participationChip`. Ajouter l'import `import { participationChip, type ActorKind } from '@/lib/explorer'`, recevoir `actorKind` en prop (le passer depuis `Calendar.tsx` au `<MobileMonthView>`), et calculer `const chip = participationChip(ev.status, ev.paymentStatus, actorKind, { isPast: ev.endDate < new Date() })`. Rendre la pastille avec `className={'mobile-event-pill-status ' + chip.variant}` (réutiliser les couleurs `--status-*` côté CSS — ajouter au besoin un petit jeu `.mobile-event-pill-status.<variant>` dans `Calendar.css`). Remplacer aussi le fallback `rgba(61,48,40,…)` de `useTagStyle` par `{ bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }`.

> Passer `actorKind` à `<MobileMonthView>` dans `Calendar.tsx` (même valeur que pour `CalendarMonth`).

- [ ] **Step 3: `MobileYearGrid` — fallback couleur.**

Remplacer `return key ? TAG_COLORS[key] : 'rgba(61,48,40,0.3)'` par `return key ? TAG_COLORS[key] : 'hsl(var(--muted-foreground))'`.

- [ ] **Step 4: Build + lint + tests.**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: vert.

- [ ] **Step 5: Commit.**
```bash
git add src/components/calendar/MonthBanner.tsx src/components/calendar/MobileMonthView.tsx src/components/calendar/MobileYearGrid.tsx src/pages/Calendar.css src/pages/Calendar.tsx
git commit -m "feat(calendar): token-aware MonthBanner + mobile views use unified chip/tokens"
```

---

## Task 5: Vérification visuelle + bump version

**Files:**
- Modify: `package.json` (version), `src/changelog.ts`

- [ ] **Step 1: Vérification visuelle (nuit + jour).**

Run: `pnpm dev`, ouvrir `/calendrier` (compte exposant Pro). Comparer à `docs/decisions/assets/calendar-exposant.html`. Vérifier : cartes-mois DA, pastilles statut correctes (À payer ambre, Inscrit vert, Repéré vert…), section « Tes compagnons ce mois-ci » atténuée, filtres chips, mois vide « Ce mois est libre », nav année, **vues mobiles** lisibles. Basculer le thème : lisible nuit ET jour.

- [ ] **Step 2: Grep de cohérence.**

Run: `pnpm exec grep -rn "rgba(61, 48, 40\|hsl(var(--foreground)))\b" src/pages/Calendar.css ; pnpm exec grep -rn "STATUS_CONFIG" src/components/calendar/`
Expected : plus de brun jour ; plus de `STATUS_CONFIG` maison dans les composants calendrier.

- [ ] **Step 3: Bump version + changelog.**

`package.json` : patch +1 (0.7.36 → 0.7.37). Ajouter une entrée `changelog.ts` (« Calendrier — nouvelle direction artistique »).

- [ ] **Step 4: Vérification finale.**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: tout vert.

- [ ] **Step 5: Commit + push.**
```bash
git add -A
git commit -m "chore(calendar): bump version after DA integration"
git push
```

---

## Self-Review

**Couverture spec :**
- Fenêtre glissante / filtres / modal / mobile inchangés (logique) → on ne touche qu'au style + statut. ✓
- 3 filtres style maquette → Task 3 Step 4. ✓
- Section « Tes compagnons ce mois-ci » → Task 2. ✓
- Pas de CTA en-tête → on n'en ajoute pas. ✓
- `Calendar.css` réécrit sur tokens DA → Task 3 (+ mobile Step 6). ✓
- Pastilles via `participationChip` (+ `payment_status`) → Tasks 1, 2, 4. ✓
- `MonthBanner` token-aware → Task 4. ✓

**Placeholders :** le markup TSX est fourni en entier (Tasks 1-2-4) ; la réécriture CSS (Task 3) est donnée section par section avec les classes du nouveau markup en code complet et des **règles de substitution déterministes** pour les sections existantes (rgba→token) — la maquette sert de référence visuelle pour les valeurs fines.

**Cohérence types/noms :** `CalendarEvent.paymentStatus` (Task 1) ⇄ lu par `participationChip` (Task 2/4). `actorKind` passé de `Calendar.tsx` à `CalendarMonth` ET `MobileMonthView`. Classes CSS `calendar-evst.<variant>` / `mobile-event-pill-status.<variant>` = valeurs de `StatusVariant`. `buildCalendarMonths` (pur, Task 1) consommé par `useCalendarYear`.

**Risques :** Task 3 est volumineuse et visuelle (pas de test auto) → vérif visuelle nuit/jour en Task 5 obligatoire ; bien traquer chaque `rgba(61,48,40)` (grep Step 8). `MonthBanner` : vérifier `fill:none` racine SVG. Le badge « présence moi » est retiré au profit du chip (Task 2) — si tu le veux conserver, l'ajouter en CSS.
