# Mobile Calendar Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile calendar (<640px) with a year grid overview + detailed month view with compact event pills.

**Architecture:** Two new components (`MobileYearGrid`, `MobileMonthView`) conditionally rendered on mobile via a `useIsMobile` media query hook. Desktop view unchanged. Data from existing `slidingMonths` array (already merged with friend events).

**Tech Stack:** React 19, TypeScript, CSS (no Tailwind classes for new components — project uses plain CSS for calendar)

**Spec:** `docs/superpowers/specs/2026-04-08-mobile-calendar-design.md`

---

### File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/calendar/MobileYearGrid.tsx` | Create | 3×4 grid of months with dots + truncated event names |
| `src/components/calendar/MobileMonthView.tsx` | Create | Month detail with compact event pills |
| `src/pages/Calendar.tsx` | Modify | Mobile detection, conditional rendering, mobile view state |
| `src/pages/Calendar.css` | Modify | All mobile calendar styles + hide desktop grid on mobile |

---

### Task 1: MobileYearGrid Component

**Files:**
- Create: `src/components/calendar/MobileYearGrid.tsx`

- [ ] **Step 1: Create MobileYearGrid component**

```tsx
// src/components/calendar/MobileYearGrid.tsx
import type { CalendarMonth } from '@/hooks/use-calendar'

const TAG_COLORS: Record<string, string> = {
  'médiéval': 'hsl(24 72% 50%)',
  'fantastique': 'hsl(280 50% 55%)',
  'geek': 'hsl(220 70% 50%)',
  'marché': 'hsl(152 32% 45%)',
  'salon': 'hsl(200 50% 45%)',
  'foire': 'hsl(40 80% 50%)',
  'musique': 'hsl(340 60% 55%)',
  'littéraire': 'hsl(190 60% 45%)',
  'historique': 'hsl(10 70% 50%)',
}

function getTagDotColor(tag: string): string {
  const key = Object.keys(TAG_COLORS).find(k => tag.toLowerCase().includes(k))
  return key ? TAG_COLORS[key] : 'rgba(61,48,40,0.3)'
}

interface MobileYearGridProps {
  months: CalendarMonth[]
  currentMonth: number
  currentYear: number
  onSelectMonth: (monthIndex: number) => void
}

const MONTH_ABBR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const MAX_VISIBLE = 2

export function MobileYearGrid({ months, currentMonth, currentYear, onSelectMonth }: MobileYearGridProps) {
  return (
    <div className="mobile-year-grid">
      {months.map((month, i) => {
        const isCurrent = month.year === currentYear && month.month === currentMonth
        const isEmpty = month.events.length === 0
        const visible = month.events.slice(0, MAX_VISIBLE)
        const overflow = month.events.length - MAX_VISIBLE

        return (
          <button
            key={`${month.year}-${month.month}`}
            className={`mobile-year-cell ${isCurrent ? 'current' : ''} ${isEmpty ? 'empty' : ''}`}
            onClick={() => onSelectMonth(i)}
          >
            <div className={`mobile-year-cell-label ${isCurrent ? 'current' : ''}`}>
              {MONTH_ABBR[month.month]}
            </div>
            {isEmpty ? (
              <div className="mobile-year-cell-empty">—</div>
            ) : (
              <div className="mobile-year-cell-events">
                {visible.map(ev => (
                  <div key={ev.id} className="mobile-year-cell-event">
                    <div
                      className="mobile-year-cell-dot"
                      style={{ background: getTagDotColor(ev.primaryTag) }}
                    />
                    <span className="mobile-year-cell-name">{ev.name}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="mobile-year-cell-overflow">+{overflow}</div>
                )}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep -i "MobileYearGrid" || echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/MobileYearGrid.tsx
git commit -m "feat: add MobileYearGrid component for mobile calendar"
```

---

### Task 2: MobileMonthView Component

**Files:**
- Create: `src/components/calendar/MobileMonthView.tsx`

- [ ] **Step 1: Create MobileMonthView component**

