# Lot 7a — Mes bilans et Bilan d'une date — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** livrer dans la V2 les écrans « Mes bilans » (`/bilans`) et « Bilan d'une date » (`/bilans/:eventId`), ordinateur et mobile, branchés sur les tables existantes.

**Architecture:** la logique de calcul vit dans `lib/reports.ts` (pure, testée) ; deux écrans dans `features/reports/`, chacun avec son hook de chargement au patron de `.claude/rules/v2.md` ; les photos passent par `lib/report-media.ts`. Aucune migration.

**Tech Stack:** React 19, React Router 7 (`BrowserRouter`, basename `/v2`), supabase-js 2, Vitest, lucide-react, CSS en trois couches.

**Spec:** `docs/superpowers/specs/2026-10-08-lot-7a-bilans-v2-design.md` — à lire avant toute tâche.

## Global Constraints

- Tout se passe dans `apps/web-v2/` ; **rien de la V1 ne rentre** (ni import, ni copier-coller).
- `pnpm --filter web-v2 lint` avant chaque commit : ESLint strict typé zéro avertissement, 400 lignes max par fichier, pas de `any`, pas de `!`, pas de `console`, pas de style inline sauf variables CSS `'--nom'`, stylelint, prettier, en-tête `QUOI / POURQUOI / (ATTENTION)` sur chaque fichier et `README.md` dans chaque dossier.
- Dates par `lib/dates.ts`, montants par `lib/money.ts` — jamais recalculés dans un composant.
- Montants : **uniquement** `event_ledger_entries`. Les colonnes `revenue`, `booth_cost`, `charges` d'`event_reports` sont mortes.
- **Bilan rempli = au moins une ligne `source = 'manual'`.**
- **La ligne `event_reports` n'est jamais supprimée par l'écran** (la cascade emporterait le prix de Mon dossier).
- La ligne `stepper` ne s'écrit que par `supabase.rpc('set_stand_amount', { p_actor_id, p_event_id, p_amount })`.
- Toute requête dont on prend « le premier » est triée.
- Une lecture qui échoue est une erreur affichée, jamais un écran vide.
- Styles : jetons uniquement dans `styles/3-components/`, aucune ombre, cartes blanches bordées `--line-card`, animations par `--duration-*` / `--ease-*`, `prefers-reduced-motion` respecté.
- Les maquettes Figma font foi (fichier `9CmmBD3t5rAk4tD583cdN3`) : `2078:2` Mes bilans, `2080:2` Bilan d'une date, `2158:2` Mes bilans mobile, `2157:2` Bilan mobile. Mobile = sous 760 px.
- Commits en Conventional Commits, en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Aucune écriture en base pour tester.** La vérification en ligne se fait en lecture seule.

## Review Focus

1. **Un exposant inscrit dont la place est saisie mais rien d'autre** : sa date doit dire « Remplir le bilan », sur Mes bilans ET sur le tableau de bord — pas « −450 € ». Test : `isFilled` sur une ligne `stepper` seule → `false` (tâche 1) ; le tableau de bord lit `source` (tâche 2).
2. **« Supprimer ce bilan » sur une date dont la place est saisie** : le prix de Mon dossier doit survivre. Test : `clearReportPlan` ne vise que les lignes `manual` et ne supprime pas la ligne `event_reports` (tâche 4).
3. **Un montant tapé « 1 250,50 », « 12 € » ou « abc »** : les deux premiers s'enregistrent, le troisième ne touche à rien et le dit. Couvert par `parseAmount` (déjà testé) ; la tâche 6 l'utilise et affiche l'erreur.
4. **Une année sans aucune date passée inscrite, ou l'adresse `?annee=1999`** : l'écran dit « Aucune date en 1999 », sans planter. Test : `yearSummary([])` (tâche 1) ; la page gère `years` vide (tâche 3).
5. **Changer d'enseigne (sélecteur de compte) pendant qu'un bilan est ouvert** : l'écran recharge pour la nouvelle enseigne, sans écrire dans l'ancienne. Les hooks dépendent de `actor?.id` et ignorent un résultat périmé (`cancelled`) (tâches 3 et 4).

---

### Task 1 : `lib/reports.ts` — la logique des bilans

**Files:**
- Create: `apps/web-v2/src/lib/reports.ts`
- Test: `apps/web-v2/src/lib/reports.test.ts`

**Interfaces:**
- Consumes: `ledgerRevenue`, `ledgerProfit`, `LedgerLine` de `lib/money.ts` ; `daysUntil` de `lib/dates.ts`.
- Produces:
  ```ts
  export interface ReportLine extends LedgerLine { source: string }
  export interface ReportDate { eventId: string; name: string; imageUrl: string | null; place: string; startDate: Date; endDate: Date; lines: ReportLine[] }
  export interface ReportFigures { filled: boolean; revenue: number; costs: number; net: number; days: number }
  export interface YearSummary { net: number; revenue: number; costs: number; filledCount: number; best: ReportDate | null; bestNet: number; bestDays: number; revenueChange: number | null; months: number[] }
  export function isFilled(lines: ReportLine[]): boolean
  export function reportFigures(date: ReportDate): ReportFigures
  export function yearSummary(dates: ReportDate[], previousYearRevenue: number | null): YearSummary
  export function bestMonth(months: number[]): number | null
  ```

- [ ] **Step 1 : écrire le test qui échoue**

