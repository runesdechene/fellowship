# Explorer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Explorer into a Netflix-style event catalog with slideshow rows, hero banner, filter chips, and a Prospection mode for exposants.

**Architecture:** A new `SlideRow` component handles the slideshow with arrow navigation. EventCard gets a `prospection` prop for deadline badges + ratings. Explorer.tsx is fully rewritten to compose sections from filtered event data. CSS is extracted to Explorer.css.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS v4 + dedicated CSS, Supabase, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-05-explorer-redesign.md`

---

## File Structure

### New files
- `src/components/events/SlideRow.tsx` — slideshow row with arrow nav + snap scroll
- `src/components/events/SlideRow.css` — slideshow CSS
- `src/components/events/HeroBanner.tsx` — featured event hero
- `src/components/events/HeroBanner.css` — hero CSS
- `src/pages/Explorer.css` — Explorer page CSS

### Modified files
- `src/pages/Explorer.tsx` — complete rewrite
- `src/components/events/EventCard.tsx` — add prospection variant (deadline badge + rating)
- `src/lib/constants.ts` — expand PRIMARY_TAGS with all categories

---

### Task 1: Expand PRIMARY_TAGS

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Update tags list**

Replace the content of `src/lib/constants.ts`:

```typescript
// Primary tags — fixed by admin, not user-editable
export const PRIMARY_TAGS = [
  { value: 'fete-medievale', label: 'Médiéval' },
  { value: 'fantastique', label: 'Fantastique' },
  { value: 'geek', label: 'Geek' },
  { value: 'festival-musique', label: 'Musique' },
  { value: 'foire', label: 'Foire' },
  { value: 'marche', label: 'Marché' },
  { value: 'salon', label: 'Salon' },
  { value: 'litteraire', label: 'Littéraire' },
  { value: 'historique', label: 'Historique' },
] as const

export type PrimaryTag = typeof PRIMARY_TAGS[number]['value']
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: expand PRIMARY_TAGS with all event categories"
```

---

### Task 2: Create SlideRow component

**Files:**
- Create: `src/components/events/SlideRow.tsx`
- Create: `src/components/events/SlideRow.css`

- [ ] **Step 1: Write SlideRow.css**

```css
/* ── Slide Row ─────────────────────────────────────────────────────── */

.slide-row-section {
  margin-bottom: 32px;
  position: relative;
}

.slide-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 0 24px;
}

.slide-row-title {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: hsl(var(--foreground));
}

.slide-row-count {
  font-family: var(--font-body);
  font-size: 12px;
  color: rgba(61, 48, 40, 0.3);
  margin-left: 8px;
  font-weight: 500;
}

.slide-row-more {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  color: hsl(var(--primary));
  cursor: pointer;
  background: none;
  border: none;
}

/* Container */
.slide-row-container {
  position: relative;
}