```tsx
// src/components/calendar/MobileMonthView.tsx
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, Check, Circle, CircleDashed } from 'lucide-react'
import type { CalendarMonth } from '@/hooks/use-calendar'

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  'médiéval': { bg: 'hsl(24 72% 50% / 0.08)', color: 'hsl(24 72% 44%)' },
  'fantastique': { bg: 'hsl(280 50% 55% / 0.08)', color: 'hsl(280 50% 50%)' },
  'geek': { bg: 'hsl(220 70% 50% / 0.08)', color: 'hsl(220 70% 45%)' },
  'marché': { bg: 'hsl(152 32% 45% / 0.08)', color: 'hsl(152 32% 38%)' },
  'salon': { bg: 'hsl(200 50% 45% / 0.08)', color: 'hsl(200 50% 40%)' },
  'foire': { bg: 'hsl(40 80% 50% / 0.08)', color: 'hsl(40 70% 38%)' },
  'musique': { bg: 'hsl(340 60% 55% / 0.08)', color: 'hsl(340 55% 50%)' },
  'littéraire': { bg: 'hsl(190 60% 45% / 0.08)', color: 'hsl(190 60% 40%)' },
  'historique': { bg: 'hsl(10 70% 50% / 0.08)', color: 'hsl(10 70% 45%)' },
}

function getTagStyle(tag: string) {
  const key = Object.keys(TAG_COLORS).find(k => tag.toLowerCase().includes(k))
  return key ? TAG_COLORS[key] : { bg: 'rgba(61,48,40,0.06)', color: 'rgba(61,48,40,0.45)' }
}

const STATUS_CONFIG: Record<string, { icon: typeof Check; color: string; bg: string; label: string }> = {
  inscrit: { icon: Check, color: 'hsl(152 50% 38%)', bg: 'hsl(152 50% 38% / 0.12)', label: '✓' },
  en_cours: { icon: Circle, color: 'hsl(210 60% 50%)', bg: 'hsl(210 60% 50% / 0.12)', label: '●' },
  interesse: { icon: CircleDashed, color: 'hsl(30 80% 50%)', bg: 'hsl(30 80% 50% / 0.12)', label: '○' },
}

function formatDateRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth()
  const sameDay = start.getDate() === end.getDate() && sameMonth
  const monthShort = start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')

  if (sameDay) return `${start.getDate()} ${monthShort}`
  if (sameMonth) return `${start.getDate()}-${end.getDate()} ${monthShort}`
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  return `${start.getDate()} ${monthShort} — ${end.getDate()} ${endMonth}`
}

interface MobileMonthViewProps {
  month: CalendarMonth
  onPrevMonth: () => void
  onNextMonth: () => void
  onBackToYear: () => void
}

export function MobileMonthView({ month, onPrevMonth, onNextMonth, onBackToYear }: MobileMonthViewProps) {
  return (
    <div className="mobile-month-view">
      {/* Month nav */}
      <div className="mobile-month-nav">
        <button className="mobile-month-nav-btn" onClick={onPrevMonth}>
          <ChevronLeft strokeWidth={1.5} />
        </button>
        <span className="mobile-month-nav-label">{month.label}</span>
        <button className="mobile-month-nav-btn" onClick={onNextMonth}>
          <ChevronRight strokeWidth={1.5} />
        </button>
      </div>

      {/* Back to year */}
      <button className="mobile-month-back" onClick={onBackToYear}>
        <LayoutGrid strokeWidth={1.5} />
        Vue annuelle
      </button>

      {/* Events */}
      {month.events.length === 0 ? (
        <div className="mobile-month-empty">Aucun événement ce mois-ci</div>
      ) : (
        <div className="mobile-month-events">
          {month.events.map(ev => {
            const tagStyle = getTagStyle(ev.primaryTag)
            const statusCfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.interesse

            return (
              <Link
                key={ev.id}
                to={`/evenement/${ev.id}`}
                className="mobile-event-pill"
                style={{ background: tagStyle.bg }}
              >
                {ev.imageUrl && (
                  <div className="mobile-event-pill-img">
                    <img src={ev.imageUrl} alt="" />
                  </div>
                )}
                <div className="mobile-event-pill-info">
                  <div className="mobile-event-pill-name">{ev.name}</div>
                  <div className="mobile-event-pill-meta">
                    <span>{formatDateRange(ev.startDate, ev.endDate)}</span>
                    <span>·</span>
                    <span>{ev.city} ({ev.department})</span>
                  </div>
                </div>
                {ev.status && (
                  <div
                    className="mobile-event-pill-status"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                    title={ev.status}
                  >
                    {statusCfg.label}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep -i "MobileMonthView" || echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add src/components/calendar/MobileMonthView.tsx
git commit -m "feat: add MobileMonthView component with event pills"
```

