# Calendrier mobile — Agenda vertical — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la navigation mobile du Calendrier (grille année 3×4 illisible → vue mois) par un agenda vertical unique, lisible, avec séparation claire mes dates / amis. Mobile only — desktop strictement inchangé.

**Architecture:** Un nouveau composant présentationnel `MobileAgenda` empile les 12 mois de la fenêtre glissante (déjà calculée dans `Calendar.tsx`). Chaque mois = en-tête `MonthBanner` (réutilisé du desktop) + mes dates en pills avec pastille de statut (`participationChip`) + section « Tes compagnons » atténuée. Deux helpers purs sont extraits pour être testés (`formatDateRange`, `avatarGradient`). `Calendar.tsx` perd tout l'état du double-niveau ; `MobileYearGrid` et `MobileMonthView` sont supprimés.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest, Tailwind v4 (CSS-first), tokens DA (`hsl(var(--token))` pour les triplets, `var(--status-*)` brut). pnpm.

**Spec:** `docs/superpowers/specs/2026-05-26-calendrier-mobile-agenda-design.md`

---

## File Structure

- **Create** `src/lib/calendar-format.ts` — `formatDateRange(start, end)` pur (formatage FR d'une plage de dates).
- **Create** `src/lib/calendar-format.test.ts` — tests purs de `formatDateRange`.
- **Create** `src/lib/avatar-gradient.ts` — `avatarGradient(name)` pur (dégradé déterministe d'avatar, extrait de `CalendarMonth`).
- **Create** `src/lib/avatar-gradient.test.ts` — tests purs de `avatarGradient`.
- **Create** `src/components/calendar/MobileAgenda.tsx` — l'agenda vertical (présentationnel).
- **Modify** `src/components/calendar/CalendarMonth.tsx` — utilise `avatarGradient` au lieu de ses consts locales (sortie identique, desktop inchangé visuellement).
- **Modify** `src/pages/Calendar.tsx` — retire l'état double-niveau, enveloppe header+filtres dans `.calendar-topbar`, rend `<MobileAgenda/>`.
- **Modify** `src/pages/Calendar.css` — supprime les règles `.mobile-year-*` / `.mobile-month-*` mortes, ajoute les styles agenda + en-tête collant mobile.
- **Delete** `src/components/calendar/MobileYearGrid.tsx`, `src/components/calendar/MobileMonthView.tsx`.

---

### Task 1: Helper `formatDateRange` (pur, testé)

**Files:**
- Create: `src/lib/calendar-format.ts`
- Test: `src/lib/calendar-format.test.ts`

Le code provient de l'actuel `MobileMonthView.tsx` (lignes 18-27), extrait pour réutilisation + test. Comportement attendu :
- même jour → `24 mai`
- même mois → `24-26 mai`
- à cheval sur deux mois → `30 mai — 2 juin`

- [ ] **Step 1: Écrire le test qui échoue**

`src/lib/calendar-format.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { formatDateRange } from './calendar-format'

describe('formatDateRange', () => {
  it('même jour → un seul jour', () => {
    expect(formatDateRange(new Date(2026, 4, 24), new Date(2026, 4, 24))).toBe('24 mai')
  })
  it('même mois → plage de jours', () => {
    expect(formatDateRange(new Date(2026, 4, 24), new Date(2026, 4, 26))).toBe('24-26 mai')
  })
  it('deux mois → plage avec les deux mois', () => {
    expect(formatDateRange(new Date(2026, 4, 30), new Date(2026, 5, 2))).toBe('30 mai — 2 juin')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pnpm vitest run src/lib/calendar-format.test.ts`
Expected: FAIL — `Failed to resolve import "./calendar-format"` (le fichier n'existe pas).

- [ ] **Step 3: Implémenter le helper**

`src/lib/calendar-format.ts` :
```ts
/** Formate une plage de dates en français court pour le calendrier.
 *  Même jour → "24 mai" ; même mois → "24-26 mai" ; deux mois → "30 mai — 2 juin". */
export function formatDateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth()
  const sameDay = start.getDate() === end.getDate() && sameMonth
  const monthShort = start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')

  if (sameDay) return `${start.getDate()} ${monthShort}`
  if (sameMonth) return `${start.getDate()}-${end.getDate()} ${monthShort}`
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${start.getDate()} ${monthShort} — ${end.getDate()} ${endMonth}`
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pnpm vitest run src/lib/calendar-format.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar-format.ts src/lib/calendar-format.test.ts
git commit -m "feat(calendrier): extrait formatDateRange en util pur testé"
```

---

### Task 2: Helper `avatarGradient` (pur, testé) + refacto `CalendarMonth`

**Files:**
- Create: `src/lib/avatar-gradient.ts`
- Test: `src/lib/avatar-gradient.test.ts`
- Modify: `src/components/calendar/CalendarMonth.tsx:18-26` (consts locales) + usages lignes ~88 et ~110

Extrait des consts `AVATAR_GRADIENTS` + `hashName` de `CalendarMonth.tsx`. **Sortie identique** → le desktop ne change pas visuellement.

- [ ] **Step 1: Écrire le test qui échoue**

`src/lib/avatar-gradient.test.ts` :
```ts
import { describe, it, expect } from 'vitest'
import { avatarGradient } from './avatar-gradient'

describe('avatarGradient', () => {
  it('renvoie un linear-gradient CSS', () => {
    expect(avatarGradient('Marie')).toMatch(/^linear-gradient\(135deg, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/i)
  })
  it('est déterministe (même nom → même dégradé)', () => {
    expect(avatarGradient('Marie')).toBe(avatarGradient('Marie'))
  })
  it('gère la chaîne vide sans planter', () => {
    expect(avatarGradient('')).toMatch(/^linear-gradient/)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pnpm vitest run src/lib/avatar-gradient.test.ts`
Expected: FAIL — `Failed to resolve import "./avatar-gradient"`.

- [ ] **Step 3: Implémenter le helper**

`src/lib/avatar-gradient.ts` :
```ts
const AVATAR_GRADIENTS: [string, string][] = [
  ['#f0a060', '#e74c3c'], ['#6c5ce7', '#a29bfe'], ['#00b894', '#00cec9'],
  ['#fd79a8', '#e84393'], ['#f39c12', '#d68910'],
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Dégradé d'avatar déterministe à partir d'un nom (135deg, deux couleurs). */
export function avatarGradient(name: string): string {
  const [from, to] = AVATAR_GRADIENTS[hashName(name) % AVATAR_GRADIENTS.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pnpm vitest run src/lib/avatar-gradient.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Refactor `CalendarMonth.tsx` pour utiliser le helper (sortie identique)**

Dans `src/components/calendar/CalendarMonth.tsx` :

a) Ajouter l'import en haut (après les imports existants) :
```ts
import { avatarGradient } from '@/lib/avatar-gradient'
```

b) **Supprimer** les consts locales (lignes 18-26) :
```ts
const AVATAR_GRADIENTS = [
  ['#f0a060', '#e74c3c'], ['#6c5ce7', '#a29bfe'], ['#00b894', '#00cec9'],
  ['#fd79a8', '#e84393'], ['#f39c12', '#d68910'],
]
function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}
```

c) Remplacer l'usage dans les compagnons (était lignes ~88-94) :
```tsx
                    const nm = fp.actor_public?.label ?? '?'
                    const url = fp.actor_public?.avatar_url
                    const [from, to] = AVATAR_GRADIENTS[hashName(nm) % AVATAR_GRADIENTS.length]
                    return (
                      <span key={fp.actor_id} className="calendar-pav-item"
                        style={{ background: url ? 'transparent' : `linear-gradient(135deg, ${from}, ${to})`, zIndex: 4 - i }}>
                        {url ? <img src={url} alt={nm} /> : nm[0].toUpperCase()}
                      </span>
                    )
```
par :
```tsx
                    const nm = fp.actor_public?.label ?? '?'
                    const url = fp.actor_public?.avatar_url
                    return (
                      <span key={fp.actor_id} className="calendar-pav-item"
                        style={{ background: url ? 'transparent' : avatarGradient(nm), zIndex: 4 - i }}>
                        {url ? <img src={url} alt={nm} /> : nm[0].toUpperCase()}
                      </span>
                    )
```

d) Remplacer l'usage dans la section amis (était lignes ~109-118) :
```tsx
            const fname = ev.friendName ?? 'Un ami'
            const [from, to] = AVATAR_GRADIENTS[hashName(fname) % AVATAR_GRADIENTS.length]
            return (
              <Link key={ev.id} to={`/evenement/${ev.id}`} state={{ from: '/calendrier' }} className="calendar-evF">
                {ev.imageUrl && <img src={ev.imageUrl} alt="" />}
                <div className="calendar-evF-info">
                  <div className="calendar-evF-name">{ev.name}</div>
                  <div className="calendar-evF-meta">{fname} y va · {ev.startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</div>
                </div>
                <span className="calendar-evF-av" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>{fname[0].toUpperCase()}</span>
              </Link>
            )
```
par :
```tsx
            const fname = ev.friendName ?? 'Un ami'
            return (
              <Link key={ev.id} to={`/evenement/${ev.id}`} state={{ from: '/calendrier' }} className="calendar-evF">
                {ev.imageUrl && <img src={ev.imageUrl} alt="" />}
                <div className="calendar-evF-info">
                  <div className="calendar-evF-name">{ev.name}</div>
                  <div className="calendar-evF-meta">{fname} y va · {ev.startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</div>
                </div>
                <span className="calendar-evF-av" style={{ background: avatarGradient(fname) }}>{fname[0].toUpperCase()}</span>
              </Link>
            )
```

- [ ] **Step 6: Vérifier build + lint (desktop intact)**

Run: `pnpm build && pnpm lint`
Expected: build OK, lint sans erreur. (Le rendu desktop est identique : `avatarGradient` reproduit exactement l'ancien calcul.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/avatar-gradient.ts src/lib/avatar-gradient.test.ts src/components/calendar/CalendarMonth.tsx
git commit -m "refactor(calendrier): extrait avatarGradient (util pur partagé), CalendarMonth l'utilise"
```

---

### Task 3: Composant `MobileAgenda`

**Files:**
- Create: `src/components/calendar/MobileAgenda.tsx`

Composant présentationnel. Pas de test de rendu (RTL ne flush pas en synchrone sur cette stack — cf. `reference_react_test_infra`) ; la logique testable a été extraite (Tasks 1-2). Vérification = build/lint + visuel.

- [ ] **Step 1: Créer le composant**

`src/components/calendar/MobileAgenda.tsx` :
```tsx
import { Link } from 'react-router-dom'
import { useTags } from '@/hooks/use-tags'
import { getTagIcon } from '@/components/ui/TagBadge'
import { MonthBanner } from './MonthBanner'
import { participationChip, type ActorKind } from '@/lib/explorer'
import { formatDateRange } from '@/lib/calendar-format'
import { avatarGradient } from '@/lib/avatar-gradient'
import type { CalendarMonth } from '@/hooks/use-calendar'
import type { FriendParticipation } from '@/hooks/use-participations'

interface MobileAgendaProps {
  months: CalendarMonth[]
  actorKind: ActorKind
  friendParticipations: FriendParticipation[]
  onOpenFriends: (eventId: string, eventName: string) => void
}

function useTagStyle() {
  const { tags } = useTags()
  return (slug: string) => {
    const t = tags.find(t => t.value === slug)
    return t ? { bg: t.bg, color: t.color } : { bg: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
  }
}

export function MobileAgenda({ months, actorKind, friendParticipations, onOpenFriends }: MobileAgendaProps) {
  const getTagStyle = useTagStyle()
  const now = new Date()

  return (
    <div className="mobile-agenda">
      {months.map(month => {
        if (month.events.length === 0) {
          return (
            <div key={`${month.year}-${month.month}`} className="agenda-empty">
              <span className="agenda-empty-nm">{month.label}</span>
              <span className="agenda-empty-lbl">libre</span>
            </div>
          )
        }

        const mine = month.events.filter(e => !e.isFriend)
        const friendsOnly = month.events.filter(e => e.isFriend)

        return (
          <section key={`${month.year}-${month.month}`} className="agenda-month">
            <div className="agenda-mh">
              <MonthBanner month={month.month} label={month.label} year={month.year} />
              {mine.length > 0 && (
                <span className="agenda-count">{mine.length} date{mine.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {mine.map(ev => {
              const tagStyle = getTagStyle(ev.primaryTag)
              const chip = participationChip(ev.status, ev.paymentStatus, actorKind, { isPast: ev.endDate < now })
              const friendsAtEvent = friendParticipations.filter(fp => fp.event_id === ev.id)
              const Icon = getTagIcon(ev.primaryTag)
              return (
                <div key={ev.id} className="agenda-event">
                  <Link
                    to={`/evenement/${ev.id}`}
                    state={{ from: '/calendrier' }}
                    className="mobile-event-pill"
                    style={{ background: tagStyle.bg }}
                  >
                    {ev.imageUrl && (
                      <div className="mobile-event-pill-img"><img src={ev.imageUrl} alt="" /></div>
                    )}
                    <div className="mobile-event-pill-info">
                      <div className="mobile-event-pill-name">
                        <Icon size={12} strokeWidth={2} className="inline -mt-px shrink-0" />{' '}{ev.name}
                      </div>
                      <div className="mobile-event-pill-meta">
                        <span>{formatDateRange(ev.startDate, ev.endDate)}</span>
                        <span>·</span>
                        <span>{ev.city} ({ev.department})</span>
                      </div>
                    </div>
                    {chip && (
                      <div className={'mobile-event-pill-status ' + chip.variant} title={chip.label}>
                        {chip.label}
                      </div>
                    )}
                  </Link>

                  {friendsAtEvent.length > 0 && (
                    <button className="agenda-companions" onClick={() => onOpenFriends(ev.id, ev.name)}>
                      <div className="agenda-pav">
                        {friendsAtEvent.slice(0, 4).map((fp, i) => {
                          const nm = fp.actor_public?.label ?? '?'
                          const url = fp.actor_public?.avatar_url
                          return (
                            <span key={fp.actor_id} className="agenda-pav-item"
                              style={{ background: url ? 'transparent' : avatarGradient(nm), zIndex: 4 - i }}>
                              {url ? <img src={url} alt={nm} /> : nm[0].toUpperCase()}
                            </span>
                          )
                        })}
                      </div>
                      <span>{friendsAtEvent.length} compagnon{friendsAtEvent.length > 1 ? 's' : ''}</span>
                    </button>
                  )}
                </div>
              )
            })}

            {friendsOnly.length > 0 && (
              <>
                <div className="agenda-frlbl">Tes compagnons</div>
                {friendsOnly.map(ev => {
                  const fname = ev.friendName ?? 'Un ami'
                  return (
                    <Link key={ev.id} to={`/evenement/${ev.id}`} state={{ from: '/calendrier' }} className="mobile-event-pill fr">
                      <span className="agenda-fr-av" style={{ background: avatarGradient(fname) }}>{fname[0].toUpperCase()}</span>
                      <div className="mobile-event-pill-info">
                        <div className="mobile-event-pill-name">{ev.name}</div>
                        <div className="mobile-event-pill-meta">
                          <span>{fname} y va</span>
                          <span>·</span>
                          <span>{ev.startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier que ça compile**

Run: `pnpm build`
Expected: build OK (le composant n'est pas encore monté ; on vérifie juste qu'il type-check).

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/MobileAgenda.tsx
git commit -m "feat(calendrier): composant MobileAgenda (agenda vertical mobile)"
```

---

### Task 4: Brancher dans `Calendar.tsx` + supprimer l'ancien mobile

**Files:**
- Modify: `src/pages/Calendar.tsx`
- Delete: `src/components/calendar/MobileYearGrid.tsx`, `src/components/calendar/MobileMonthView.tsx`

- [ ] **Step 1: Mettre à jour les imports**

Dans `src/pages/Calendar.tsx`, remplacer les deux imports (lignes 7-8) :
```tsx
import { MobileYearGrid } from '@/components/calendar/MobileYearGrid'
import { MobileMonthView } from '@/components/calendar/MobileMonthView'
```
par :
```tsx
import { MobileAgenda } from '@/components/calendar/MobileAgenda'
```

- [ ] **Step 2: Supprimer l'état + la logique du double-niveau**

Supprimer ces blocs :

a) Lignes 27-28 (état de vue mobile) :
```tsx
  const [mobileView, setMobileView] = useState<'year' | 'month'>('year')
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0)
```
(⚠️ **garder** la ligne 29 `const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)` et son effet `matchMedia` lignes 31-36.)

b) Lignes 38-42 (`handleSelectMonth`) :
```tsx
  const handleSelectMonth = useCallback((index: number) => {
    setSelectedMonthIndex(index)
    setMobileView('month')
    window.history.pushState({ calendarView: 'month' }, '')
  }, [])
```

c) Lignes 44-54 (effet popstate) :
```tsx
  // Handle browser back button: return to year view instead of leaving page
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (mobileView === 'month') {
        e.preventDefault()
        setMobileView('year')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [mobileView])
```

d) Lignes 56-62 (`handlePrevMonth` / `handleNextMonth`) :
```tsx
  const handlePrevMonth = useCallback(() => {
    setSelectedMonthIndex(i => i > 0 ? i - 1 : 11)
  }, [])

  const handleNextMonth = useCallback(() => {
    setSelectedMonthIndex(i => i < 11 ? i + 1 : 0)
  }, [])
```

- [ ] **Step 3: Vérifier les imports inutilisés**

Après suppression, `useEffect` et `useCallback` restent utilisés ailleurs (l'effet `matchMedia` et `navigate`/`mergeWithFriends`). Ne pas toucher la ligne d'import React. Si lint signale un import non utilisé, le retirer — sinon laisser.

- [ ] **Step 4: Envelopper header+filtres dans `.calendar-topbar` + remplacer le bloc mobile**

a) Envelopper le header et les filtres. Remplacer l'ouverture (juste après `<div className="calendar-page">`, ligne 177) — le bloc actuel :
```tsx
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar-header">
```
devient :
```tsx
    <div className="calendar-page">
      {/* En-tête + filtres : collants sur mobile via .calendar-topbar (neutre en desktop) */}
      <div className="calendar-topbar">
      {/* Header */}
      <div className="calendar-header">
```

Et fermer le wrapper juste après la barre de filtres. Le bloc actuel (lignes ~229) :
```tsx
        </button>
      </div>

      {/* Grid */}
```
devient :
```tsx
        </button>
      </div>
      </div>{/* /.calendar-topbar */}

      {/* Grid */}
```

b) Remplacer tout le bloc mobile (lignes 262-282) :
```tsx
      {/* Mobile calendar */}
      {isMobile && (
        <div className="mobile-calendar">
          {mobileView === 'year' ? (
            <MobileYearGrid
              months={slidingMonths}
              currentMonth={now.getMonth()}
              currentYear={now.getFullYear()}
              onSelectMonth={handleSelectMonth}
            />
          ) : (
            <MobileMonthView
              month={slidingMonths[selectedMonthIndex]}
              actorKind={actorKind}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onBackToYear={() => setMobileView('year')}
            />
          )}
        </div>
      )}
```
par :
```tsx
      {/* Mobile calendar — agenda vertical */}
      {isMobile && (
        <div className="mobile-calendar">
          <MobileAgenda
            months={slidingMonths}
            actorKind={actorKind}
            friendParticipations={friendActivity}
            onOpenFriends={(id, name) => setModalEvent({ id, name })}
          />
        </div>
      )}
```

- [ ] **Step 5: Supprimer les composants morts**

```bash
git rm src/components/calendar/MobileYearGrid.tsx src/components/calendar/MobileMonthView.tsx
```

- [ ] **Step 6: Vérifier build + lint**

Run: `pnpm build && pnpm lint`
Expected: build OK, lint sans erreur. Si lint signale `useCallback`/`useEffect` non utilisés, les retirer de l'import React en tête de fichier.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "feat(calendrier): branche MobileAgenda, supprime la nav mobile à deux niveaux"
```

---

### Task 5: CSS — purger l'ancien mobile, styler l'agenda + en-tête collant

**Files:**
- Modify: `src/pages/Calendar.css`

- [ ] **Step 1: Supprimer les règles mortes**

Dans `src/pages/Calendar.css`, **supprimer** entièrement :
- le bloc `/* ── Mobile Year Grid ── */` : toutes les règles `.mobile-year-grid`, `.mobile-year-cell`, `.mobile-year-cell:active`, `.mobile-year-cell.current`, `.mobile-year-cell.empty`, `.mobile-year-cell-label`, `.mobile-year-cell-label.current`, `.mobile-year-cell-empty`, `.mobile-year-cell-events`, `.mobile-year-cell-event`, `.mobile-year-cell-dot`, `.mobile-year-cell-name`, `.mobile-year-cell-overflow` (≈ lignes 622-708).
- le bloc `/* ── Mobile Month View ── */` : `.mobile-month-nav`, `.mobile-month-nav-btn`, `.mobile-month-nav-btn:hover`, `.mobile-month-nav-btn svg`, `.mobile-month-nav-label`, `.mobile-month-back`, `.mobile-month-back:hover`, `.mobile-month-back svg`, `.mobile-month-empty`, `.mobile-month-events` (≈ lignes 710-791).

**Garder** `.mobile-calendar` (display none/block) et tout le bloc `.mobile-event-pill*` (réutilisé par l'agenda).

- [ ] **Step 2: Ajouter les styles de l'agenda**

À la suite du bloc `.mobile-event-pill-status.*` (après la ligne `.mobile-event-pill-status.going`), ajouter :
```css
/* ── Mobile Agenda (vue par défaut mobile) ────────────────────────── */
.mobile-agenda { display: flex; flex-direction: column; }

.agenda-month { margin-bottom: 18px; }

.agenda-mh {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 2px 9px;
}
.agenda-mh .calendar-month-banner { flex: 1; min-width: 0; }
.agenda-count {
  flex-shrink: 0;
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 700;
  color: hsl(var(--muted-foreground));
}

.agenda-event { margin-bottom: 7px; }

/* Ligne compagnons sous une de mes dates */
.agenda-companions {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 4px 0 0;
  padding: 5px 4px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 11px;
  color: hsl(var(--muted-foreground));
}
.agenda-pav { display: flex; }
.agenda-pav-item {
  width: 22px; height: 22px;
  border-radius: 50%;
  margin-left: -7px;
  border: 2px solid hsl(var(--background));
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-heading); font-size: 10px; font-weight: 700;
  color: #fff;
  overflow: hidden;
}
.agenda-pav-item:first-child { margin-left: 0; }
.agenda-pav-item img { width: 100%; height: 100%; object-fit: cover; }

/* Section « Tes compagnons » (événements où des amis vont, pas toi) */
.agenda-frlbl {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 11px 2px 7px;
  font-family: var(--font-body);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}
.agenda-frlbl::before, .agenda-frlbl::after {
  content: '';
  flex: 1;
  height: 1px;
  background: hsl(var(--border));
}
.mobile-event-pill.fr { opacity: 0.62; }
.agenda-fr-av {
  width: 30px; height: 30px;
  border-radius: 50%;
  margin: 8px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-heading); font-size: 12px; font-weight: 700;
  color: #fff;
}

/* Mois vide : ligne fine */
.agenda-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 2px;
  margin-bottom: 4px;
}
.agenda-empty::before {
  content: '';
  width: 4px; height: 13px;
  border-radius: 2px;
  background: hsl(var(--border));
  flex-shrink: 0;
}
.agenda-empty-nm {
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 700;
  color: hsl(var(--muted-foreground));
  text-transform: capitalize;
}
.agenda-empty-lbl {
  margin-left: auto;
  font-size: 10px;
  font-style: italic;
  color: hsl(var(--muted-foreground));
  opacity: 0.7;
}
```

- [ ] **Step 3: En-tête collant + filtres courts (mobile)**

Dans le `@media (max-width: 639px)` existant (celui qui contient `.mobile-calendar { display: block; }` et `.calendar-grid { display: none; }`, ≈ ligne 617), ajouter :
```css
  /* En-tête + filtres collants pendant le scroll de l'agenda */
  .calendar-topbar {
    position: sticky;
    top: 0;
    z-index: 20;
    background: hsl(var(--background));
    padding-bottom: 4px;
  }
```

> `.calendar-topbar` n'a **aucune** règle hors de ce media query → en desktop c'est un simple `<div>` neutre, le layout ne bouge pas.

- [ ] **Step 4: Raccourcir les libellés de filtres sur mobile**

Les libellés (« Mes événements », « Amis pro », « Amis visiteurs ») débordent sur ~320px. On les raccourcit en CSS via des labels dédiés — mais le texte est en dur dans le JSX. **Approche choisie : raccourcir le texte JSX** (visible aussi en desktop, plus court et plus clair partout). Dans `src/pages/Calendar.tsx`, bloc `.calendar-filters` :
- `Mes événements` → `Mes dates`
- `Amis pro` → inchangé
- `Amis visiteurs` → `Visiteurs`

Remplacer :
```tsx
          className={`calendar-filter-btn ${showMine ? 'active' : ''}`}
        >
          Mes événements
        </button>
```
par :
```tsx
          className={`calendar-filter-btn ${showMine ? 'active' : ''}`}
        >
          Mes dates
        </button>
```
et :
```tsx
          <Users strokeWidth={1.5} />
          Amis visiteurs
        </button>
```
par :
```tsx
          <Users strokeWidth={1.5} />
          Visiteurs
        </button>
```

> Si les 3 chips débordent encore sur très petit écran, ajouter dans le media query `.calendar-filters { overflow-x: auto; }` — à vérifier au visuel (Step 5).

- [ ] **Step 5: Vérifier build + lint + visuel**

Run: `pnpm build && pnpm lint`
Expected: build OK, lint sans erreur.

Run: `pnpm dev`, ouvrir `/calendrier` en viewport mobile (DevTools ≤ 639px, compte exposant Pro), **nuit ET jour** :
- agenda vertical lisible, en-tête + filtres **restent collés** en haut pendant le scroll ;
- mes dates avec bonne pastille (À payer ambre, Inscrit vert, Repéré or…) ;
- section « Tes compagnons » atténuée et séparée par le filet ;
- mois vides en ligne fine « libre » ;
- une de mes dates avec amis → ligne « N compagnons » → clic ouvre la modal ;
- filtres lisibles, ne débordent pas (sinon activer `overflow-x: auto`) ;
- fond de l'en-tête collant **opaque** (le contenu ne transparaît pas dessous).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Calendar.css src/pages/Calendar.tsx
git commit -m "feat(calendrier): styles agenda mobile + en-tête collant + libellés filtres courts"
```

---

### Task 6: Vérification finale + bump version

**Files:**
- Modify: `package.json` (bump patch)

- [ ] **Step 1: Suite complète verte**

Run: `pnpm build && pnpm lint && pnpm vitest run`
Expected: build OK, lint OK, tous les tests verts (118 existants + 6 nouveaux = 124).

- [ ] **Step 2: Grep de non-régression**

Run: `pnpm exec grep -rn "MobileYearGrid\|MobileMonthView\|TAG_COLORS\|mobile-year-\|mobile-month-nav\|mobile-month-back" src/`
Expected: **aucun** résultat dans `src/` (zéro import résiduel, zéro classe CSS orpheline, zéro `TAG_COLORS`).

- [ ] **Step 3: Confirmer desktop intact**

Run: `pnpm dev`, ouvrir `/calendrier` en viewport desktop (≥ 640px) : la grille `.calendar-grid` s'affiche comme avant (12 cartes-mois), avatars des compagnons identiques. Aucune régression visuelle.

- [ ] **Step 4: Bump version + commit**

```bash
npm version patch --no-git-tag-version
git add package.json
git commit -m "chore: bump version (calendrier mobile agenda)"
git push
```

---

## Self-Review (rempli par l'auteur du plan)

**Spec coverage :**
- Agenda vertical empilé → Task 3 ✓
- En-tête collant (titre+année+filtres) → Task 4 (wrapper) + Task 5 Step 3 ✓
- Pas de barre « sauter au mois » → absente du plan ✓
- Mois vides en ligne fine → Task 3 (`agenda-empty`) + Task 5 (styles) ✓
- Pills réutilisées + groupées par mois → Task 3 ✓
- Pastille statut via `participationChip` → Task 3 ✓
- Section « Tes compagnons » atténuée/séparée → Task 3 + Task 5 ✓
- Parité compagnons sur mes dates (modal) → Task 3 (`agenda-companions` + `onOpenFriends`) ✓
- Suppression `MobileYearGrid`/`MobileMonthView` + `TAG_COLORS` → Task 4 + Task 6 grep ✓
- `formatDateRange` util testé → Task 1 ✓
- Filtres labels courts mobile → Task 5 Step 4 ✓
- Tokens DA corrects (`hsl(var())` / `var(--status-*)`) → styles Task 5 conformes ✓
- Desktop inchangé → `avatarGradient` sortie identique (Task 2), `.calendar-topbar` neutre hors media query (Task 5), grille desktop non touchée ✓

**Placeholders :** aucun — chaque step porte le code/commande réels.

**Type consistency :** `MobileAgendaProps` (months/actorKind/friendParticipations/onOpenFriends) cohérent entre Task 3 (définition) et Task 4 (appel). `participationChip(status, payment, kind, ctx)` conforme à `src/lib/explorer.ts`. `formatDateRange(start, end)` et `avatarGradient(name)` cohérents entre définition (Tasks 1-2) et usage (Task 3). `CalendarMonth`/`CalendarEvent`/`FriendParticipation` importés des bons modules.