.slide-row-track {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 0 24px 8px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.slide-row-track::-webkit-scrollbar {
  display: none;
}

.slide-row-track > * {
  scroll-snap-align: start;
}

/* Arrow buttons — desktop only */
.slide-row-arrow {
  display: none;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: hsl(var(--card));
  border: none;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  color: rgba(61, 48, 40, 0.5);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: background 0.2s, color 0.2s, transform 0.2s;
}

.slide-row-arrow:hover {
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  transform: translateY(-50%) scale(1.08);
}

.slide-row-arrow svg {
  width: 20px;
  height: 20px;
}

.slide-row-arrow.left {
  left: 8px;
}

.slide-row-arrow.right {
  right: 8px;
}

@media (min-width: 768px) {
  .slide-row-container:hover .slide-row-arrow {
    display: flex;
  }

  .slide-row-arrow.hidden {
    display: none !important;
  }
}
```

- [ ] **Step 2: Write SlideRow.tsx**

```tsx
import { useRef, useState, useEffect, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './SlideRow.css'

interface SlideRowProps {
  title: string
  titleStyle?: React.CSSProperties
  count?: number
  children: ReactNode
}

export function SlideRow({ title, titleStyle, count, children }: SlideRowProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    const el = trackRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [children])

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current
    if (!el) return
    const cardWidth = 214 // 200px card + 14px gap
    const amount = cardWidth * 3
    el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  return (
    <div className="slide-row-section">
      <div className="slide-row-header">
        <div>
          <span className="slide-row-title" style={titleStyle}>{title}</span>
          {count !== undefined && <span className="slide-row-count">· {count} événements</span>}
        </div>
      </div>
      <div className="slide-row-container">
        <button
          className={`slide-row-arrow left ${!canScrollLeft ? 'hidden' : ''}`}
          onClick={() => scroll('left')}
        >
          <ChevronLeft strokeWidth={1.5} />
        </button>
        <div ref={trackRef} className="slide-row-track">
          {children}
        </div>
        <button
          className={`slide-row-arrow right ${!canScrollRight ? 'hidden' : ''}`}
          onClick={() => scroll('right')}
        >
          <ChevronRight strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/components/events/SlideRow.tsx src/components/events/SlideRow.css
git commit -m "feat: SlideRow component — slideshow with arrow navigation"
```

---

### Task 3: Create HeroBanner component

**Files:**
- Create: `src/components/events/HeroBanner.tsx`
- Create: `src/components/events/HeroBanner.css`

- [ ] **Step 1: Write HeroBanner.css**

```css
/* ── Hero Banner ───────────────────────────────────────────────────── */

.hero-banner {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  height: 200px;
  margin: 0 24px 28px;
}

@media (min-width: 768px) {
  .hero-banner { height: 280px; }
}

.hero-banner img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-banner-fallback {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, hsl(var(--card)), hsl(var(--secondary)));
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-banner-fallback svg {
  width: 48px;
  height: 48px;
  color: rgba(61, 48, 40, 0.06);
}

.hero-banner-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 30%, rgba(15, 10, 5, 0.8) 100%);
}

.hero-banner-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
}

.hero-banner-tag {
  display: inline-block;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(6px);
  color: white;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-body);
  padding: 4px 12px;
  border-radius: 9999px;
  margin-bottom: 10px;
}

.hero-banner-title {
  font-family: var(--font-heading);
  font-size: 24px;
  font-weight: 800;
  color: white;
  line-height: 1.15;
  letter-spacing: -0.5px;
}

@media (min-width: 768px) {
  .hero-banner-title { font-size: 28px; }
}

