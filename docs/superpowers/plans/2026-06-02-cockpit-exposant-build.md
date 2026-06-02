# Cockpit Exposant — Build V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire la page Cockpit (`/tableau-de-bord`), home Pro de l'exposant, qui agrège prochain festival, prochains festivals, à régler & finaliser, compagnons de route, saison, et le prompt bilan — uniquement sur de la donnée déjà présente sur `main`.

**Architecture:** Une page conteneur `Cockpit.tsx` monte 6 composants de module isolés sous `components/cockpit/`. Toute la logique de sélection/agrégation vit dans des **fonctions pures** (`lib/cockpit.ts`) testées en TDD ; les composants ne font que présenter. Les données viennent de hooks existants réutilisés (`useMyParticipations`, `useCommunityFeed`) + un petit hook `useMyReportedEventIds`. Aucune nouvelle table, aucune migration.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest (tests), Supabase JS, react-router-dom v7, CSS modules-like (fichier `.css` par page, tokens DA « Nuit de Festival »).

**Spec de référence :** `docs/superpowers/specs/2026-06-02-cockpit-exposant-build-design.md`
**Maquette (source CSS/DA) :** `docs/decisions/assets/dashboard-exposant.html`

**Contrainte test connue (mémoire `reference_react_test_infra`) :** RTL `render()` ne flush pas en synchrone sur ce stack. On teste donc la **logique pure** (`lib/cockpit.ts`), pas le rendu des composants. Les composants sont vérifiés par `pnpm build` + `pnpm lint`.

---

## File Structure

**Créés :**
- `src/lib/cockpit.ts` — fonctions pures : sélection prochain festival, prochains festivals, à régler, agrégat saison, détection prompt bilan. Une responsabilité : dériver l'état du Cockpit depuis les participations.
- `src/lib/cockpit.test.ts` — tests Vitest des fonctions pures.
- `src/components/cockpit/ProchainFestival.tsx` — module hero.
- `src/components/cockpit/ProchainsFestivals.tsx` — liste à venir.
- `src/components/cockpit/AReglerFinaliser.tsx` — paiements + candidatures à boucler.
- `src/components/cockpit/CompagnonsDeRoute.tsx` — convergences (réutilise `useCommunityFeed`).
- `src/components/cockpit/SaisonFrise.tsx` — frise 12 mois.
- `src/components/cockpit/BilanBanner.tsx` — bandeau prompt bilan (réutilise `BilanModal`).
- `src/pages/Cockpit.tsx` — page conteneur (topbar + layout 3 colonnes).
- `src/pages/Cockpit.css` — styles, portés de la maquette.

**Modifiés :**
- `src/hooks/use-reports.ts` — ajout `useMyReportedEventIds()`.
- `src/lib/navModel.ts` — `dashboard.built = true` + helper `defaultRouteForActor`.
- `src/App.tsx` — route `/tableau-de-bord` → `<CockpitPage/>` (remplace `ComingSoon`).
- `src/pages/AuthCallback.tsx` — redirection post-login via `defaultRouteForActor`.
- `src/pages/Login.tsx` — redirection déjà-connecté via `defaultRouteForActor`.
- `src/pages/Onboarding.tsx` — redirection fin onboarding via `defaultRouteForActor`.

---

## Task 1: Fonctions pures `lib/cockpit.ts` (TDD)

Le cœur logique. Tout est pur (entrées → sorties), testable sans React ni réseau.

**Modèle de statut (rappel, cf. `lib/explorer.ts` participationChip) :**
- `interesse` = Repéré (bookmark) — **exclu** du Cockpit (vit dans Explorer).
- `en_cours` = Dossier envoyé / candidature à boucler.
- `inscrit` = Accepté/confirmé (présence acquise). `payment_status` ∈ {`a_payer`, `acompte_verse`, `paye`}.
- `refuse` = refusé — **jamais affiché**.

**Définitions de périmètre :**
- **Confirmé** = `status === 'inscrit'` (présence acquise, peu importe le paiement).
- **À venir** = `events.end_date >= now`.