---

### Task 3: Add Mobile CSS Styles

**Files:**
- Modify: `src/pages/Calendar.css`

- [ ] **Step 1: Add mobile calendar styles at the end of Calendar.css**

Append the following block at the end of `src/pages/Calendar.css`:

```css
/* ── Mobile Calendar ──────────────────────────────────────────────── */

/* Hide mobile on desktop, desktop on mobile */
.mobile-calendar { display: none; }

@media (max-width: 639px) {
  .mobile-calendar { display: block; }
  .calendar-grid { display: none; }
}

/* ── Mobile Year Grid ─────────────────────────────────────────────── */

.mobile-year-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mobile-year-cell {
  background: hsl(var(--card));
  border-radius: 12px;
  padding: 8px 7px;
  min-height: 70px;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.mobile-year-cell:active {
  background: hsl(var(--muted));
}

.mobile-year-cell.current {
  outline: 2px solid hsl(30 60% 55% / 0.3);
  outline-offset: -2px;
}

.mobile-year-cell.empty {
  opacity: 0.5;
}

.mobile-year-cell-label {
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin-bottom: 6px;
}

.mobile-year-cell-label.current {
  color: hsl(30 60% 50%);
}

.mobile-year-cell-empty {
  font-size: 9px;
  color: rgba(61, 48, 40, 0.2);
}

.mobile-year-cell-events {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mobile-year-cell-event {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mobile-year-cell-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mobile-year-cell-name {
  font-size: 8px;
  font-family: var(--font-body);
  color: rgba(61, 48, 40, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-year-cell-overflow {
  font-size: 8px;
  font-family: var(--font-body);
  color: rgba(61, 48, 40, 0.25);
  padding-left: 10px;
}

/* ── Mobile Month View ────────────────────────────────────────────── */

.mobile-month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.mobile-month-nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: hsl(var(--card));
  border: none;
  color: rgba(61, 48, 40, 0.4);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.mobile-month-nav-btn:hover {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

.mobile-month-nav-btn svg {
  width: 18px;
  height: 18px;
}

.mobile-month-nav-label {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
  color: hsl(var(--foreground));
  min-width: 90px;
  text-align: center;
  text-transform: capitalize;
}

.mobile-month-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  background: hsl(var(--card));
  border: none;
  font-family: var(--font-body);
  font-size: 11px;
  color: rgba(61, 48, 40, 0.4);
  cursor: pointer;
  margin-bottom: 12px;
  transition: background 0.15s;
}

.mobile-month-back:hover {
  background: hsl(var(--muted));
}

.mobile-month-back svg {
  width: 13px;
  height: 13px;
}

.mobile-month-empty {
  text-align: center;
  padding: 40px 0;
  font-family: var(--font-body);
  font-size: 13px;
  color: rgba(61, 48, 40, 0.25);
}

.mobile-month-events {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Mobile Event Pill ────────────────────────────────────────────── */

.mobile-event-pill {
  display: flex;
  align-items: center;
  border-radius: 14px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: opacity 0.15s;
}

.mobile-event-pill:active {
  opacity: 0.7;
}

.mobile-event-pill-img {
  width: 44px;
  flex-shrink: 0;
}

.mobile-event-pill-img img {
  width: 44px;
  height: 100%;
  min-height: 56px;
  object-fit: cover;
  display: block;
}

.mobile-event-pill-info {
  flex: 1;
  padding: 8px 10px;
  min-width: 0;
}

.mobile-event-pill-name {
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 700;
  color: hsl(var(--foreground));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-event-pill-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-family: var(--font-body);
  font-size: 10px;
  color: rgba(61, 48, 40, 0.35);
}

.mobile-event-pill-status {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  margin-right: 10px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Calendar.css
git commit -m "style: add mobile calendar CSS (year grid + month view + event pills)"
```