.hero-banner-meta {
  font-family: var(--font-body);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hero-banner-meta svg {
  width: 14px;
  height: 14px;
}

.hero-banner-cta {
  margin-top: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: hsl(var(--primary));
  color: white;
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.15s;
}

.hero-banner-cta:hover {
  transform: scale(1.03);
}
```

- [ ] **Step 2: Write HeroBanner.tsx**

```tsx
import { Link } from 'react-router-dom'
import { MapPin, Calendar, ArrowRight } from 'lucide-react'
import type { EventWithScore } from '@/types/database'
import './HeroBanner.css'

interface HeroBannerProps {
  event: EventWithScore
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function HeroBanner({ event }: HeroBannerProps) {
  return (
    <Link to={`/evenement/${event.id}`} className="hero-banner">
      {event.image_url ? (
        <img src={event.image_url} alt={event.name} />
      ) : (
        <div className="hero-banner-fallback">
          <Calendar strokeWidth={1} />
        </div>
      )}
      <div className="hero-banner-gradient" />
      <div className="hero-banner-content">
        <span className="hero-banner-tag">{event.primary_tag}</span>
        <div className="hero-banner-title">{event.name}</div>
        <div className="hero-banner-meta">
          <MapPin strokeWidth={1.5} />
          {event.city} · {formatDate(event.start_date)}
          {event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}
        </div>
        <span className="hero-banner-cta">
          Voir l'événement
          <ArrowRight style={{ width: 16, height: 16 }} strokeWidth={2} />
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/components/events/HeroBanner.tsx src/components/events/HeroBanner.css
git commit -m "feat: HeroBanner component — featured event hero"
```

---

### Task 4: Update EventCard — prospection variant

**Files:**
- Modify: `src/components/events/EventCard.tsx`

- [ ] **Step 1: Add prospection props**

Add to the `EventCardProps` interface and update the portrait card to show deadline badge + rating when in prospection mode.

Add these props to `EventCardProps`:

```typescript
interface EventCardProps {
  event: EventWithScore
  friendCount?: number
  variant?: 'portrait' | 'horizontal'
  prospection?: boolean
}
```

In the portrait variant, add after the existing date badge (the `absolute right-3 top-3` div), a conditional that shows the deadline badge instead when `prospection` is true and `event.registration_deadline` exists:

```tsx
// Replace the date badge section with:
<div className="absolute right-3 top-3">
  {prospection && event.registration_deadline && new Date(event.registration_deadline) > new Date() ? (() => {
    const daysLeft = Math.ceil((new Date(event.registration_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const urgency = daysLeft < 30 ? 'urgent' : daysLeft < 90 ? 'warning' : 'ok'
    const bgStyle = urgency === 'urgent'
      ? { background: 'rgba(220,50,50,0.85)' }
      : urgency === 'warning'
        ? { background: 'rgba(220,140,30,0.85)' }
        : event.image_url
          ? { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }
          : { background: 'rgba(61,48,40,0.06)' }
    return (
      <div className="rounded-xl px-2.5 py-1.5 text-center" style={bgStyle}>
        <div className="text-[8px] font-semibold uppercase text-white/70">Inscription</div>
        <div className="text-sm font-extrabold text-white leading-none">J-{daysLeft}</div>
      </div>
    )
  })() : (
    <div
      className="rounded-xl px-2.5 py-1.5 text-center"
      style={event.image_url
        ? { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }
        : { background: 'rgba(61,48,40,0.06)' }
      }
    >
      <div className={`text-lg font-extrabold leading-none ${event.image_url ? 'text-white' : 'text-foreground/50'}`}>
        {formatDay(event.start_date)}
      </div>
      <div className={`text-[9px] font-semibold uppercase ${event.image_url ? 'text-white/60' : 'text-foreground/30'}`}>
        {formatMonth(event.start_date)}
      </div>
    </div>
  )}
</div>
```

Also add the rating display in prospection mode, inside the bottom content area, after the friend count section:

```tsx
{prospection && event.avg_overall !== null && (
  <div className={`mt-1.5 flex items-center gap-1 text-[11px] ${event.image_url ? 'text-white/50' : 'text-muted-foreground'}`}>
    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
    <span className="font-bold">{event.avg_overall}</span>
    {event.review_count !== null && <span>({event.review_count})</span>}
  </div>
)}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/components/events/EventCard.tsx
git commit -m "feat: EventCard prospection variant — deadline badge + rating"
```

---

### Task 5: Create Explorer.css

**Files:**
- Create: `src/pages/Explorer.css`

- [ ] **Step 1: Write Explorer.css**

```css
/* ── Explorer Page ─────────────────────────────────────────────────── */

.explorer-page {
  padding-top: 8px;
  padding-bottom: 80px;
}

/* Mode bar */
.explorer-mode-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  margin-bottom: 16px;
}

.explorer-title {
  font-family: var(--font-heading);
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: hsl(var(--foreground));
}

/* Prospection toggle */
.explorer-prospection-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border: none;
  background: none;
  padding: 0;
}

.explorer-prospection-label {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: rgba(61, 48, 40, 0.35);
  display: flex;
  align-items: center;
  gap: 5px;
  transition: color 0.2s;
}

.explorer-prospection-toggle.active .explorer-prospection-label {
  color: hsl(var(--primary));
}

.explorer-prospection-label svg {
  width: 16px;
  height: 16px;
}

/* Filter bar */
.explorer-filters {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 24px 16px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.explorer-filters::-webkit-scrollbar {
  display: none;
}

.explorer-filter-chip {
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  background: hsl(var(--card));
  color: rgba(61, 48, 40, 0.45);
  white-space: nowrap;
  flex-shrink: 0;
}

.explorer-filter-chip:hover {
  background: rgba(61, 48, 40, 0.06);
}

.explorer-filter-chip.active {
  background: hsl(var(--primary));
  color: white;
}

.explorer-filter-chip.urgent {
  background: hsl(0 65% 55% / 0.1);
  color: hsl(0 65% 50%);
}

.explorer-filter-chip.urgent.active {
  background: hsl(0 65% 55%);
  color: white;
}

.explorer-filter-chip.warning {
  background: hsl(30 80% 50% / 0.1);
  color: hsl(30 70% 45%);
}

.explorer-filter-chip.warning.active {
  background: hsl(30 80% 50%);
  color: white;
}

.explorer-filter-divider {
  width: 1px;
  background: rgba(61, 48, 40, 0.08);
  margin: 0 4px;
  flex-shrink: 0;
  align-self: stretch;
}

/* Prospection alert */
.explorer-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  background: hsl(0 65% 55% / 0.06);
  border-radius: 16px;
  padding: 14px 18px;
  margin: 0 24px 20px;
}

.explorer-alert-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: hsl(0 65% 55% / 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.explorer-alert-icon svg {
  width: 18px;
  height: 18px;
  color: hsl(0 65% 50%);
}

.explorer-alert-text {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: hsl(0 55% 40%);
}

.explorer-alert-count {
  font-family: var(--font-heading);
  font-size: 20px;
  font-weight: 800;
  color: hsl(0 65% 50%);
  margin-left: auto;
}

/* Empty state */
.explorer-empty {
  border-radius: 24px;
  background: hsl(var(--card));
  padding: 48px 24px;
  text-align: center;
  margin: 0 24px;
}

.explorer-empty svg {
  width: 40px;
  height: 40px;
  color: rgba(61, 48, 40, 0.1);
  margin: 0 auto 16px;
}

.explorer-empty-title {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 700;
  color: hsl(var(--foreground));
}

.explorer-empty-text {
  font-family: var(--font-body);
  font-size: 13px;
  color: rgba(61, 48, 40, 0.35);
  margin-top: 8px;
}

/* Skeleton */
.explorer-skeleton-row {
  display: flex;
  gap: 14px;
  padding: 0 24px;
  margin-bottom: 32px;
}

.explorer-skeleton-card {
  width: 200px;
  flex-shrink: 0;
  border-radius: 18px;
  background: hsl(var(--muted));
  aspect-ratio: 2/3;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/Explorer.css
git commit -m "feat: Explorer.css — dedicated styles"
```

---

### Task 6: Rewrite Explorer.tsx

**Files:**
- Modify: `src/pages/Explorer.tsx` (complete rewrite)

- [ ] **Step 1: Rewrite Explorer**

This is the main task. The full Explorer page with:
- Mode bar (title + prospection toggle for exposants)
- Filter chips (tags + temporal + geo)
- Hero banner (first upcoming event with image)
- Netflix sections with SlideRow
- Prospection mode: alert banner, deadline sections, modified cards
- Search integration from global SearchBar
- Events sorted by start_date ascending

The complete code is large — the implementer should read the spec at `docs/superpowers/specs/2026-04-05-explorer-redesign.md` and compose using `SlideRow`, `HeroBanner`, and `EventCard` components.

Key logic:
- Fetch all events with `useEvents()` (no filters — filter client-side for sections)
- Also fetch with `useFriendsParticipations()` to identify friend events
- Get user profile from `useAuth()` for department matching and exposant check
- Group events by tag for category sections
- Filter by search query (client-side `name.includes`)
- When prospection mode: filter out events with past `registration_deadline`, add urgency sections
- Each `SlideRow` renders `EventCard` components with `prospection` prop when in prospection mode

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Explorer.tsx
git commit -m "feat: Explorer Netflix redesign — slideshow, hero, prospection mode"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full build + lint**

```bash
pnpm build
```

- [ ] **Step 2: Visual check**

Start dev server with `pnpm dev` and verify:
1. Explorer is full-width (no max-width container)
2. Hero banner shows first upcoming event with image
3. Filter chips work — tag, temporal, geo
4. Netflix rows scroll horizontally with snap
5. Arrow buttons appear on desktop hover, hidden on mobile
6. Events sorted by date ascending in each row
7. Prospection toggle visible only for exposant accounts
8. Prospection mode: deadline badges, ratings, alert banner
9. Global search filters Explorer sections dynamically
10. Empty sections are hidden
11. Cards link to event pages

- [ ] **Step 3: Commit if fixups needed**

```bash
git add -A
git commit -m "fix: Explorer integration adjustments"
```