**Files:**
- Create: `src/lib/cockpit.ts`
- Test: `src/lib/cockpit.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/lib/cockpit.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  selectNextFestival,
  selectUpcomingFestivals,
  selectAReglerItems,
  aggregateSeason,
  detectBilanPrompt,
} from './cockpit'
import type { ParticipationWithEvent } from '@/types/database'

const NOW = new Date('2026-05-15T12:00:00Z')

function part(
  id: string,
  start: string,
  end: string,
  status = 'inscrit',
  payment: string | null = 'paye',
): ParticipationWithEvent {
  return {
    id,
    event_id: 'e' + id,
    status,
    payment_status: payment,
    visibility: 'amis',
    events: {
      id: 'e' + id, name: 'Festival ' + id, start_date: start, end_date: end,
      city: 'Lyon', department: '69', image_url: null, tags: ['medieval'],
    },
  } as unknown as ParticipationWithEvent
}

describe('selectNextFestival', () => {
  it('retourne la prochaine participation confirmée (inscrit), la plus proche', () => {
    const parts = [
      part('1', '2026-07-10', '2026-07-12'),
      part('2', '2026-06-01', '2026-06-02'),
    ]
    expect(selectNextFestival(parts, NOW)?.id).toBe('2')
  })

  it('ignore les candidatures (en_cours) et les repérés (interesse)', () => {
    const parts = [
      part('1', '2026-06-01', '2026-06-02', 'en_cours', 'a_payer'),
      part('2', '2026-06-10', '2026-06-11', 'interesse', null),
      part('3', '2026-08-01', '2026-08-02', 'inscrit', 'paye'),
    ]
    expect(selectNextFestival(parts, NOW)?.id).toBe('3')
  })

  it('ignore les festivals terminés et retourne null si aucun confirmé à venir', () => {
    const parts = [part('1', '2026-01-01', '2026-01-02')]
    expect(selectNextFestival(parts, NOW)).toBeNull()
  })
})

describe('selectUpcomingFestivals', () => {
  it('garde inscrit + en_cours à venir, exclut interesse/refuse/passé, tri croissant', () => {
    const parts = [
      part('1', '2026-08-01', '2026-08-02', 'inscrit', 'paye'),
      part('2', '2026-06-01', '2026-06-02', 'en_cours', 'a_payer'),
      part('3', '2026-07-01', '2026-07-02', 'interesse', null),
      part('4', '2026-07-15', '2026-07-16', 'refuse', null),
      part('5', '2026-01-01', '2026-01-02', 'inscrit', 'paye'),
    ]
    expect(selectUpcomingFestivals(parts, NOW).map(p => p.id)).toEqual(['2', '1'])
  })
})

describe('selectAReglerItems', () => {
  it('garde inscrit non payé (a_payer/acompte_verse) + en_cours, exclut inscrit payé', () => {
    const parts = [
      part('1', '2026-06-01', '2026-06-02', 'inscrit', 'a_payer'),
      part('2', '2026-06-05', '2026-06-06', 'inscrit', 'acompte_verse'),
      part('3', '2026-06-10', '2026-06-11', 'inscrit', 'paye'),
      part('4', '2026-06-15', '2026-06-16', 'en_cours', null),
    ]
    expect(selectAReglerItems(parts, NOW).map(p => p.id)).toEqual(['1', '2', '4'])
  })
})

describe('aggregateSeason', () => {
  it('compte les confirmés (inscrit) par mois de l\'année, 12 entrées, filled si > 0', () => {
    const parts = [
      part('1', '2026-03-10', '2026-03-11'),
      part('2', '2026-03-20', '2026-03-21'),
      part('3', '2026-07-01', '2026-07-02'),
      part('4', '2026-04-01', '2026-04-02', 'en_cours', 'a_payer'), // non confirmé → ignoré
      part('5', '2025-03-01', '2025-03-02'), // autre année → ignoré
    ]
    const season = aggregateSeason(parts, 2026)
    expect(season).toHaveLength(12)
    expect(season[2]).toEqual({ month: 2, count: 2, filled: true })  // mars
    expect(season[6]).toEqual({ month: 6, count: 1, filled: true })  // juillet
    expect(season[3]).toEqual({ month: 3, count: 0, filled: false }) // avril (en_cours ignoré)
  })
})

describe('detectBilanPrompt', () => {
  it('retourne le festival terminé confirmé non bilané le plus récent + le reste en extraCount', () => {
    const parts = [
      part('1', '2026-04-01', '2026-04-02'),  // terminé, non bilané
      part('2', '2026-05-01', '2026-05-02'),  // terminé, plus récent, non bilané
      part('3', '2026-03-01', '2026-03-02'),  // terminé, déjà bilané
      part('4', '2026-07-01', '2026-07-02'),  // à venir → ignoré
    ]
    const reported = new Set(['e3'])
    const res = detectBilanPrompt(parts, reported, NOW)
    expect(res.pending?.id).toBe('2')
    expect(res.extraCount).toBe(1) // le festival '1' restant
  })

  it('retourne pending null quand tout est bilané ou rien de terminé', () => {
    const parts = [part('1', '2026-07-01', '2026-07-02')]
    expect(detectBilanPrompt(parts, new Set(), NOW).pending).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `pnpm vitest run src/lib/cockpit.test.ts`
Expected: FAIL — `cockpit.ts` n'existe pas / fonctions non définies.

- [ ] **Step 3: Implémenter `lib/cockpit.ts`**

Create `src/lib/cockpit.ts`:

```ts
import type { ParticipationWithEvent } from '@/types/database'

// Périmètre du Cockpit (cf. lib/explorer.ts participationChip pour le modèle de statut).
const CONFIRMED = 'inscrit'          // présence acquise
const CANDIDATE = 'en_cours'         // candidature à boucler
const DUE_PAYMENTS = new Set(['a_payer', 'acompte_verse'])

function isUpcoming(p: ParticipationWithEvent, now: Date): boolean {
  return !!p.events && new Date(p.events.end_date).getTime() >= now.getTime()
}

function byStartAsc(a: ParticipationWithEvent, b: ParticipationWithEvent): number {
  return new Date(a.events.start_date).getTime() - new Date(b.events.start_date).getTime()
}

/** Hero : prochaine participation CONFIRMÉE uniquement (inscrit), à venir, la plus proche. */
export function selectNextFestival(
  parts: ParticipationWithEvent[],
  now: Date,
): ParticipationWithEvent | null {
  const confirmed = parts.filter(p => p.status === CONFIRMED && isUpcoming(p, now))
  if (confirmed.length === 0) return null
  return [...confirmed].sort(byStartAsc)[0]
}

/** « Tes prochains festivals » : inscrit + en_cours à venir, tri croissant. (Repéré exclu.) */
export function selectUpcomingFestivals(
  parts: ParticipationWithEvent[],
  now: Date,
): ParticipationWithEvent[] {
  return parts
    .filter(p => (p.status === CONFIRMED || p.status === CANDIDATE) && isUpcoming(p, now))
    .sort(byStartAsc)
}

/** « À régler & finaliser » : inscrit non payé (a_payer/acompte_verse) + en_cours, à venir. */
export function selectAReglerItems(
  parts: ParticipationWithEvent[],
  now: Date,
): ParticipationWithEvent[] {
  return parts
    .filter(p => {
      if (!isUpcoming(p, now)) return false
      if (p.status === CANDIDATE) return true
      if (p.status === CONFIRMED) return DUE_PAYMENTS.has(p.payment_status ?? '')
      return false
    })
    .sort(byStartAsc)
}