---

### Task 4: Wire Up Mobile Views in CalendarPage

**Files:**
- Modify: `src/pages/Calendar.tsx`

- [ ] **Step 1: Add mobile state and imports**

At the top of `Calendar.tsx`, add imports:

```tsx
import { MobileYearGrid } from '@/components/calendar/MobileYearGrid'
import { MobileMonthView } from '@/components/calendar/MobileMonthView'
```

Inside `CalendarPage()`, after the existing state declarations (after `const [modalEvent, setModalEvent] = ...`), add:

```tsx
const [mobileView, setMobileView] = useState<'year' | 'month'>('year')
const [selectedMonthIndex, setSelectedMonthIndex] = useState(0)
const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

useEffect(() => {
  const mq = window.matchMedia('(max-width: 639px)')
  const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}, [])

const handleSelectMonth = useCallback((index: number) => {
  setSelectedMonthIndex(index)
  setMobileView('month')
}, [])

const handlePrevMonth = useCallback(() => {
  setSelectedMonthIndex(i => i > 0 ? i - 1 : 11)
}, [])

const handleNextMonth = useCallback(() => {
  setSelectedMonthIndex(i => i < 11 ? i + 1 : 0)
}, [])
```

- [ ] **Step 2: Add mobile rendering block**

In the JSX, right after the `{/* Grid */}` section (after the closing `</div>` of `calendar-grid` container and before `{/* Friends modal */}`), add:

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
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onBackToYear={() => setMobileView('year')}
      />
    )}
  </div>
)}
```

- [ ] **Step 3: Add useEffect to imports if not already there**

The existing imports already include `useState` and `useCallback`. Verify `useEffect` is also imported — it should be, from the existing code. No change needed if already present.

- [ ] **Step 4: Build and verify**

Run: `pnpm build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Calendar.tsx
git commit -m "feat: wire up mobile calendar views in CalendarPage"
```

---

### Task 5: Test on Mobile & Fix Overflow

**Files:**
- Modify: `src/pages/Calendar.css` (if needed)

- [ ] **Step 1: Run dev server and test on mobile viewport**

Run: `pnpm dev`

Open browser, toggle device toolbar (Chrome: F12 → Ctrl+Shift+M), select iPhone 14 (390×844).

Verify:
1. Year grid shows 3×4 cells with all 12 months visible
2. Current month has outline highlight
3. Tapping a month switches to month detail view
4. Month nav chevrons work (‹ ›)
5. "Vue annuelle" button returns to year grid
6. Event pills show image thumbnail when available
7. Status icons display correctly
8. No horizontal overflow on any view
9. Desktop view (>= 640px) is unchanged

- [ ] **Step 2: Deploy**

```bash
git push
```

- [ ] **Step 3: Update changelog**

Add entry to `src/changelog.ts` for version 0.5.3:

```ts
{
  version: '0.5.3',
  date: '2026-04-08',
  title: 'Calendrier mobile repensé',
  changes: [
    'Nouvelle vue annuelle mobile — grille 3×4 avec les 12 mois visibles',
    'Vue mois détaillée — gélules compactes avec miniature et statut',
    'Navigation mois par mois avec chevrons',
    'Fix — les événements ne débordent plus sur mobile',
  ],
},
```

- [ ] **Step 4: Final commit and push**

```bash
git add src/changelog.ts src/pages/Calendar.css
git commit -m "feat: mobile calendar redesign — year grid + month view

Closes mobile overflow issue. Adds compact year overview (3×4 grid)
and detailed month view with event pills, status icons, and image
thumbnails. Desktop unchanged."
git push
```