```ts
/**
 * QUOI     — tests de lib/reports.ts : bilan rempli, chiffres d'une date, résumé de l'année.
 * POURQUOI — toute la logique des bilans se vérifie ici, sans navigateur.
 */
import { describe, expect, it } from 'vitest'
import { bestMonth, isFilled, reportFigures, yearSummary, type ReportDate } from './reports'

function date(overrides: Partial<ReportDate> = {}): ReportDate {
  return {
    eventId: 'e1',
    name: 'Les Aventuriales',
    imageUrl: null,
    place: 'Ménétrole (63)',
    startDate: new Date(2026, 5, 25),
    endDate: new Date(2026, 5, 27),
    lines: [],
    ...overrides,
  }
}

const stand = { amount: 450, direction: 'out', source: 'stepper' }
const sales = { amount: 3980, direction: 'in', source: 'manual' }
const fuel = { amount: 186, direction: 'out', source: 'manual' }

describe('isFilled', () => {
  it('une ligne de Mon dossier seule ne remplit pas un bilan', () => {
    expect(isFilled([stand])).toBe(false)
  })
  it('une ligne saisie dans le bilan le remplit', () => {
    expect(isFilled([stand, fuel])).toBe(true)
  })
  it('sans ligne, le bilan est vide', () => {
    expect(isFilled([])).toBe(false)
  })
})

describe('reportFigures', () => {
  it('compte toutes les lignes, celle de Mon dossier comprise', () => {
    expect(reportFigures(date({ lines: [stand, sales, fuel] }))).toEqual({
      filled: true,
      revenue: 3980,
      costs: 636,
      net: 3344,
      days: 3,
    })
  })
  it('une date d’un jour dure un jour', () => {
    const d = new Date(2026, 6, 4)
    expect(reportFigures(date({ startDate: d, endDate: d })).days).toBe(1)
  })
})

describe('yearSummary', () => {
  it('une année vide rend des zéros et aucune meilleure date', () => {
    const summary = yearSummary([], null)
    expect(summary.filledCount).toBe(0)
    expect(summary.best).toBeNull()
    expect(summary.revenueChange).toBeNull()
    expect(summary.months).toHaveLength(12)
    expect(summary.months.every((m) => m === 0)).toBe(true)
  })

  it('ignore les bilans non remplis, même avec le prix de la place', () => {
    const summary = yearSummary([date({ lines: [stand] })], null)
    expect(summary.net).toBe(0)
    expect(summary.filledCount).toBe(0)
  })

  it('additionne les bilans remplis et range le bénéfice au mois de début', () => {
    const june = date({ eventId: 'a', lines: [sales, fuel] }) // 25–27 juin
    const straddling = date({
      eventId: 'b',
      startDate: new Date(2026, 6, 31),
      endDate: new Date(2026, 7, 2),
      lines: [{ amount: 1000, direction: 'in', source: 'manual' }],
    })
    const summary = yearSummary([june, straddling], null)
    expect(summary.net).toBe(3794 + 1000)
    expect(summary.revenue).toBe(4980)
    expect(summary.costs).toBe(186)
    expect(summary.filledCount).toBe(2)
    expect(summary.months[5]).toBe(3794)
    expect(summary.months[6]).toBe(1000) // juillet, mois de début
    expect(summary.months[7]).toBe(0)
  })

  it('à égalité, la meilleure date est la plus récente', () => {
    const line = [{ amount: 500, direction: 'in', source: 'manual' }]
    const older = date({ eventId: 'old', startDate: new Date(2026, 2, 1), endDate: new Date(2026, 2, 1), lines: line })
    const newer = date({ eventId: 'new', startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 2), lines: line })
    const summary = yearSummary([older, newer], null)
    expect(summary.best?.eventId).toBe('new')
    expect(summary.bestNet).toBe(500)
    expect(summary.bestDays).toBe(2)
  })

  it('compare le chiffre d’affaires à l’année précédente, en pourcentage arrondi', () => {
    expect(yearSummary([date({ lines: [sales] })], 3373).revenueChange).toBe(18)
  })

  it('sans chiffre l’année précédente, pas de comparaison', () => {
    expect(yearSummary([date({ lines: [sales] })], 0).revenueChange).toBeNull()
  })
})

describe('bestMonth', () => {
  it('rend le mois du plus grand bénéfice', () => {
    expect(bestMonth([0, 0, 1800, 2600, 4100, 6900, 9400, 8300, 5200, 4100, 0, 0])).toBe(6)
  })
  it('sans bénéfice positif, aucun mois', () => {
    expect(bestMonth(Array<number>(12).fill(0))).toBeNull()
  })
})
```

- [ ] **Step 2 : vérifier qu'il échoue**

Run: `pnpm --filter web-v2 test -- reports`
Expected: FAIL — `Failed to resolve import "./reports"`.

- [ ] **Step 3 : écrire `lib/reports.ts`**