export interface SeasonMonth {
  month: number   // 0-11
  count: number
  filled: boolean
}

/** Frise 12 mois : nb de participations CONFIRMÉES par mois (date de début) sur `year`. */
export function aggregateSeason(parts: ParticipationWithEvent[], year: number): SeasonMonth[] {
  const counts = new Array(12).fill(0)
  for (const p of parts) {
    if (!p.events || p.status !== CONFIRMED) continue
    const start = new Date(p.events.start_date)
    if (start.getFullYear() !== year) continue
    counts[start.getMonth()]++
  }
  return counts.map((count, month) => ({ month, count, filled: count > 0 }))
}

export interface BilanPrompt {
  pending: ParticipationWithEvent | null
  extraCount: number
}

/**
 * Festivals terminés (end_date < now), confirmés (inscrit), SANS event_report :
 * retourne le plus récent à proposer + le nombre des autres en attente.
 */
export function detectBilanPrompt(
  parts: ParticipationWithEvent[],
  reportedEventIds: Set<string>,
  now: Date,
): BilanPrompt {
  const pendingList = parts
    .filter(p =>
      p.events &&
      p.status === CONFIRMED &&
      new Date(p.events.end_date).getTime() < now.getTime() &&
      !reportedEventIds.has(p.event_id),
    )
    .sort((a, b) => new Date(b.events.end_date).getTime() - new Date(a.events.end_date).getTime())
  return { pending: pendingList[0] ?? null, extraCount: Math.max(0, pendingList.length - 1) }
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `pnpm vitest run src/lib/cockpit.test.ts`
Expected: PASS (toutes les assertions vertes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cockpit.ts src/lib/cockpit.test.ts
git commit -m "feat(cockpit): fonctions pures de dérivation (next festival, à régler, saison, bilan)"
```

---

## Task 2: Hook `useMyReportedEventIds`

Le `BilanBanner` doit savoir quels festivals ont déjà un bilan. On ajoute un hook qui charge l'ensemble des `event_id` bilanés par l'acteur actif.

**Files:**
- Modify: `src/hooks/use-reports.ts`

- [ ] **Step 1: Ajouter le hook**

Dans `src/hooks/use-reports.ts`, ajouter en bas du fichier (après `saveEventReport`) :

```ts
import { useState as useState2, useEffect as useEffect2 } from 'react' // si non déjà importés en haut, utiliser les imports existants
```

(Ne PAS dupliquer les imports — `useState`, `useEffect`, `useCallback`, `supabase`, `useAuth` sont déjà importés en tête de fichier. Ajoute simplement la fonction ci-dessous en réutilisant ces imports.)

```ts
/** Ensemble des event_id pour lesquels l'acteur actif a déjà rempli un bilan. */
export function useMyReportedEventIds(): { reportedEventIds: Set<string>; loading: boolean } {
  const { currentActor } = useAuth()
  const [reportedEventIds, setReportedEventIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentActor) { setLoading(false); return }
    let cancelled = false
    async function run() {
      const { data } = await supabase
        .from('event_reports')
        .select('event_id')
        .eq('actor_id', currentActor!.id)
      if (cancelled) return
      const rows = (data ?? []) as Array<{ event_id: string }>
      setReportedEventIds(new Set(rows.map(r => r.event_id)))
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [currentActor])

  return { reportedEventIds, loading }
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `pnpm build`
Expected: PASS (pas d'erreur TypeScript).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-reports.ts
git commit -m "feat(cockpit): hook useMyReportedEventIds (event_id déjà bilanés)"
```

---

## Task 3: `navModel` — `built: true` + `defaultRouteForActor`

**Files:**
- Modify: `src/lib/navModel.ts`

- [ ] **Step 1: Passer le Cockpit en construit**

Dans `src/lib/navModel.ts`, ligne `dashboard:` du `NAV_DEFS`, remplacer `built: false` par `built: true` :

```ts
  dashboard:       { key: 'dashboard',       to: '/tableau-de-bord', label: 'Cockpit',        shortLabel: 'Cockpit',   icon: 'LayoutDashboard', pro: true,  built: true },
```

- [ ] **Step 2: Ajouter le helper de route par défaut**

À la fin de `src/lib/navModel.ts`, ajouter :

```ts
/**
 * Route d'atterrissage après login / onboarding selon l'acteur actif.
 * Une entité Pro atterrit sur son Cockpit ; tout le reste (personne, entité gratuite)
 * sur Explorer (home universelle). Le plan est lu via planForActor (Pro = sur l'entité).
 */
export function defaultRouteForActor(actor: { kind: string } | null, entityRow: unknown): string {
  return planForActor(actor, entityRow) === 'pro' ? '/tableau-de-bord' : '/explorer'
}
```

- [ ] **Step 3: Vérifier compilation + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/navModel.ts
git commit -m "feat(cockpit): nav dashboard built=true + defaultRouteForActor (Pro -> Cockpit)"
```

---

## Task 4: Composant `SaisonFrise`

Module le plus simple, on commence par lui. Frise 12 mois ; vert si rempli, pointillé ambre si vide.

**Files:**
- Create: `src/components/cockpit/SaisonFrise.tsx`

- [ ] **Step 1: Écrire le composant**

Create `src/components/cockpit/SaisonFrise.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { CalendarRange } from 'lucide-react'
import type { SeasonMonth } from '@/lib/cockpit'

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

interface Props {
  season: SeasonMonth[]
  year: number
}

export function SaisonFrise({ season, year }: Props) {
  const emptyMonths = season.filter(m => !m.filled).map(m => MONTHS_SHORT[m.month])
  const total = season.reduce((s, m) => s + m.count, 0)

  return (
    <div className="ck-card ck-saison">
      <h3>
        <span className="ck-ic grn"><CalendarRange strokeWidth={1.8} /></span>
        Ta saison {year}
      </h3>

      <div className="ck-frise">
        {season.map(m => (
          <div key={m.month} className={'ck-month' + (m.filled ? ' filled' : ' empty')}>
            <span className="ck-month-bar" aria-hidden="true" />
            <span className="ck-month-lbl">{MONTHS_SHORT[m.month]}</span>
            {m.count > 0 && <span className="ck-month-count">{m.count}</span>}
          </div>
        ))}
      </div>

      {total === 0 ? (
        <p className="ck-saison-hint">Ta saison est à construire. <Link to="/explorer">Trouve des dates →</Link></p>
      ) : emptyMonths.length > 0 ? (
        <p className="ck-saison-hint">
          {emptyMonths.slice(0, 3).join(', ')}{emptyMonths.length > 3 ? '…' : ''} vide{emptyMonths.length > 1 ? 's' : ''} → <Link to="/explorer">trouve des dates</Link>
        </p>
      ) : (
        <p className="ck-saison-hint">Ta saison est bien remplie 🎉</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/cockpit/SaisonFrise.tsx
git commit -m "feat(cockpit): module SaisonFrise (frise 12 mois)"
```

---

## Task 5: Composant `ProchainFestival` (hero)

**Files:**
- Create: `src/components/cockpit/ProchainFestival.tsx`

- [ ] **Step 1: Écrire le composant**

Create `src/components/cockpit/ProchainFestival.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Compass, Route, Share2, FileText } from 'lucide-react'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participation: ParticipationWithEvent | null
}

function daysUntil(start: Date, now: Date): number {
  const ms = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
    - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round(ms / 86_400_000)
}

export function ProchainFestival({ participation }: Props) {
  const now = new Date()

  if (!participation) {
    return (
      <div className="ck-card ck-next-empty">
        <h3>Prochain festival</h3>
        <p className="ck-empty-txt">Aucun festival confirmé à venir.</p>
        <Link to="/explorer" className="ck-btn ck-btn-p"><Compass strokeWidth={2} /> Explorer les festivals</Link>
      </div>
    )
  }

  const ev = participation.events
  const start = new Date(ev.start_date)
  const dleft = daysUntil(start, now)
  const chip = participationChip(participation.status, participation.payment_status, 'entity')
  const dateLabel = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const mapsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${ev.name}, ${ev.city}`)}`

  return (
    <div className="ck-card ck-next">
      <div className="ck-next-poster">
        {ev.image_url ? <img src={ev.image_url} alt={ev.name} /> : <div className="ck-next-noposter" />}
        <span className="ck-jx">{dleft > 0 ? `J-${dleft}` : dleft === 0 ? "Aujourd'hui" : 'En cours'}</span>
      </div>
      <div className="ck-next-body">
        {chip && <span className={'ck-badge ' + chip.variant}>{chip.label}</span>}
        <h2>{ev.name}</h2>
        <p className="ck-next-meta">{dateLabel} · {ev.city} ({ev.department})</p>
        <div className="ck-next-actions">
          <Link to={`/evenement/${ev.id}`} className="ck-btn ck-btn-p"><FileText strokeWidth={2} /> Voir le dossier</Link>
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="ck-btn ck-btn-g"><Route strokeWidth={2} /> Itinéraire</a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${ev.name} — ${window.location.origin}/evenement/${ev.id}`)}`}
            target="_blank" rel="noopener noreferrer" className="ck-btn ck-btn-g"
          ><Share2 strokeWidth={2} /> Partager</a>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/cockpit/ProchainFestival.tsx
git commit -m "feat(cockpit): module ProchainFestival (hero, confirmé only)"
```

