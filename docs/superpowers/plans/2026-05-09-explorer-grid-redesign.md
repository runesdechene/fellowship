# Explorer Grid Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two horizontal `<SlideRow>` sections in the Explorer (`Bientôt`, `Ajoutés récemment`) with a single responsive vertical grid controlled by a 3-mode segmented control (Bientôt / Récents / Tous).

**Architecture:** Pure function `applyViewMode(events, mode, now)` extracted to `src/lib/explorer.ts` for testability. The Explorer page composes existing filters (tags / months / dept) with the new mode filter+sort. CSS uses `repeat(auto-fill, minmax(180px, 1fr))` for fluid responsive grid (no media queries).

**Tech Stack:** React 19 + TypeScript 5.9 strict, Vitest for the pure function test, existing localStorage pattern for mode persistence.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/lib/explorer.ts` | Create | Pure function `applyViewMode` + `ViewMode` type + `VIEW_MODES` const |
| `src/lib/explorer.test.ts` | Create | Vitest unit tests for `applyViewMode` (4 cases) |
| `src/pages/Explorer.tsx` | Modify | Drop SlideRow imports, add mode state + segmented control + grid + empty state |
| `src/pages/Explorer.css` | Modify | Add `.explorer-grid` and `.explorer-mode-segmented*` rules |
| `package.json` | Modify | Bump version `0.7.2` → `0.7.3` |
| `src/changelog.ts` | Modify | Add `0.7.3` entry visible in the in-app changelog modal |

`SlideRow.tsx` and `SlideRow.css` are **not** deleted — they remain available for future reuse (embed widget, public profile, etc.).

---

## Task 1: TDD `applyViewMode` pure function

**Files:**
- Create: `src/lib/explorer.ts`
- Create: `src/lib/explorer.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `src/lib/explorer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { applyViewMode } from './explorer'
import type { EventWithScore } from '@/types/database'

const NOW = new Date('2026-05-09T12:00:00Z')

const past = {
  id: '1',
  name: 'Past',
  start_date: '2026-01-01',
  created_at: '2026-04-01T00:00:00Z',
} as unknown as EventWithScore

const future = {
  id: '2',
  name: 'Future',
  start_date: '2026-08-01',
  created_at: '2026-04-15T00:00:00Z',
} as unknown as EventWithScore

const futureLater = {
  id: '3',
  name: 'Future Later',
  start_date: '2026-12-01',
  created_at: '2026-05-01T00:00:00Z',
} as unknown as EventWithScore

describe('applyViewMode', () => {
  it('mode=upcoming filters out past events and preserves caller order', () => {
    const result = applyViewMode([past, future, futureLater], 'upcoming', NOW)
    expect(result.map(e => e.id)).toEqual(['2', '3'])
  })

  it('mode=recent returns all events sorted by created_at descending', () => {
    const result = applyViewMode([past, future, futureLater], 'recent', NOW)
    expect(result.map(e => e.id)).toEqual(['3', '2', '1'])
  })

  it('mode=all returns events untouched (caller-provided order preserved)', () => {
    const result = applyViewMode([past, future, futureLater], 'all', NOW)
    expect(result.map(e => e.id)).toEqual(['1', '2', '3'])
  })

  it('returns an empty array for empty input regardless of mode', () => {
    expect(applyViewMode([], 'upcoming', NOW)).toEqual([])
    expect(applyViewMode([], 'recent', NOW)).toEqual([])
    expect(applyViewMode([], 'all', NOW)).toEqual([])
  })
})
```

- [ ] **Step 1.2: Run the tests to confirm they fail**