```ts
/**
 * QUOI     — la logique des bilans : quand un bilan est rempli, les chiffres d'une date, le
 *            résumé d'une année (bénéfice, chiffre d'affaires, frais, meilleure date, mois).
 * POURQUOI — Mes bilans, le bilan d'une date et le tableau de bord lisent la même règle.
 * ATTENTION — un bilan est REMPLI quand il a une ligne saisie dans le bilan (source 'manual') :
 *            la ligne de Mon dossier (source 'stepper') existe souvent avant la date, et la
 *            ligne event_reports aussi (set_stand_amount la crée). Ni l'une ni l'autre ne disent
 *            que l'exposant a fait son bilan.
 */
import { daysUntil } from './dates'
import { ledgerProfit, ledgerRevenue, type LedgerLine } from './money'

export interface ReportLine extends LedgerLine {
  source: string
}

/** Une date passée où l'acteur était inscrit, avec les lignes de son bilan. */
export interface ReportDate {
  eventId: string
  name: string
  imageUrl: string | null
  /** « Ménétrole (63) ». */
  place: string
  startDate: Date
  endDate: Date
  lines: ReportLine[]
}

export interface ReportFigures {
  filled: boolean
  revenue: number
  costs: number
  net: number
  days: number
}

export interface YearSummary {
  net: number
  revenue: number
  costs: number
  filledCount: number
  best: ReportDate | null
  bestNet: number
  bestDays: number
  /** Variation du chiffre d'affaires sur l'année précédente, en %. null sans point de comparaison. */
  revenueChange: number | null
  /** Bénéfice de chaque mois, de janvier (0) à décembre (11), au mois de DÉBUT de la date. */
  months: number[]
}

export function isFilled(lines: ReportLine[]): boolean {
  return lines.some((line) => line.source === 'manual')
}

export function reportFigures(date: ReportDate): ReportFigures {
  const revenue = ledgerRevenue(date.lines)
  const net = ledgerProfit(date.lines)
  return {
    filled: isFilled(date.lines),
    revenue,
    costs: revenue - net,
    net,
    days: daysUntil(date.endDate, date.startDate) + 1,
  }
}

export function yearSummary(dates: ReportDate[], previousYearRevenue: number | null): YearSummary {
  const months = Array<number>(12).fill(0)
  let net = 0
  let revenue = 0
  let filledCount = 0
  let best: ReportDate | null = null
  let bestNet = 0
  let bestDays = 0

  // Du plus récent au plus ancien : à égalité, la première trouvée — la plus récente — reste.
  const newestFirst = [...dates].sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  for (const date of newestFirst) {
    const figures = reportFigures(date)
    if (!figures.filled) continue
    filledCount += 1
    net += figures.net
    revenue += figures.revenue
    const month = date.startDate.getMonth()
    months[month] = (months[month] ?? 0) + figures.net
    if (best === null || figures.net > bestNet) {
      best = date
      bestNet = figures.net
      bestDays = figures.days
    }
  }

  const revenueChange =
    previousYearRevenue && previousYearRevenue > 0
      ? Math.round(((revenue - previousYearRevenue) / previousYearRevenue) * 100)
      : null

  return { net, revenue, costs: revenue - net, filledCount, best, bestNet, bestDays, revenueChange, months }
}

/** Le mois mis en avant dans le graphique : celui du plus grand bénéfice positif. */
export function bestMonth(months: number[]): number | null {
  let index: number | null = null
  months.forEach((value, month) => {
    if (value > 0 && (index === null || value > (months[index] ?? 0))) index = month
  })
  return index
}
```

- [ ] **Step 4 : vérifier que les tests passent**

Run: `pnpm --filter web-v2 test -- reports`
Expected: PASS, 13 tests.

- [ ] **Step 5 : commit**

```bash
git add apps/web-v2/src/lib/reports.ts apps/web-v2/src/lib/reports.test.ts
git commit -m "feat(v2): bilans — la logique d'un bilan rempli et du résumé de l'année"
```

---

### Task 2 : le tableau de bord reprend la règle et mène aux bilans