---

## Task 6: Composant `ProchainsFestivals`

**Files:**
- Create: `src/components/cockpit/ProchainsFestivals.tsx`

- [ ] **Step 1: Écrire le composant**

Create `src/components/cockpit/ProchainsFestivals.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { CalendarClock, Plus } from 'lucide-react'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
}

export function ProchainsFestivals({ participations }: Props) {
  return (
    <div className="ck-card">
      <h3>
        <span className="ck-ic cop"><CalendarClock strokeWidth={1.8} /></span>
        Tes prochains festivals
        <Link to="/calendrier" className="ck-seeall">Tout voir</Link>
      </h3>

      {participations.length === 0 ? (
        <p className="ck-empty-txt">Ajoute ta première date.</p>
      ) : (
        <ul className="ck-list">
          {participations.slice(0, 6).map(p => {
            const ev = p.events
            const d = new Date(ev.start_date)
            const chip = participationChip(p.status, p.payment_status, 'entity')
            return (
              <li key={p.id}>
                <Link to={`/evenement/${ev.id}`} className="ck-list-row">
                  {ev.image_url
                    ? <span className="ck-list-thumb"><img src={ev.image_url} alt="" /></span>
                    : <span className="ck-list-thumb ck-list-thumb-ph" />}
                  <span className="ck-list-info">
                    <b>{ev.name}</b>
                    <small>{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {ev.city}</small>
                  </span>
                  {chip && <span className={'ck-badge sm ' + chip.variant}>{chip.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Link to="/explorer" className="ck-addrow"><Plus strokeWidth={2.2} /> Ajouter une date</Link>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/cockpit/ProchainsFestivals.tsx
git commit -m "feat(cockpit): module ProchainsFestivals (liste à venir)"
```

---

## Task 7: Composant `AReglerFinaliser`

**Files:**
- Create: `src/components/cockpit/AReglerFinaliser.tsx`