Run: `pnpm test src/lib/explorer.test.ts`
Expected: FAIL — `Cannot find module './explorer'` or similar (file doesn't exist yet).

- [ ] **Step 1.3: Implement `applyViewMode` minimally**

Create `src/lib/explorer.ts`:

```typescript
import type { EventWithScore } from '@/types/database'

export const VIEW_MODES = ['upcoming', 'recent', 'all'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

export function applyViewMode(
  events: EventWithScore[],
  mode: ViewMode,
  now: Date,
): EventWithScore[] {
  if (mode === 'upcoming') {
    return events.filter(ev => new Date(ev.start_date) >= now)
  }
  if (mode === 'recent') {
    return [...events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }
  return events
}
```

- [ ] **Step 1.4: Run the tests to confirm they pass**

Run: `pnpm test src/lib/explorer.test.ts`
Expected: PASS — `Tests  4 passed (4)`.

- [ ] **Step 1.5: Run the full lint/build/test trio**

Run: `pnpm lint && pnpm build && pnpm test`
Expected: all three commands succeed (no errors, no warnings).

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/explorer.ts src/lib/explorer.test.ts
git commit -m "$(cat <<'EOF'
feat(explorer): add applyViewMode pure function — upcoming/recent/all modes

Extracted view-mode filter+sort logic as a pure function for testability.
Four unit tests cover each mode + empty input.

Used by the upcoming Explorer grid redesign (replaces inline filtering of
upcomingEvents/recentEvents in Explorer.tsx).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add CSS for grid + segmented control

**Files:**
- Modify: `src/pages/Explorer.css` (append new rules at end of file, before `/* ── Add event card ── */` comment if it still exists, otherwise at the end)

- [ ] **Step 2.1: Append the new CSS rules to Explorer.css**

Add at the end of `src/pages/Explorer.css`:

```css
/* ── Mode segmented control ───────────────────────────────────────── */

.explorer-mode-segmented {
  display: inline-flex;
  align-items: center;
  background: hsl(var(--card));
  border-radius: 9999px;
  padding: 4px;
  margin: 0 var(--page-padding) 18px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
}

.explorer-mode-btn {
  padding: 8px 16px;
  border-radius: 9999px;
  background: transparent;
  color: rgba(61, 48, 40, 0.5);
  border: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
  font: inherit;
}

.explorer-mode-btn:hover:not(.active) {
  color: rgba(61, 48, 40, 0.85);
}

.explorer-mode-btn.active {
  background: hsl(var(--primary));
  color: white;
}

/* ── Events grid (responsive auto-fill) ────────────────────────────── */

.explorer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 0 var(--page-padding);
}

.explorer-grid-skeleton {
  aspect-ratio: 2 / 3;
  border-radius: 14px;
  background: hsl(var(--card));
}
```

The pulse animation comes from Tailwind's `animate-pulse` class added in the JSX (Task 3) — no custom keyframe needed.

- [ ] **Step 2.2: Verify CSS parses (no syntax errors)**

Run: `pnpm build`
Expected: Vite build succeeds. CSS is bundled into the final stylesheet.

---

## Task 3: Refactor Explorer.tsx — replace SlideRows with grid + mode pills

**Files:**
- Modify: `src/pages/Explorer.tsx`

- [ ] **Step 3.1: Replace the file's content with the new implementation**

Overwrite `src/pages/Explorer.tsx` with:

```tsx
import { useState, useMemo, useCallback } from 'react'
import { Search } from 'lucide-react'
import { useEvents } from '@/hooks/use-events'
import { useAuth } from '@/lib/auth'
import { EventCard } from '@/components/events/EventCard'
import { useTags } from '@/hooks/use-tags'
import { getTagIcon } from '@/components/ui/TagBadge'
import { MonthPicker } from '@/components/ui/MonthPicker'
import { applyViewMode, VIEW_MODES, type ViewMode } from '@/lib/explorer'
import './Explorer.css'

const MODE_LABELS: Record<ViewMode, string> = {
  upcoming: 'Bientôt',
  recent: 'Récents',
  all: 'Tous',
}

export function ExplorerPage() {
  const { profile } = useAuth()
  const { events: allEvents, loading } = useEvents()
  const { tags: dynamicTags } = useTags()

  // Persist filters in localStorage
  const stored = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('explorer-filters') ?? '{}') } catch { return {} }
  }, [])
  const persist = useCallback((patch: Record<string, unknown>) => {
    try {
      const cur = JSON.parse(localStorage.getItem('explorer-filters') ?? '{}')
      localStorage.setItem('explorer-filters', JSON.stringify({ ...cur, ...patch }))
    } catch { /* ignore */ }
  }, [])

  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set(stored.tags ?? []))
  const [filterDept, setFilterDept] = useState(() => stored.dept === true)
  const [mode, setMode] = useState<ViewMode>(() =>
    (VIEW_MODES as readonly string[]).includes(stored.mode) ? stored.mode : 'upcoming'
  )

  // Month pickers
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const d = new Date(currentYear, currentMonth + i)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    }
  })
  const validMonths = new Set(monthOptions.map(o => o.value))
  const [monthFrom, setMonthFrom] = useState(() => validMonths.has(stored.monthFrom) ? stored.monthFrom : monthOptions[0].value)
  const monthOptionsTo = [...monthOptions.filter(o => o.value > monthFrom), { value: '9999-12', label: 'la fin des temps' }]
  const [monthTo, setMonthTo] = useState(() => stored.monthTo === '9999-12' || validMonths.has(stored.monthTo) ? stored.monthTo : '9999-12')

  const now = useMemo(() => new Date(), [])

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      persist({ tags: [...next] })
      return next
    })
  }

  const changeMode = (next: ViewMode) => {
    setMode(next)
    persist({ mode: next })
  }

  // ---------- filtered events (tags / dept / month range) ----------
  const filteredEvents = useMemo(() => {
    let result = allEvents

    if (selectedTags.size > 0) {
      result = result.filter(ev => ev.tags?.some(t => selectedTags.has(t)))
    }

    if (filterDept && profile?.department) {
      result = result.filter(ev => ev.department === profile.department)
    }

    const fromDate = new Date(monthFrom + '-01')
    const toDate = new Date(monthTo + '-01')
    toDate.setMonth(toDate.getMonth() + 1)
    result = result.filter(ev => {
      const d = new Date(ev.start_date)
      return d >= fromDate && d < toDate
    })

    // Default sort: start_date asc (chronological)
    return [...result].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents, selectedTags, filterDept, monthFrom, monthTo])

  // ---------- apply view mode (filter + sort) on top of filteredEvents ----------
  const displayedEvents = useMemo(
    () => applyViewMode(filteredEvents, mode, now),
    [filteredEvents, mode, now]
  )

  return (
    <div className="explorer-page">
      {/* Header */}
      <div className="explorer-mode-bar">
        <h1 className="page-title">Explorer</h1>
      </div>

      {/* Filter bar (tags + months + dept) */}
      <div className="explorer-filters">
        {dynamicTags.map(tag => {
          const colors = { bg: tag.bg, color: tag.color }
          const isActive = selectedTags.has(tag.value)
          const Icon = getTagIcon(tag.value)
          return (
            <button
              key={tag.value}
              onClick={() => toggleTag(tag.value)}
              className="explorer-filter-chip"
              style={isActive
                ? { background: colors.color, color: 'white' }
                : { background: colors.bg, color: colors.color }
              }
            >
              {/* eslint-disable-next-line react-hooks/static-components -- TAG_ICONS is a static lookup map, returned ref is stable */}
              <Icon size={14} strokeWidth={2} />
              {tag.label}
            </button>
          )
        })}

        <div className="explorer-filter-divider" />

        <span className="explorer-month-pickers-label">De</span>
        <MonthPicker
          options={monthOptions}
          value={monthFrom}
          onChange={v => {
            setMonthFrom(v)
            persist({ monthFrom: v })
            if (v >= monthTo) {
              const newTo = monthOptions[Math.min(monthOptions.findIndex(o => o.value === v) + 1, monthOptions.length - 1)].value
              setMonthTo(newTo)
              persist({ monthTo: newTo })
            }
          }}
        />
        <span className="explorer-month-pickers-label">à</span>
        <MonthPicker
          options={monthOptionsTo}
          value={monthTo}
          onChange={v => { setMonthTo(v); persist({ monthTo: v }) }}
        />

        {profile?.department && (
          <>
            <div className="explorer-filter-divider" />
            <button
              onClick={() => { setFilterDept(v => { persist({ dept: !v }); return !v }) }}
              className={`explorer-filter-chip ${filterDept ? 'active' : ''}`}
            >
              Dept. {profile.department}
            </button>
          </>
        )}
      </div>

      {/* Mode segmented control */}
      <div className="explorer-mode-segmented" role="tablist" aria-label="Mode d'affichage">
        {VIEW_MODES.map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            className={`explorer-mode-btn${mode === m ? ' active' : ''}`}
            onClick={() => changeMode(m)}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="explorer-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="explorer-grid-skeleton animate-pulse" />
          ))}
        </div>
      )}

      {/* Grid or empty state */}
      {!loading && displayedEvents.length > 0 && (
        <div className="explorer-grid">
          {displayedEvents.map(ev => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}

      {!loading && displayedEvents.length === 0 && (
        <div className="explorer-empty">
          <Search strokeWidth={1.5} />
          <div className="explorer-empty-title">Aucun événement ne correspond</div>
          <div className="explorer-empty-text">Essaie d'élargir tes filtres (tags, plage de mois, département).</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3.2: Run lint to catch any issues**

Run: `pnpm lint`
Expected: clean (no errors, no warnings).

If a `react-hooks/static-components` warning fires on the segmented control or the empty-state lucide `Search` icon, add `{/* eslint-disable-next-line react-hooks/static-components -- ... */}` directly before the offending line with a one-line rationale.

- [ ] **Step 3.3: Run typecheck + build**

Run: `pnpm build`
Expected: TypeScript passes, Vite build succeeds, dist/ is produced.

- [ ] **Step 3.4: Run tests**

Run: `pnpm test`
Expected: 5 tests pass total (1 smoke + 4 from `applyViewMode`).

- [ ] **Step 3.5: Visual verification (manual)**

Run: `pnpm dev`

In a browser:
1. Open `http://localhost:5173/explorer`
2. Verify the grid displays — should default to "Bientôt" mode (upcoming events only)
3. Click "Récents" — events re-sort, includes past events
4. Click "Tous" — chronological start_date order, includes past events
5. Reload the page — your selected mode persists (check via DevTools → Application → Local Storage → `explorer-filters` should contain `"mode"`)
6. Resize the window from narrow → wide — grid should fluidly transition from 2 columns to ~8 columns at >=1920px
7. Apply a tag filter that matches no event (e.g. select all tags one by one until the result is empty) — empty state should appear with the search icon and message
8. Open DevTools → Network → Throttle to "Slow 3G" → reload — skeleton placeholders should appear in the grid

If any step fails, fix it inline and re-run from step 3.2.

- [ ] **Step 3.6: Bump version + add changelog entry**

In `package.json`, change `"version": "0.7.2"` to `"version": "0.7.3"`.

In `src/changelog.ts`, prepend a new entry inside the `changelog` array (top of the list):

```typescript
{
  version: '0.7.3',
  date: '2026-05-09',
  title: 'Explorer — vue grille avec 3 modes',
  changes: [
    'Explorer affiche maintenant tous les événements en grille verticale (jusqu\'à 8 par ligne sur grand écran)',
    'Nouveau sélecteur de mode : Bientôt (à venir uniquement) · Récents (par date d\'ajout) · Tous (chronologique, passés + à venir)',
    'Le mode choisi est mémorisé entre les sessions, comme les filtres tags / mois / département',
    'État vide affiché quand les filtres ne renvoient aucun résultat',
  ],
},
```

- [ ] **Step 3.7: Final lint/build/test**

Run: `pnpm lint && pnpm build && pnpm test`
Expected: all green.

- [ ] **Step 3.8: Commit**

```bash
git add src/pages/Explorer.tsx src/pages/Explorer.css package.json src/changelog.ts
git commit -m "$(cat <<'EOF'
feat(explorer): vertical grid + 3-mode segmented control (Bientôt/Récents/Tous)

Replaces the two horizontal SlideRow sections with a single responsive grid
(repeat(auto-fill, minmax(180px, 1fr))) — 2 cols on mobile, ~8 cols on big
screens. A segmented control above the grid switches between modes:

- Bientôt (default): upcoming events only, sorted by start_date asc
- Récents: all events sorted by created_at desc (most recently added first)
- Tous: all events chronological (start_date asc, includes past)

The selected mode persists in localStorage alongside the existing
tags/months/dept filters. Empty state shown when filters return zero results.

SlideRow.tsx and SlideRow.css are kept in place for future reuse (embed,
public profile). Bumps APP_VERSION 0.7.2 -> 0.7.3 + changelog entry.

Spec: docs/superpowers/specs/2026-05-09-explorer-grid-redesign.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3.9: Push**

Run: `git push`
Expected: pushed to origin/main, post-commit hook rebuilds the graph (already filtered to skip if only graphify-out/ changed, so this push will trigger a real rebuild for the source code changes).

---

## Self-review checklist (run after implementation)

- [ ] Tests in `src/lib/explorer.test.ts` cover all four cases described in Task 1.
- [ ] `pnpm lint` is clean — no new errors, no new warnings.
- [ ] `pnpm build` succeeds.
- [ ] `pnpm test` shows 5 passing tests (1 smoke + 4 explorer).
- [ ] Manual visual check passed all 8 sub-steps in Task 3.5.
- [ ] `package.json` version bumped to `0.7.3`.
- [ ] `src/changelog.ts` has a new entry at the top.
- [ ] Workspace is clean after the final commit.