**Files:**
- Modify: `apps/web-v2/src/features/dashboard/useDashboard.ts` (`fetchReports`, ~l.178-245)
- Modify: `apps/web-v2/src/features/dashboard/ReportsSection.tsx`
- Modify: `apps/web-v2/src/styles/3-components/reports.css` (retirer `.reports__all` s'il devient mort)

**Interfaces:**
- Consumes: `isFilled`, `ReportLine` (tâche 1).
- Produces: les liens `/bilans` et `/bilans/:eventId`, que les tâches 3 et 5 servent.

- [ ] **Step 1 : `fetchReports` lit `source` et applique `isFilled`**

Dans la requête du registre, sélectionner `'event_id, amount, direction, source'`. Remplacer le calcul `filled` et les sommes de saison :

```ts
  const linesByEvent = ledgerRows.reduce((map, line) => {
    const list = map.get(line.event_id) ?? []
    list.push({ amount: line.amount, direction: line.direction, source: line.source })
    map.set(line.event_id, list)
    return map
  }, new Map<string, ReportLine[]>())

  const reports = past.map((event) => {
    const lines = linesByEvent.get(event.id) ?? []
    // La ligne de Mon dossier seule ne fait pas un bilan (lib/reports.ts).
    const filled = isFilled(lines)
    return {
      eventId: event.id,
      name: event.name,
      imageUrl: event.image_url,
      date: parseSqlDate(event.start_date),
      revenue: filled ? ledgerRevenue(lines) : null,
      net: filled ? ledgerProfit(lines) : null,
    }
  })

  // La saison ne compte que les bilans remplis : la place d'une date pas encore faite n'est pas
  // une perte de l'année.
  const filledLines = past.flatMap((event) => {
    const lines = linesByEvent.get(event.id) ?? []
    return isFilled(lines) ? lines : []
  })
  const seasonNet = filledLines.length > 0 ? ledgerProfit(filledLines) : null
  const seasonRevenue = filledLines.length > 0 ? ledgerRevenue(filledLines) : null
```

Import : `import { isFilled, type ReportLine } from '@/lib/reports'` ; retirer `type LedgerLine` de l'import de `money` s'il n'est plus utilisé. Supprimer le commentaire « Il n'existe pas d'écran d'historique… » et la phrase « Les années précédentes ne sont pas affichées… » de `fetchReports` : l'écran existe désormais.

- [ ] **Step 2 : `ReportsSection` mène à `/bilans`**

- `ReportItem` : `go(\`/bilans/${report.eventId}\`)` au lieu de la fiche.
- Le bouton « Tout voir » devient un lien de navigation vers `/bilans` (même classe `reports__more`, `onClick={() => go('/bilans')}`), affiché dès qu'il y a au moins un bilan ; retirer `useState`, `open`, `rest`, le bloc `reports__all`, et `aria-expanded`.
- En-tête du fichier : remplacer l'ATTENTION sur le dépliage par « Tout voir mène à Mes bilans (/bilans) ; un bilan mène à son écran (/bilans/:eventId). »
- `reports.css` : supprimer la règle `.reports__all` (code mort croisé).

- [ ] **Step 3 : vérifier**

Run: `pnpm --filter web-v2 lint && pnpm --filter web-v2 test`
Expected: PASS.

- [ ] **Step 4 : commit**

```bash
git add apps/web-v2/src/features/dashboard apps/web-v2/src/styles/3-components/reports.css
git commit -m "fix(v2): tableau de bord — la place seule ne remplit plus un bilan, « Tout voir » mène à Mes bilans"
```

---

### Task 3 : Mes bilans — `/bilans`

**Files:**
- Create: `apps/web-v2/src/features/reports/README.md`
- Create: `apps/web-v2/src/features/reports/useReports.ts`
- Create: `apps/web-v2/src/features/reports/ReportsPage.tsx`
- Create: `apps/web-v2/src/features/reports/YearCard.tsx`
- Create: `apps/web-v2/src/features/reports/MonthlyChart.tsx`
- Create: `apps/web-v2/src/features/reports/ReportsTable.tsx`
- Create: `apps/web-v2/src/styles/3-components/reports-page.css` (et l'importer là où les autres le sont : `styles/index.css`)
- Modify: `apps/web-v2/src/App.tsx` (route `/bilans`, au-dessus de `/:slug`)

**Interfaces:**
- Consumes: `ReportDate`, `reportFigures`, `yearSummary`, `bestMonth` (tâche 1) ; `formatEuros`, `formatSignedEuros` ; `parseSqlDate`, `formatDayMonthShort`, `formatMonthAbbr` ; `CONFIRMED_STATUSES` (`lib/friends.ts`) ; `useAuth` ; `useDeclarePageChrome` ; `useTransitionNavigate`.
- Produces: `useReports(actorId: string | null | undefined, year: number): ReportsState`.

- [ ] **Step 1 : le hook `useReports`**

```ts
/**
 * QUOI     — charge les bilans d'une année pour l'acteur actif : ses dates passées où il était
 *            inscrit, leurs lignes de registre, les années disponibles et le chiffre d'affaires
 *            de l'année précédente.
 * POURQUOI — l'écran Mes bilans lit tout d'un coup, puis lib/reports.ts calcule.
 * ATTENTION — patron de chargement de .claude/rules/v2.md : une fonction async qui rend l'état,
 *            appliqué une fois. Une requête qui échoue est une erreur, jamais « aucun bilan ».
 */
import { useEffect, useState } from 'react'
import { must, supabase } from '@/lib/supabase'
import { parseSqlDate, todayIso } from '@/lib/dates'
import { CONFIRMED_STATUSES } from '@/lib/friends'
import { isFilled, reportFigures, type ReportDate, type ReportLine } from '@/lib/reports'

export interface ReportsState {
  status: 'loading' | 'ready' | 'error'
  /** Les années qui ont au moins une date passée inscrite, la plus récente d'abord. */
  years: number[]
  dates: ReportDate[]
  previousYearRevenue: number | null
}

async function loadReports(actorId: string, year: number): Promise<Omit<ReportsState, 'status'>> {
  const today = todayIso()
  const rows = must(
    await supabase
      .from('participations')
      .select('event_id, events!inner(id, name, image_url, city, department, start_date, end_date)')
      .eq('actor_id', actorId)
      .in('status', CONFIRMED_STATUSES)
      .lt('events.end_date', today),
  )
  const events = rows.map((row) => row.events)
  const years = [...new Set(events.map((event) => parseSqlDate(event.start_date).getFullYear()))].sort(
    (a, b) => b - a,
  )
  const inYear = (y: number) => events.filter((e) => parseSqlDate(e.start_date).getFullYear() === y)
  const wanted = [...inYear(year), ...inYear(year - 1)]

  const ledger =
    wanted.length === 0
      ? []
      : must(
          await supabase
            .from('event_ledger_entries')
            .select('event_id, amount, direction, source')
            .eq('actor_id', actorId)
            .in('event_id', wanted.map((event) => event.id)),
        )
  const linesByEvent = new Map<string, ReportLine[]>()
  for (const line of ledger) {
    const list = linesByEvent.get(line.event_id) ?? []
    list.push({ amount: line.amount, direction: line.direction, source: line.source })
    linesByEvent.set(line.event_id, list)
  }

  const toDate = (event: (typeof events)[number]): ReportDate => ({
    eventId: event.id,
    name: event.name,
    imageUrl: event.image_url,
    place: `${event.city} (${event.department})`,
    startDate: parseSqlDate(event.start_date),
    endDate: parseSqlDate(event.end_date),
    lines: linesByEvent.get(event.id) ?? [],
  })

  const dates = inYear(year)
    .map(toDate)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  const previous = inYear(year - 1).map(toDate).filter((d) => isFilled(d.lines))
  const previousYearRevenue =
    previous.length > 0 ? previous.reduce((sum, d) => sum + reportFigures(d).revenue, 0) : null

  return { years, dates, previousYearRevenue }
}

export function useReports(actorId: string | null | undefined, year: number): ReportsState {
  const [state, setState] = useState<ReportsState>({
    status: 'loading',
    years: [],
    dates: [],
    previousYearRevenue: null,
  })

  useEffect(() => {
    if (!actorId) return
    let cancelled = false
    async function run(currentActor: string) {
      setState((s) => ({ ...s, status: 'loading' }))
      try {
        const result = await loadReports(currentActor, year)
        if (cancelled) return
        setState({ status: 'ready', ...result })
      } catch {
        if (cancelled) return
        setState({ status: 'error', years: [], dates: [], previousYearRevenue: null })
      }
    }
    void run(actorId)
    return () => {
      cancelled = true
    }
  }, [actorId, year])

  return state
}
```

Note : si `setState` en tête d'effet déclenche l'avertissement de rendu en cascade d'ESLint, reprendre exactement la forme de `useDashboard.ts` (même ligne `setState((s) => ({ ...s, loading: true… }))` dans `run`).

- [ ] **Step 2 : la page et ses blocs**

`ReportsPage.tsx` :
- lit `annee` dans `useSearchParams` (`Number(params.get('annee'))`, l'année en cours si absent ou non entier) ; le sélecteur d'années est le composant `Segmented` existant (`components/ui/Segmented.tsx`) sur `state.years`, qui écrit `?annee=` avec `setSearchParams({ annee: String(y) }, { replace: true })` ;
- `useDeclarePageChrome({ poster: null, lead: null, back: '/' })` ;
- titre « Mes bilans », ligne cadenas « Visibles par toi seul — aucun administrateur n'y a accès » (mobile : « Visibles par toi seul », par une classe qui masque la fin sous 760 px) ;
- `status === 'error'` → « Tes bilans n'ont pas pu être chargés. » ; `dates` vide → « Aucune date en {year}. » ;
- sinon `<YearCard summary={yearSummary(dates, previousYearRevenue)} year={year} />`, `<MonthlyChart months={summary.months} />`, `<ReportsTable dates={dates} />`.

`YearCard.tsx` : « Bénéfice {year} », `formatSignedEuros(net)` en serif dans la terre, « sur {filledCount} dates » ; chiffre d'affaires `formatEuros(revenue)` et, si `revenueChange !== null`, « {+18 %} sur {year−1} » (signe explicite) ; frais `formatEuros(costs)` « emplacements, route, nuits » ; meilleure date `best.name` et « {formatSignedEuros(bestNet)} en {bestDays} jours » (bloc absent si `best === null`). Sur mobile, les trois derniers blocs deviennent des lignes libellé / valeur (`2158:2`).

`MonthlyChart.tsx` : douze barres de hauteur `--bar: value / max` (variable CSS, jamais de style inline autre), libellé « 9,4 k » au-dessus si `value > 0` (`(value / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' k'`), le mois `bestMonth` dans `--brand-gradient`, mois vides en `--surface-bar-empty`. Sur mobile, libellés des mois réduits à l'initiale et valeurs masquées.

`ReportsTable.tsx` : cinq dates, puis « Voir les N autres dates » qui déplie (état local, transition d'apparition). Chaque ligne est un bouton vers `/bilans/${eventId}` : affiche (ou case vide), nom, `formatDayMonthShort(startDate)` · `place` ; puis CA, frais, bénéfice (`formatSignedEuros`, la terre pour la meilleure date) ; bilan non rempli → « ● Remplir le bilan → » à la place des trois montants. Mobile : bénéfice seul, texte coupé par `text-overflow: ellipsis`.

- [ ] **Step 3 : la route**

Dans `App.tsx`, au-dessus du motif `/:slug`, avec le même habillage que les autres :

```tsx
      <Route
        path="/bilans"
        element={
          <ProtectedRoute>
            <AppShell>
              <ReportsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
```

Mettre à jour l'en-tête QUOI d'`App.tsx` (« … vitrine, bilans »).

- [ ] **Step 4 : les styles**

Relever les valeurs exactes des cadres `2078:2` et `2158:2` avec `get_design_context` (skill `figma:figma-design-to-code`), écrire `reports-page.css` avec les jetons de `2-semantic.css` ; une couleur absente s'ajoute à `1-primitives.css` puis prend son sens dans `2-semantic.css`. `README.md` du dossier `features/reports/` : une ligne par fichier.

- [ ] **Step 5 : vérifier**

Run: `pnpm --filter web-v2 lint && pnpm --filter web-v2 test && pnpm --filter web-v2 build`
Expected: PASS. Puis `pnpm dev:v2`, ouvrir `/v2/bilans` connecté en admin, comparer à `2078:2` (fenêtre large) et `2158:2` (≤ 760 px) écart par écart.

- [ ] **Step 6 : commit**

```bash
git add apps/web-v2/src/features/reports apps/web-v2/src/styles apps/web-v2/src/App.tsx
git commit -m "feat(v2): Mes bilans — l'année, le bénéfice par mois et les dates"
```

---

### Task 4 : `useReport` — charger et écrire un bilan

**Files:**
- Create: `apps/web-v2/src/lib/report-media.ts`
- Create: `apps/web-v2/src/lib/report-writes.ts`
- Test: `apps/web-v2/src/lib/report-writes.test.ts`
- Create: `apps/web-v2/src/features/reports/useReport.ts`

**Interfaces:**
- Consumes: `ReportDate`, `ReportLine` (tâche 1) ; `parseAmount`.
- Produces:
  ```ts
  // lib/report-writes.ts — pure
  export const CATEGORIES: readonly { value: LedgerCategory; label: string; direction: 'in' | 'out' }[]
  export function directionOf(category: LedgerCategory): 'in' | 'out'
  export function clearReportPlan(reportId: string): { deleteLines: { report_id: string; source: 'manual' }; resetReport: { wins: string[]; improvements: string[]; note: null; media_paths: string[] } }
  export function addTag(tags: string[], raw: string): string[]
  // lib/report-media.ts
  export function reportPhotoPath(actorId: string, eventId: string, id: string, ext: string): string
  export async function uploadReportPhoto(file: File, actorId: string, eventId: string): Promise<string>
  export async function signedReportUrls(paths: string[]): Promise<Map<string, string>>
  export async function removeReportPhotos(paths: string[]): Promise<void>
  // features/reports/useReport.ts
  export interface ReportEntry { id: string; amount: number; direction: 'in' | 'out'; category: LedgerCategory; source: 'manual' | 'stepper' }
  export interface ReportDetail { date: ReportDate; reportId: string | null; entries: ReportEntry[]; wins: string[]; improvements: string[]; note: string; photos: { path: string; url: string }[]; revenueGoal: number | null }
  export function useReport(eventId: string | undefined, actorId: string | null | undefined): { status: 'loading' | 'ready' | 'error' | 'missing'; detail: ReportDetail | null; saving: boolean; writeError: string | null; actions: ReportActions }
  export interface ReportActions { addLine(category: LedgerCategory, amount: number): Promise<void>; setAmount(entry: ReportEntry, amount: number): Promise<void>; removeLine(entry: ReportEntry): Promise<void>; setTags(field: 'wins' | 'improvements', tags: string[]): Promise<void>; setNote(note: string): Promise<void>; addPhoto(file: File): Promise<void>; removePhoto(path: string): Promise<void>; clear(): Promise<void> }
  ```

- [ ] **Step 1 : tests de `lib/report-writes.ts`**

```ts
/**
 * QUOI     — tests de lib/report-writes.ts : sens d'une catégorie, étiquettes, effacement d'un bilan.
 * POURQUOI — l'effacement ne doit jamais toucher au prix de Mon dossier.
 */
import { describe, expect, it } from 'vitest'
import { addTag, clearReportPlan, directionOf } from './report-writes'
import { reportPhotoPath } from './report-media'

describe('directionOf', () => {
  it('les ventes, le cachet et un remboursement entrent', () => {
    expect(directionOf('ventes')).toBe('in')
    expect(directionOf('cachet')).toBe('in')
    expect(directionOf('remboursement')).toBe('in')
  })
  it('le reste sort', () => {
    expect(directionOf('essence')).toBe('out')
    expect(directionOf('autre')).toBe('out')
  })
})

describe('clearReportPlan', () => {
  it('ne vise que les lignes saisies dans le bilan, et garde la ligne event_reports', () => {
    const plan = clearReportPlan('r1')
    expect(plan.deleteLines).toEqual({ report_id: 'r1', source: 'manual' })
    expect(plan.resetReport).toEqual({ wins: [], improvements: [], note: null, media_paths: [] })
  })
})

describe('addTag', () => {
  it('ajoute une étiquette nettoyée', () => {
    expect(addTag(['Stand en angle'], '  Public familial ')).toEqual(['Stand en angle', 'Public familial'])
  })
  it('ignore le vide et les doublons, sans regarder la casse', () => {
    expect(addTag(['Stand en angle'], '   ')).toEqual(['Stand en angle'])
    expect(addTag(['Stand en angle'], 'stand EN angle')).toEqual(['Stand en angle'])
  })
})

describe('reportPhotoPath', () => {
  it('range la photo sous l’acteur puis l’événement — la policy du bucket lit le premier dossier', () => {
    expect(reportPhotoPath('a1', 'e1', 'u1', 'webp')).toBe('a1/e1/u1.webp')
  })
})
```

- [ ] **Step 2 : vérifier qu'ils échouent**

Run: `pnpm --filter web-v2 test -- report-writes`
Expected: FAIL — imports introuvables.

- [ ] **Step 3 : `lib/report-writes.ts`**

```ts
/**
 * QUOI     — les règles d'écriture d'un bilan : sens de chaque catégorie, ajout d'une étiquette,
 *            ce que « Supprimer ce bilan » efface.
 * POURQUOI — logique pure, testée seule ; le hook useReport ne fait qu'appliquer.
 * ATTENTION — « Supprimer ce bilan » ne supprime JAMAIS la ligne event_reports : la cascade
 *            emporterait la ligne « stepper », le prix de la place saisi dans Mon dossier.
 */
import type { LedgerCategory } from '@/types/database'

export const CATEGORIES = [
  { value: 'ventes', label: 'Ventes', direction: 'in' },
  { value: 'remboursement', label: 'Remboursement', direction: 'in' },
  { value: 'cachet', label: 'Cachet', direction: 'in' },
  { value: 'emplacement', label: 'Emplacement', direction: 'out' },
  { value: 'essence', label: 'Essence', direction: 'out' },
  { value: 'peage', label: 'Péage', direction: 'out' },
  { value: 'hebergement', label: 'Hébergement', direction: 'out' },
  { value: 'repas', label: 'Repas', direction: 'out' },
  { value: 'autre', label: 'Autre', direction: 'out' },
] as const satisfies readonly { value: LedgerCategory; label: string; direction: 'in' | 'out' }[]

export function directionOf(category: LedgerCategory): 'in' | 'out' {
  return CATEGORIES.find((c) => c.value === category)?.direction ?? 'out'
}

export function clearReportPlan(reportId: string) {
  return {
    deleteLines: { report_id: reportId, source: 'manual' as const },
    resetReport: { wins: [] as string[], improvements: [] as string[], note: null, media_paths: [] as string[] },
  }
}

export function addTag(tags: string[], raw: string): string[] {
  const tag = raw.trim()
  if (tag === '') return tags
  const exists = tags.some((t) => t.toLocaleLowerCase('fr') === tag.toLocaleLowerCase('fr'))
  return exists ? tags : [...tags, tag]
}
```

Vérifier que `LedgerCategory` est bien exporté par `types/database.ts` ; sinon le dériver : `Database['public']['Tables']['event_ledger_entries']['Row']['category']` n'est qu'un `string` (contrainte CHECK) — dans ce cas déclarer dans `types/database.ts` `export type LedgerCategory = 'emplacement' | 'cachet' | 'essence' | 'peage' | 'hebergement' | 'repas' | 'remboursement' | 'ventes' | 'autre'` (la liste du CHECK de `20260613120000_event_ledger.sql`).

- [ ] **Step 4 : `lib/report-media.ts`**

```ts
/**
 * QUOI     — les photos souvenir d'un bilan : chemin, envoi compressé, adresses signées, retrait.
 * POURQUOI — le bucket bilan-media est PRIVÉ : on lit par URL signée, et la policy
 *            (bilan_media_*_own) n'ouvre un fichier qu'à l'acteur du premier dossier du chemin.
 * ATTENTION — la compression passe par le navigateur (createImageBitmap + canvas) : rien à tester
 *            ici hors du chemin.
 */
import { supabase } from './supabase'

const BUCKET = 'bilan-media'
const SIGNED_TTL = 3600
const MAX_SIDE = 1600

export function reportPhotoPath(actorId: string, eventId: string, id: string, ext: string): string {
  return `${actorId}/${eventId}/${id}.${ext}`
}

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('compression'))), 'image/webp', 0.82)
  })
}

export async function uploadReportPhoto(file: File, actorId: string, eventId: string): Promise<string> {
  const blob = await compress(file)
  const path = reportPhotoPath(actorId, eventId, crypto.randomUUID(), 'webp')
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw error
  return path
}

export async function signedReportUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL)
  if (error) throw error
  for (const item of data) if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  return urls
}

export async function removeReportPhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
}
```

- [ ] **Step 5 : vérifier que les tests passent**

Run: `pnpm --filter web-v2 test -- report-writes`
Expected: PASS, 6 tests.

- [ ] **Step 6 : `features/reports/useReport.ts`**

Chargement (fonction `loadReport(eventId, actorId)`, patron de `useReports`) :
1. la participation de l'acteur à l'événement, au statut `CONFIRMED_STATUSES`, avec `events!inner(id, name, image_url, city, department, start_date, end_date)` — `.maybeSingle()` ; absente ou date pas encore passée → `status: 'missing'` (l'écran renvoie vers `/bilans`). Séparer `const response = await …maybeSingle()` puis `must(response)` (piège `never` de `.claude/rules/v2.md`).
2. en parallèle : `event_reports` (`id, wins, improvements, note, media_paths`) par `actor_id` + `event_id` (`.maybeSingle()`) ; `event_ledger_entries` (`id, amount, direction, category, source`) par `actor_id` + `event_id`, **triées** `.order('created_at')` ; `participation_dossiers` (`revenue_goal`) par `actor_id` + `event_id` (`.maybeSingle()`).
3. `signedReportUrls(media_paths)` → `photos`.

Écritures (chacune : `saving = true`, `writeError = null`, puis rechargement de `entries` / du rapport ; en cas d'échec, `writeError` = la phrase ci-dessous et l'état reste celui d'avant) :
- `ensureReport()` (interne) : si `reportId` est null, `insert({ actor_id, event_id })` puis relire l'`id` ; un conflit d'unicité (`23505`) relit l'existant. Toute écriture autre que la ligne stepper commence par là.
- `addLine(category, amount)` : `insert({ report_id, actor_id, event_id, amount, direction: directionOf(category), category, source: 'manual', label: null })`. Erreur : « La ligne n'a pas pu être ajoutée. »
- `setAmount(entry, amount)` : ligne `stepper` → `rpc('set_stand_amount', …)` ; sinon `update({ amount }).eq('id', entry.id)`. Erreur : « Le montant n'a pas pu être enregistré. »
- `removeLine(entry)` : ligne `stepper` → `set_stand_amount` à 0 ; sinon `delete().eq('id', entry.id)`. Erreur : « La ligne n'a pas pu être retirée. »
- `setTags(field, tags)` / `setNote(note)` : `update({ [field]: tags })` / `update({ note: note.trim() === '' ? null : note })` sur `event_reports`. Erreur : « Ce changement n'a pas pu être enregistré. »
- `addPhoto(file)` : `uploadReportPhoto` puis `update({ media_paths: [...paths, path] })` ; si la mise à jour échoue, `removeReportPhotos([path])`. Erreur : « La photo n'a pas pu être ajoutée. »
- `removePhoto(path)` : `update({ media_paths: sans path })` puis `removeReportPhotos([path])`. Erreur : « La photo n'a pas pu être retirée. »
- `clear()` : `const plan = clearReportPlan(reportId)` ; `delete().match(plan.deleteLines)` sur `event_ledger_entries` ; `update(plan.resetReport)` sur `event_reports` ; `removeReportPhotos(anciens paths)`. Erreur : « Le bilan n'a pas pu être effacé. »

Toutes les écritures filtrent aussi par `actor_id` de l'acteur courant, et le hook ignore un résultat arrivé après un changement d'`actorId` ou d'`eventId`. Le fichier reste sous 400 lignes ; s'il les dépasse, sortir les écritures dans `features/reports/reportActions.ts`.

- [ ] **Step 7 : vérifier**

Run: `pnpm --filter web-v2 lint && pnpm --filter web-v2 test`
Expected: PASS.

- [ ] **Step 8 : commit**

```bash
git add apps/web-v2/src/lib/report-media.ts apps/web-v2/src/lib/report-writes.ts apps/web-v2/src/lib/report-writes.test.ts apps/web-v2/src/features/reports/useReport.ts apps/web-v2/src/types/database.ts
git commit -m "feat(v2): bilan d'une date — lecture et écritures, sans jamais toucher au prix de Mon dossier"
```

---

### Task 5 : Bilan d'une date — `/bilans/:eventId`

**Files:**
- Create: `apps/web-v2/src/features/reports/ReportPage.tsx`
- Create: `apps/web-v2/src/features/reports/ReportSummary.tsx`
- Create: `apps/web-v2/src/features/reports/Ledger.tsx`
- Create: `apps/web-v2/src/features/reports/TagList.tsx`
- Create: `apps/web-v2/src/features/reports/ReportNote.tsx`
- Create: `apps/web-v2/src/features/reports/ReportPhotos.tsx`
- Create: `apps/web-v2/src/features/reports/ClearReport.tsx`
- Create: `apps/web-v2/src/styles/3-components/report-page.css`
- Modify: `apps/web-v2/src/App.tsx` (route `/bilans/:eventId`)
- Modify: `apps/web-v2/src/features/reports/README.md`

**Interfaces:**
- Consumes: `useReport`, `ReportActions`, `ReportEntry` (tâche 4) ; `CATEGORIES` ; `reportFigures` ; `goalShare`, `parseAmount`, `formatEuros`, `formatSignedEuros` ; `formatDateRange`, `durationLabel` ; `Select`, `Field`, `Button`, `Chip` de `components/ui/`.

- [ ] **Step 1 : la page**

`ReportPage.tsx` : `useParams<{ eventId: string }>()`, `useAuth().actor?.id`, `useReport`. `useDeclarePageChrome({ poster: null, lead: null, back: '/bilans' })`. `missing` → `<Navigate to="/bilans" replace />` ; `error` → « Ce bilan n'a pas pu être chargé. ». Mise en page de `2080:2` : colonne principale (en-tête, `Ledger`, deux `TagList`, `ReportNote`, `ReportPhotos`) et colonne de droite (`ReportSummary`, carte « Et pour les autres exposants ? » vers `/evenement/${eventId}/avis`, `ClearReport`). Sous 760 px, une colonne, le résumé en tête juste après l'en-tête (`2157:2`). `writeError` s'affiche sous le bloc qui l'a provoqué (`role="status"`).

En-tête : « Bilan », nom (serif), `formatDateRange(start, end, 'long')` · `place` · `durationLabel(start, end)`, cadenas « Visible par toi seul — aucun administrateur n'y a accès » (mobile : « Visible par toi seul »).

- [ ] **Step 2 : les blocs**

- `ReportSummary` : « Bénéfice », `formatSignedEuros(net)` en serif dans la terre ; si `revenueGoal` : bloc objectif (« Objectif {formatEuros(goal)} », `+{percent − 100} %` ou `{percent} %`, jauge `--gauge: ratio`, « Réalisé {formatEuros(revenue)} — objectif dépassé » si `percent >= 100`, sinon « Réalisé {…} sur {…} ») ; lignes Chiffre d'affaires, Frais, Bénéfice par jour (`formatSignedEuros(net / days)`) ; « ✓ Enregistré automatiquement » (ou « Enregistrement… » tant que `saving`). Ordinateur : la mini-affiche et le nom en tête ; mobile : sans.
- `Ledger` : deux groupes « Recettes » et « Dépenses » avec leur total ; une ligne = icône de catégorie (lucide : `ShoppingBag` ventes, `Undo2` remboursement, `HandCoins` cachet, `Tent` emplacement, `Fuel` essence, `Milestone` péage, `BedDouble` hébergement, `Utensils` repas, `Circle` autre — à confirmer contre les icônes de la maquette avec `get_design_context`), libellé de la catégorie, pastille « depuis la fiche » si `source === 'stepper'`, montant signé modifiable sur place (`DraftInput` existant, validé par `parseAmount` : `'invalide'` → message « Ce montant n'est pas valide. », rien n'est envoyé ; `null` → `removeLine`), bouton de retrait au survol. Ligne d'ajout : `Select` des `CATEGORIES` (défaut « Autre »), champ Montant, bouton « Ajouter » (désactivé si le montant n'est pas un nombre > 0). Mobile : catégorie sur toute la largeur, montant et bouton dessous.
- `TagList` (`title`, `tags`, `onChange`) : une `Chip` par étiquette avec une croix, « + Ajouter » ouvre un champ ; Entrée ou sortie du champ → `onChange(addTag(tags, valeur))`.
- `ReportNote` : `textarea` à l'état local, `onBlur` → `setNote` si la valeur a changé.
- `ReportPhotos` : grille (4 colonnes ordinateur, 2 mobile), chaque photo avec un bouton de retrait, une case « + Ajouter » qui ouvre un `input type="file" accept="image/*"`. « privées » à côté du titre.
- `ClearReport` : « Supprimer ce bilan » → remplace le lien par « Confirmer la suppression » et « Annuler » (transition) ; confirmer → `clear()`.

- [ ] **Step 3 : la route**

Dans `App.tsx`, sous `/bilans` :

```tsx
      <Route
        path="/bilans/:eventId"
        element={
          <ProtectedRoute>
            <AppShell>
              <ReportPage />
            </AppShell>
          </ProtectedRoute>
        }
      />
```

- [ ] **Step 4 : les styles**

`report-page.css` d'après `get_design_context` sur `2080:2` et `2157:2`, jetons uniquement ; apparitions et retraits de lignes, d'étiquettes et de photos animés (`@starting-style` pour l'arrivée), `prefers-reduced-motion` à zéro.

- [ ] **Step 5 : vérifier**

Run: `pnpm --filter web-v2 lint && pnpm --filter web-v2 test && pnpm --filter web-v2 build`
Expected: PASS. Puis `pnpm dev:v2`, ouvrir un bilan depuis `/v2/bilans` **sans rien modifier**, comparer à `2080:2` et `2157:2`.

- [ ] **Step 6 : commit**

```bash
git add apps/web-v2/src/features/reports apps/web-v2/src/styles apps/web-v2/src/App.tsx
git commit -m "feat(v2): bilan d'une date — registre, étiquettes, note, photos et résumé"
```

---

### Task 6 : déployer et cocher

**Files:**
- Modify: `docs/superpowers/plans/2026-10-07-v2-2027-plan-directeur.md` (lot 7 : « 7a ☑ »)
- Modify: `docs/v2/maquettes-2027.md` (lignes Mes bilans / Bilan d'une date : mobile dessiné et intégré)
- Modify: `apps/web-v2/package.json` (`version` : mineure suivante)

- [ ] **Step 1 :** lire `.claude/rules/deploiement.md`, puis déployer la V2 selon ce fichier (build, déploiement manuel depuis le dossier de l'app).
- [ ] **Step 2 :** sur `flw.sh/v2/bilans` dans le navigateur d'Uriel, **en lecture seule** : l'année, les mois, les dates, un bilan ouvert ; fenêtre étroite pour le mobile. Noter chaque écart avec la maquette et le corriger avant de cocher.
- [ ] **Step 3 :** cocher le plan directeur et le carnet des maquettes ; commit `docs(v2): lot 7a livré — Mes bilans et Bilan d'une date` ; `git push origin main`.
- [ ] **Step 4 :** demander à Uriel de tester les écritures sur son propre compte (ajouter une ligne, une étiquette, une photo, supprimer le bilan d'une date dont la place est saisie et vérifier que Mon dossier garde le montant).