- [ ] **Step 1: Écrire le composant**

Create `src/components/cockpit/AReglerFinaliser.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Wallet, CheckCircle2 } from 'lucide-react'
import { participationChip } from '@/lib/explorer'
import type { ParticipationWithEvent } from '@/types/database'

interface Props {
  participations: ParticipationWithEvent[]
}

export function AReglerFinaliser({ participations }: Props) {
  return (
    <div className="ck-card">
      <h3>
        <span className="ck-ic cop"><Wallet strokeWidth={1.8} /></span>
        À régler &amp; finaliser
      </h3>

      {participations.length === 0 ? (
        <p className="ck-empty-txt ck-allset"><CheckCircle2 strokeWidth={1.8} /> Tout est à jour</p>
      ) : (
        <ul className="ck-list">
          {participations.slice(0, 6).map(p => {
            const ev = p.events
            const chip = participationChip(p.status, p.payment_status, 'entity')
            return (
              <li key={p.id}>
                <Link to={`/evenement/${ev.id}`} className="ck-list-row">
                  <span className="ck-list-info">
                    <b>{ev.name}</b>
                    <small>{ev.city} · {new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</small>
                  </span>
                  {chip && <span className={'ck-badge sm ' + chip.variant}>{chip.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/cockpit/AReglerFinaliser.tsx
git commit -m "feat(cockpit): module AReglerFinaliser (paiements + candidatures)"
```

---

## Task 8: Composant `CompagnonsDeRoute`

Réutilise `useCommunityFeed` (déjà sur main) → `convergences`.

**Files:**
- Create: `src/components/cockpit/CompagnonsDeRoute.tsx`

- [ ] **Step 1: Écrire le composant**

Create `src/components/cockpit/CompagnonsDeRoute.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Users, Share2 } from 'lucide-react'
import { useCommunityFeed } from '@/hooks/use-community'
import { avatarColor } from '@/lib/community'

export function CompagnonsDeRoute() {
  const { convergences, loading } = useCommunityFeed()

  return (
    <div className="ck-card">
      <h3>
        <span className="ck-ic grn"><Users strokeWidth={1.8} /></span>
        Mes compagnons de route
      </h3>

      {loading ? (
        <p className="ck-empty-txt">Chargement…</p>
      ) : convergences.length === 0 ? (
        <p className="ck-empty-txt">
          Suis des compagnons pour voir où ils exposent. <Link to="/communaute">Suggestions →</Link>
        </p>
      ) : (
        <ul className="ck-conv-list">
          {convergences.slice(0, 3).map(c => {
            const shareHref = `https://wa.me/?text=${encodeURIComponent(`${c.event.name} — ${window.location.origin}/evenement/${c.event.id}`)}`
            return (
              <li key={c.event.id} className="ck-conv">
                <div className="ck-conv-avs">
                  {c.sample.slice(0, 4).map((a, i) => (
                    <span key={a.actorId} className="ck-av" style={{ background: a.avatarUrl ? 'transparent' : avatarColor(a.label), zIndex: 4 - i }}>
                      {a.avatarUrl ? <img src={a.avatarUrl} alt={a.label} /> : a.label[0]?.toUpperCase()}
                    </span>
                  ))}
                </div>
                <div className="ck-conv-txt">
                  <b>Vous serez {c.count} réunis</b>
                  <small>à {c.event.name}</small>
                </div>
                <div className="ck-conv-actions">
                  <Link to={`/evenement/${c.event.id}`} className="ck-btn ck-btn-g ck-btn-sm">Voir</Link>
                  <a href={shareHref} target="_blank" rel="noopener noreferrer" className="ck-btn ck-btn-g ck-btn-sm"><Share2 strokeWidth={2} /></a>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/cockpit/CompagnonsDeRoute.tsx
git commit -m "feat(cockpit): module CompagnonsDeRoute (convergences via useCommunityFeed)"
```

---

## Task 9: Composant `BilanBanner`

Réutilise `BilanModal` existant (`src/components/reports/BilanModal.tsx`, props `{ eventId, onClose, onSaved }`).

**Files:**
- Create: `src/components/cockpit/BilanBanner.tsx`

- [ ] **Step 1: Écrire le composant**

Create `src/components/cockpit/BilanBanner.tsx`:

```tsx
import { useState } from 'react'
import { PartyPopper, X } from 'lucide-react'
import { BilanModal } from '@/components/reports/BilanModal'
import type { BilanPrompt } from '@/lib/cockpit'

interface Props {
  prompt: BilanPrompt
  onSaved: () => void
}

export function BilanBanner({ prompt, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const p = prompt.pending
  if (!p || dismissed) return null

  return (
    <>
      <div className="ck-bilan-banner">
        <span className="ck-bilan-ic"><PartyPopper strokeWidth={1.8} /></span>
        <div className="ck-bilan-txt">
          <b>Comment s'est passé {p.events.name} ?</b>
          <small>
            Note tes revenus, tes coûts et tes impressions.
            {prompt.extraCount > 0 && ` +${prompt.extraCount} autre${prompt.extraCount > 1 ? 's' : ''} en attente.`}
          </small>
        </div>
        <button className="ck-btn ck-btn-p" onClick={() => setOpen(true)}>Remplir mon bilan</button>
        <button className="ck-bilan-x" aria-label="Plus tard" onClick={() => setDismissed(true)}><X strokeWidth={2.2} /></button>
      </div>
      {open && (
        <BilanModal
          eventId={p.event_id}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); onSaved() }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Vérifier l'API de `BilanModal`**

Run: `pnpm build`
Expected: PASS. Si erreur de props sur `BilanModal`, ouvrir `src/components/reports/BilanModal.tsx`, vérifier la signature exacte (`eventId`, `onClose`, `onSaved`) et ajuster l'appel — ne PAS modifier `BilanModal`.

- [ ] **Step 3: Commit**

```bash
git add src/components/cockpit/BilanBanner.tsx
git commit -m "feat(cockpit): module BilanBanner (prompt post-festival, réutilise BilanModal)"
```

---

## Task 10: Page `Cockpit` (assemblage)

**Files:**
- Create: `src/pages/Cockpit.tsx`
- Create: `src/pages/Cockpit.css`

- [ ] **Step 1: Écrire la page**

Create `src/pages/Cockpit.tsx`:

```tsx
import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { useMyParticipations } from '@/hooks/use-participations'
import { useMyReportedEventIds } from '@/hooks/use-reports'
import {
  selectNextFestival, selectUpcomingFestivals, selectAReglerItems,
  aggregateSeason, detectBilanPrompt,
} from '@/lib/cockpit'
import { BilanBanner } from '@/components/cockpit/BilanBanner'
import { ProchainFestival } from '@/components/cockpit/ProchainFestival'
import { ProchainsFestivals } from '@/components/cockpit/ProchainsFestivals'
import { AReglerFinaliser } from '@/components/cockpit/AReglerFinaliser'
import { CompagnonsDeRoute } from '@/components/cockpit/CompagnonsDeRoute'
import { SaisonFrise } from '@/components/cockpit/SaisonFrise'
import './Cockpit.css'

export function CockpitPage() {
  const { currentActor, person } = useAuth()
  const { participations, loading, refetch } = useMyParticipations()
  const { reportedEventIds } = useMyReportedEventIds()

  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()

  const nextFestival = useMemo(() => selectNextFestival(participations, now), [participations, now])
  const upcoming = useMemo(() => selectUpcomingFestivals(participations, now), [participations, now])
  const aRegler = useMemo(() => selectAReglerItems(participations, now), [participations, now])
  const season = useMemo(() => aggregateSeason(participations, year), [participations, year])
  const bilanPrompt = useMemo(
    () => detectBilanPrompt(participations, reportedEventIds, now),
    [participations, reportedEventIds, now],
  )

  const greeting = person?.display_name ? `Bonjour ${person.display_name}` : 'Bonjour'

  return (
    <div className="ck-page">
      <div className="ck-topbar">
        <div>
          <h1 className="page-title">{greeting}</h1>
          <p className="ck-sub">{currentActor?.label ?? 'Ton activité'} · ta saison d'un coup d'œil</p>
        </div>
      </div>

      {loading ? (
        <div className="ck-skel">{[0, 1, 2].map(i => <div key={i} className="ck-skel-col" />)}</div>
      ) : (
        <>
          <BilanBanner prompt={bilanPrompt} onSaved={refetch} />
          <div className="ck-cols">
            <div className="ck-col">
              <ProchainFestival participation={nextFestival} />
              <ProchainsFestivals participations={upcoming} />
            </div>
            <div className="ck-col">
              <AReglerFinaliser participations={aRegler} />
              <CompagnonsDeRoute />
            </div>
            <div className="ck-col">
              <SaisonFrise season={season} year={year} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Écrire le CSS (porté de la maquette)**

Create `src/pages/Cockpit.css`. Les tokens DA (`--surface`, `--line`, `--cop`, `--green`, `--amber`, etc.) sont **déjà définis globalement** dans `src/index.css` (DA Nuit de Festival, thèmes jour/nuit) — ne PAS les redéfinir ici. Porter les structures depuis `docs/decisions/assets/dashboard-exposant.html` (sélecteurs `.bento/.cols3/.col/.card/.c-next/.pf-poster/.pill`) en les renommant en `ck-*`.

⚠️ Checklist jour/nuit (mémoire `reference_da_daynight_gotchas`) : `svg{fill:none}` déjà global ; pas de `#fff` en dur ; ombres douces en `.light`.

```css
.ck-page { padding: 30px 38px 64px; }
.ck-topbar { margin-bottom: 22px; }
.ck-sub { color: var(--muted); margin-top: 5px; font-size: 14px; }

.ck-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: start; }
.ck-col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
@media (max-width: 1100px) { .ck-cols { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px)  { .ck-cols { grid-template-columns: 1fr; } }

.ck-card { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 20px; }
.ck-card h3 { font-size: 15px; display: flex; align-items: center; gap: 8px; margin-bottom: 15px; font-weight: 800; }
.ck-ic { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ck-ic svg { width: 16px; height: 16px; }
.ck-ic.cop { background: color-mix(in srgb, var(--cop) 18%, transparent); color: var(--amber); }
.ck-ic.grn { background: color-mix(in srgb, var(--green) 20%, transparent); color: var(--green); }
.ck-seeall { margin-left: auto; font-size: 12px; color: var(--muted); font-weight: 500; text-decoration: none; }

/* Badges statut — réutilise la palette des variantes (cf. participationChip). */
.ck-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 5px 11px; border-radius: 99px; background: var(--surface2); color: var(--text); }
.ck-badge.sm { font-size: 11px; padding: 3px 9px; }
.ck-badge.inscrit, .ck-badge.going { background: color-mix(in srgb, var(--green) 18%, transparent); color: var(--green-d, var(--green)); }
.ck-badge.apayer, .ck-badge.acompte { background: color-mix(in srgb, var(--amber) 22%, transparent); color: var(--amber); }
.ck-badge.dossier, .ck-badge.accepte { background: color-mix(in srgb, var(--cop) 16%, transparent); color: var(--amber); }

/* Boutons */
.ck-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-weight: 600; font-size: 14px; border-radius: 11px; padding: 9px 16px; border: none; cursor: pointer; text-decoration: none; white-space: nowrap; }
.ck-btn svg { width: 16px; height: 16px; }
.ck-btn-p { background: linear-gradient(135deg, var(--cop), var(--cop-d)); color: #fbf3e8; }
.ck-btn-g { background: var(--surface2); border: 1px solid var(--line); color: var(--text); }
.ck-btn-sm { padding: 6px 11px; font-size: 13px; }

/* Prochain festival (hero) */
.ck-next { padding: 0; overflow: hidden; display: flex; }
.ck-next-poster { position: relative; width: 150px; flex-shrink: 0; background: var(--surface2); }
.ck-next-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ck-next-noposter { width: 100%; height: 100%; min-height: 180px; background: linear-gradient(135deg, var(--surface2), var(--surface)); }
.ck-jx { position: absolute; top: 10px; left: 10px; background: var(--cop); color: #fbf3e8; font-weight: 700; font-size: 12px; padding: 4px 9px; border-radius: 8px; }
.ck-next-body { padding: 18px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.ck-next-body h2 { font-size: 19px; font-weight: 800; }
.ck-next-meta { color: var(--muted); font-size: 13px; }
.ck-next-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }

/* Listes (prochains festivals / à régler) */
.ck-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.ck-list-row { display: flex; align-items: center; gap: 11px; padding: 8px; border-radius: 11px; text-decoration: none; color: var(--text); }
.ck-list-row:hover { background: var(--surface2); }
.ck-list-thumb { width: 38px; height: 38px; border-radius: 9px; overflow: hidden; flex-shrink: 0; }
.ck-list-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ck-list-thumb-ph { background: var(--surface2); }
.ck-list-info { flex: 1; min-width: 0; }
.ck-list-info b { display: block; font-size: 14px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ck-list-info small { color: var(--muted); font-size: 12px; }
.ck-addrow { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; font-size: 13px; font-weight: 600; color: var(--amber); text-decoration: none; }
.ck-allset { display: flex; align-items: center; gap: 7px; color: var(--green); }
.ck-allset svg { width: 16px; height: 16px; }
.ck-empty-txt { color: var(--muted); font-size: 13px; }

/* Convergences */
.ck-conv-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.ck-conv { display: flex; align-items: center; gap: 10px; }
.ck-conv-avs { display: flex; }
.ck-av { width: 30px; height: 30px; border-radius: 50%; margin-left: -8px; border: 2px solid var(--surface); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; overflow: hidden; }
.ck-av:first-child { margin-left: 0; }
.ck-av img { width: 100%; height: 100%; object-fit: cover; }
.ck-conv-txt { flex: 1; min-width: 0; }
.ck-conv-txt b { font-size: 13px; display: block; }
.ck-conv-txt small { color: var(--muted); font-size: 12px; }
.ck-conv-actions { display: flex; gap: 6px; }

/* Saison (frise) */
.ck-frise { display: flex; gap: 5px; align-items: flex-end; }
.ck-month { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.ck-month-bar { width: 100%; height: 34px; border-radius: 5px; }
.ck-month.filled .ck-month-bar { background: color-mix(in srgb, var(--green) 55%, transparent); }
.ck-month.empty .ck-month-bar { background: transparent; border: 1px dashed color-mix(in srgb, var(--amber) 55%, transparent); }
.ck-month-lbl { font-size: 9px; color: var(--muted); }
.ck-month-count { font-size: 11px; font-weight: 700; color: var(--green); }
.ck-saison-hint { margin-top: 14px; font-size: 13px; color: var(--muted); }
.ck-saison-hint a { color: var(--amber); text-decoration: none; }

/* Bandeau bilan */
.ck-bilan-banner { display: flex; align-items: center; gap: 14px; padding: 16px 20px; margin-bottom: 20px; border-radius: 16px; background: linear-gradient(135deg, color-mix(in srgb, var(--cop) 22%, transparent), color-mix(in srgb, var(--green) 12%, transparent)); border: 1px solid color-mix(in srgb, var(--amber) 30%, transparent); }
.ck-bilan-ic { width: 40px; height: 40px; border-radius: 11px; background: color-mix(in srgb, var(--amber) 22%, transparent); color: var(--amber); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ck-bilan-txt { flex: 1; min-width: 0; }
.ck-bilan-txt b { display: block; font-size: 15px; font-weight: 800; }
.ck-bilan-txt small { color: var(--muted); font-size: 13px; }
.ck-bilan-x { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; }

/* Skeleton */
.ck-skel { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.ck-skel-col { height: 240px; border-radius: 18px; background: var(--surface); opacity: .5; }

/* Topbar/hero responsive */
@media (max-width: 560px) {
  .ck-page { padding: 20px 16px 56px; }
  .ck-next { flex-direction: column; }
  .ck-next-poster { width: 100%; height: 160px; }
}
```

- [ ] **Step 3: Vérifier compilation**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Cockpit.tsx src/pages/Cockpit.css
git commit -m "feat(cockpit): page conteneur + styles (layout 3 colonnes)"
```

---

## Task 11: Brancher la route `/tableau-de-bord`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Importer la page**

Dans `src/App.tsx`, après la ligne `import { AbonnementPage } from '@/pages/Abonnement'` (ligne 23), ajouter :

```tsx
import { CockpitPage } from '@/pages/Cockpit'
```

- [ ] **Step 2: Remplacer le ComingSoon par la page**

Remplacer la route ligne 109 :

```tsx
          <Route path="/tableau-de-bord" element={<AuthenticatedApp><ProGate title="Cockpit"><ComingSoon title="Cockpit" /></ProGate></AuthenticatedApp>} />
```

par :

```tsx
          <Route path="/tableau-de-bord" element={<AuthenticatedApp><ProGate title="Cockpit"><CockpitPage /></ProGate></AuthenticatedApp>} />
```

- [ ] **Step 3: Vérifier compilation + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS. (`ComingSoon` est encore utilisé par `/mes-createurs` → l'import reste valide, pas de warning unused.)

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(cockpit): route /tableau-de-bord -> CockpitPage"
```

---

## Task 12: Redirection post-login Pro → Cockpit

On utilise `defaultRouteForActor` (Task 3) aux 3 points de redirection. Note : au tout premier login, l'acteur actif par défaut est la **personne** (plan free) → atterrissage `/explorer`. Une entité Pro déjà sélectionnée (actor stocké) → Cockpit. Comportement V1 accepté.

**Files:**
- Modify: `src/pages/AuthCallback.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/Onboarding.tsx`

- [ ] **Step 1: AuthCallback**

Dans `src/pages/AuthCallback.tsx` :
- Étendre la destructuration ligne 7 :
  ```tsx
  const { user, person, needsOnboarding, loading, currentActor, currentActorRow } = useAuth()
  ```
- Ajouter l'import en tête :
  ```tsx
  import { defaultRouteForActor } from '@/lib/navModel'
  ```
- Remplacer ligne 16 :
  ```tsx
      navigate(needsOnboarding ? '/onboarding' : '/explorer', { replace: true })
  ```
  par :
  ```tsx
      navigate(needsOnboarding ? '/onboarding' : defaultRouteForActor(currentActor, currentActorRow), { replace: true })
  ```
- Ajouter `currentActor, currentActorRow` au tableau de dépendances du `useEffect` (ligne 21).

- [ ] **Step 2: Login (redirection déjà-connecté)**

Dans `src/pages/Login.tsx` :
- Ajouter l'import : `import { defaultRouteForActor } from '@/lib/navModel'`
- Récupérer depuis `useAuth()` (vérifier la ligne `const { ... } = useAuth()` existante et y ajouter) `currentActor, currentActorRow`.
- Remplacer ligne 65 `<Navigate to="/explorer" replace />` par :
  ```tsx
  return <Navigate to={defaultRouteForActor(currentActor, currentActorRow)} replace />
  ```

- [ ] **Step 3: Onboarding**

Dans `src/pages/Onboarding.tsx` :
- Ajouter l'import : `import { defaultRouteForActor } from '@/lib/navModel'`
- Récupérer `currentActor, currentActorRow` depuis `useAuth()`.
- Remplacer les `navigate('/explorer', { replace: true })` (lignes 149 et 165) par :
  ```tsx
  navigate(defaultRouteForActor(currentActor, currentActorRow), { replace: true })
  ```

- [ ] **Step 4: Vérifier compilation + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AuthCallback.tsx src/pages/Login.tsx src/pages/Onboarding.tsx
git commit -m "feat(cockpit): redirection post-login entité Pro -> /tableau-de-bord"
```

---

## Task 13: Vérification finale + bump version

**Files:**
- Modify: `src/version.ts` (ou équivalent — bump patch)

- [ ] **Step 1: Suite de tests complète**

Run: `pnpm vitest run`
Expected: PASS (dont `src/lib/cockpit.test.ts`).

- [ ] **Step 2: Build + lint**

Run: `pnpm build && pnpm lint`
Expected: PASS, zéro erreur.

- [ ] **Step 3: Vérification visuelle manuelle (le test render() ne couvre pas le visuel)**

Run: `pnpm dev`, se connecter avec une entité Pro (ou activer `DebugPlanSwitch` en admin → plan `pro`), aller sur `/tableau-de-bord`. Vérifier :
- Les 3 colonnes s'affichent, modules peuplés ou empty states corrects.
- Bascule thème jour/nuit (toggle sidebar) : pas de `#fff` en dur, ombres douces en jour, frise lisible.
- Un compte gratuit sur `/tableau-de-bord` voit le teaser `ProGate`.

- [ ] **Step 4: Bump version + commit final**

Localiser `APP_VERSION` (grep `APP_VERSION` dans `src/`), bumper le patch.

```bash
git add -A
git commit -m "chore(cockpit): vérif build/test/lint + bump version"
```

---

## Self-Review (effectué)

**Couverture spec :**
- Bilan post-festival → Task 1 (`detectBilanPrompt`) + Task 9 (`BilanBanner`). ✓
- Prochain festival (confirmé only) → Task 1 (`selectNextFestival`) + Task 5. ✓
- Tes prochains festivals → Task 1 (`selectUpcomingFestivals`) + Task 6. ✓
- À régler & finaliser → Task 1 (`selectAReglerItems`) + Task 7. ✓
- Mes compagnons de route → Task 8 (réutilise `useCommunityFeed`). ✓
- Ta saison 2026 → Task 1 (`aggregateSeason`) + Task 4. ✓
- Routing `/tableau-de-bord` + `built: true` → Tasks 3, 11. ✓
- Redirection post-login Pro → Tasks 3, 12. ✓
- Tests fonctions pures → Task 1. ✓

**Cohérence des types :** `SeasonMonth`, `BilanPrompt` définis en Task 1, consommés en Tasks 4/9/10 avec les mêmes noms de champs (`month/count/filled`, `pending/extraCount`). `participationChip(status, payment, 'entity')` appelé avec la signature réelle de `lib/explorer.ts`. `useCommunityFeed()` retourne `{ convergences, loading }` (vérifié). `BilanModal` props `{ eventId, onClose, onSaved }` (vérifié via `BilanCard`).

**Hors-périmètre rappelé :** module Véhicule, coût/km, open-data carburant → V1.1 (non couverts ici, volontairement).

**Dette repérée (hors plan) :** `get_friends_with_dates` casse sur colonnes `follows` droppées — à traiter séparément.
