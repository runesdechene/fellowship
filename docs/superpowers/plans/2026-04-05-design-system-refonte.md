# Design System Refonte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete visual overhaul — flat design, Plus Jakarta Sans + Inter, inverted surfaces (white background / lin cards), Netflix-style event cards, softer text colors, zero shadows.

**Architecture:** The refonte is layered: first update CSS tokens and global styles (foundation), then rewrite the EventCard component (most visual impact), then update each page and component to use the new tokens. Each task is self-contained and can be verified independently.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS v4, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-05-design-system-refonte.md`

---

## File Structure

### Modified files (no new files — pure styling refonte)
- `index.html` — already updated (Jakarta Sans loaded)
- `src/index.css` — CSS tokens, font declarations, global styles
- `src/components/events/EventCard.tsx` — complete rewrite to Netflix style
- `src/pages/Dashboard.tsx` — Netflix horizontal event cards, flat surfaces, new text colors
- `src/pages/Explorer.tsx` — flat surfaces, tag pills, Netflix grid
- `src/components/layout/Sidebar.tsx` — flat lin background, remove shadow
- `src/components/layout/BottomBar.tsx` — flat style
- `src/components/layout/AppLayout.tsx` — background color
- `src/components/notifications/SidebarActivity.tsx` — text colors
- `src/components/notifications/NotificationSlidePanel.tsx` — flat style
- `src/components/notifications/NotificationItem.tsx` — text colors
- `src/pages/Landing.tsx` — new design tokens
- `src/pages/Login.tsx` — flat inputs
- `src/pages/Settings.tsx` — flat cards
- `src/pages/Calendar.tsx` — text colors
- `src/components/ui/button.tsx` — outline variant update

---

### Task 1: CSS tokens + global styles

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Update CSS variables**

Replace the `:root` block in `src/index.css`:

```css
:root {
  /* Fellowship — Flat warm design system */
  --background: 36 33% 98%;      /* #faf8f5 — warm white page bg */
  --foreground: 24 15% 20%;      /* #3d3028 — soft warm brown */
  --card: 30 18% 92%;            /* #f0ebe4 — lin blocks */
  --card-foreground: 24 15% 20%;
  --popover: 30 18% 92%;
  --popover-foreground: 24 15% 20%;
  --primary: 24 72% 44%;
  --primary-foreground: 0 0% 100%;
  --secondary: 30 15% 89%;       /* #e8e2da — slightly darker lin */
  --secondary-foreground: 24 15% 20%;
  --muted: 30 12% 87%;           /* #e2dbd3 */
  --muted-foreground: 24 12% 45%;
  --accent: 152 32% 40%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 65% 55%;
  --destructive-foreground: 0 0% 100%;
  --border: 30 10% 82%;
  --input: 30 10% 82%;
  --ring: 24 72% 44%;
  --radius: 0.75rem;

  /* Brand tokens */
  --fellowship-copper: 24 72% 44%;
  --fellowship-forest: 152 32% 40%;
  --fellowship-sand: 30 18% 92%;
  --fellowship-linen: 36 33% 98%;
}
```

- [ ] **Step 2: Update dark theme tokens**

Replace the `.dark` block:

```css
.dark {
  --background: 24 12% 8%;
  --foreground: 30 16% 90%;
  --card: 24 12% 12%;
  --card-foreground: 30 16% 90%;
  --popover: 24 12% 12%;
  --popover-foreground: 30 16% 90%;
  --primary: 24 68% 55%;
  --primary-foreground: 24 12% 8%;
  --secondary: 24 10% 16%;
  --secondary-foreground: 30 16% 90%;
  --muted: 24 8% 18%;
  --muted-foreground: 24 8% 55%;
  --accent: 152 28% 48%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 60% 40%;
  --destructive-foreground: 0 0% 100%;
  --border: 24 6% 20%;
  --input: 24 6% 20%;
  --ring: 24 68% 55%;
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat: update CSS tokens — flat design, inverted surfaces, softer colors"
```

---

### Task 2: Rewrite EventCard — Netflix style

**Files:**
- Modify: `src/components/events/EventCard.tsx`

- [ ] **Step 1: Rewrite EventCard**

Replace the entire content of `src/components/events/EventCard.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Star, Users } from 'lucide-react'
import type { EventWithScore } from '@/types/database'

interface EventCardProps {
  event: EventWithScore
  friendCount?: number
  variant?: 'portrait' | 'horizontal'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric' })
}

function formatMonth(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
}

export function EventCard({ event, friendCount, variant = 'portrait' }: EventCardProps) {
  if (variant === 'horizontal') {
    return (
      <Link
        to={`/evenement/${event.id}`}
        className="group flex h-[120px] overflow-hidden rounded-2xl"
      >
        {/* Background image */}
        <div className="absolute inset-0">
          {event.image_url ? (
            <img src={event.image_url} alt={event.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-card" />
          )}
        </div>
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: event.image_url
            ? 'linear-gradient(90deg, rgba(15,10,5,0.75) 0%, rgba(15,10,5,0.3) 50%, transparent 100%)'
            : 'none'
          }}
        />
        {/* Content */}
        <div className="relative flex w-full items-center gap-4 px-5">
          <div className="text-center shrink-0">
            <div className={`text-[28px] font-extrabold leading-none ${event.image_url ? 'text-white' : 'text-primary'}`}>
              {formatDay(event.start_date)}
            </div>
            <div className={`text-[10px] font-medium uppercase ${event.image_url ? 'text-white/50' : 'text-primary/50'}`}>
              {formatMonth(event.start_date)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-base font-bold truncate ${event.image_url ? 'text-white' : 'text-foreground'}`}>
              {event.name}
            </div>
            <div className={`text-[11px] mt-1 flex items-center gap-1 ${event.image_url ? 'text-white/45' : 'text-muted-foreground'}`}>
              <MapPin className="h-3 w-3" />
              {event.city} · {event.primary_tag}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Portrait (Netflix-style) — default
  return (
    <Link
      to={`/evenement/${event.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl"
      style={{ aspectRatio: '2/3' }}
    >
      {/* Background */}
      {event.image_url ? (
        <img src={event.image_url} alt={event.name} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-card to-secondary flex items-center justify-center">
          <Calendar className="h-12 w-12 text-muted-foreground/10" />
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: event.image_url
          ? 'linear-gradient(180deg, transparent 40%, rgba(15,10,5,0.85) 100%)'
          : 'linear-gradient(180deg, transparent 50%, rgba(61,48,40,0.1) 100%)'
        }}
      />

      {/* Tag — top left */}
      <div className="absolute left-3 top-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
          style={event.image_url
            ? { background: 'rgba(255,255,255,0.15)', color: 'white', backdropFilter: 'blur(6px)' }
            : { background: 'rgba(61,48,40,0.08)', color: 'rgba(61,48,40,0.5)' }
          }
        >
          {event.primary_tag}
        </span>
      </div>

      {/* Date badge — top right */}
      <div className="absolute right-3 top-3">
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
      </div>

      {/* Content — bottom */}
      <div className="mt-auto relative p-4">
        <h3 className={`text-base font-bold leading-snug ${event.image_url ? 'text-white' : 'text-foreground'}`}>
          {event.name}
        </h3>
        <div className={`mt-1.5 flex items-center gap-1 text-[11px] ${event.image_url ? 'text-white/50' : 'text-muted-foreground'}`}>
          <MapPin className="h-3 w-3" />
          {event.city}
          {event.end_date !== event.start_date && ` · ${formatDate(event.start_date)} — ${formatDate(event.end_date)}`}
        </div>

        {/* Rating + friends */}
        {(event.avg_overall !== null || (friendCount !== undefined && friendCount > 0)) && (
          <div className={`mt-2 flex items-center gap-3 text-[11px] ${event.image_url ? 'text-white/40' : 'text-muted-foreground'}`}>
            {event.avg_overall !== null && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                {event.avg_overall}
              </span>
            )}
            {friendCount !== undefined && friendCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {friendCount} ami{friendCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/components/events/EventCard.tsx
git commit -m "feat: Netflix-style EventCard — portrait + horizontal variants"
```

---

### Task 3: Update Sidebar — flat lin

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar classes**

In `src/components/layout/Sidebar.tsx`, replace the `<aside>` className:

From:
```
bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)]
```
To:
```
bg-card
```

That's it — remove the shadow, keep bg-card (which is now lin `#f0ebe4`).

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: sidebar flat lin background, remove shadow"
```

---

### Task 4: Update Dashboard — Netflix horizontal cards + flat

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Update Dashboard event cards**

In `src/pages/Dashboard.tsx`, the "Prochaines dates" section currently renders events as list items with `border-left`. Replace the event rendering (the `upcoming.map` block, approximately lines 82-107) with Netflix horizontal cards:

Replace:
```tsx
            {upcoming.map(p => (
              <Link
                key={p.id}
                to={`/evenement/${p.event_id}`}
                className="flex items-center gap-4 rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-4 hover:shadow-[2px_0_40px_-10px_rgba(0,0,0,0.12)]"
                style={{ borderLeft: `4px solid ${getTagColor(p.events!.primary_tag)}` }}
              >
```

With:
```tsx
            {upcoming.map(p => (
              <Link
                key={p.id}
                to={`/evenement/${p.event_id}`}
                className="group relative flex h-[120px] overflow-hidden rounded-2xl"
              >
                {p.events!.image_url ? (
                  <img src={p.events!.image_url} alt={p.events!.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-card" />
                )}
                <div className="absolute inset-0" style={{ background: p.events!.image_url ? 'linear-gradient(90deg, rgba(15,10,5,0.75) 0%, rgba(15,10,5,0.3) 50%, transparent 100%)' : 'none' }} />
                <div className="relative flex w-full items-center gap-4 px-5">
                  <div className="text-center shrink-0">
                    <div className={`text-[28px] font-extrabold leading-none ${p.events!.image_url ? 'text-white' : 'text-primary'}`}>
                      {new Date(p.events!.start_date).getDate()}
                    </div>
                    <div className={`text-[10px] font-medium uppercase ${p.events!.image_url ? 'text-white/50' : 'text-primary/50'}`}>
                      {new Date(p.events!.start_date).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-base font-bold truncate ${p.events!.image_url ? 'text-white' : 'text-foreground'}`}>{p.events!.name}</div>
                    <div className={`text-[11px] mt-1 flex items-center gap-1 ${p.events!.image_url ? 'text-white/45' : 'text-muted-foreground'}`}>
                      <MapPin className="h-3 w-3" />
                      {p.events!.city}, {p.events!.department}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.12)', color: p.events!.image_url ? 'rgba(255,255,255,0.7)' : 'var(--color-muted-foreground)' }}>
                    {formatCountdown(p.events!.start_date, p.events!.end_date)}
                  </span>
                </div>
              </Link>
            ))}
```

Add `MapPin` to the lucide-react imports at the top.

Also replace all `shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)]` with nothing (remove shadow classes) on the remaining cards (friend activity, réseau, empty state).

Replace `bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)]` → `bg-card` everywhere in this file.

Replace `hover:shadow-[2px_0_40px_-10px_rgba(0,0,0,0.12)]` → `` (remove) everywhere.

The `getTagColor` function and `tagColors` can be removed since we no longer use `border-left` colors.

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: dashboard Netflix horizontal event cards, flat surfaces"
```

---

### Task 5: Update Explorer — Netflix portrait grid + flat

**Files:**
- Modify: `src/pages/Explorer.tsx`

- [ ] **Step 1: Update Explorer**

Replace all `shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)]` → remove (empty string). The `bg-card` stays.

The EventCard component is already updated to Netflix portrait style (Task 2). The grid in Explorer already uses `<EventCard>`, so the Netflix cards will appear automatically.

Update the skeleton to match portrait aspect ratio:

```tsx
function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card" style={{ aspectRatio: '2/3' }}>
      <div className="h-full animate-pulse bg-muted" />
    </div>
  )
}
```

Remove all shadow classes from tag pills, filter panel, empty states, create modal.

- [ ] **Step 2: Verify build**

Run: `pnpm build`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Explorer.tsx
git commit -m "feat: explorer flat surfaces, portrait skeleton"
```

---

### Task 6: Update remaining layout components

**Files:**
- Modify: `src/components/layout/BottomBar.tsx`
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Update BottomBar**

In `BottomBar.tsx`, the nav currently has `border-t border-border bg-card/80 backdrop-blur-xl`. Keep the backdrop-blur for mobile but remove the border. Change to:

```
bg-card/80 backdrop-blur-xl
```

- [ ] **Step 2: Update button outline variant**

In `button.tsx`, the outline variant has `border border-border`. Replace with:

```
bg-card hover:bg-muted
```

No border, flat background instead.

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/BottomBar.tsx src/components/ui/button.tsx
git commit -m "feat: flat bottom bar and button outline variant"
```

---

### Task 7: Update notification components

**Files:**
- Modify: `src/components/notifications/SidebarActivity.tsx`
- Modify: `src/components/notifications/NotificationSlidePanel.tsx`
- Modify: `src/components/notifications/NotificationItem.tsx`

- [ ] **Step 1: Update SidebarActivity**

In `SidebarActivity.tsx`, the section already uses semantic color classes. No changes needed if the CSS tokens are updated (Task 1 handles this).

- [ ] **Step 2: Update NotificationSlidePanel**

Remove any shadow classes. The panel should use `bg-card` (now lin).

In `NotificationSlidePanel.tsx`, replace:
```
shadow-[0_1px_0_0_hsl(var(--border)/0.5)]
```
with nothing (flat separator via a thin div if needed).

- [ ] **Step 3: Verify build**

Run: `pnpm build`

- [ ] **Step 4: Commit**

```bash
git add src/components/notifications/SidebarActivity.tsx src/components/notifications/NotificationSlidePanel.tsx src/components/notifications/NotificationItem.tsx
git commit -m "feat: flat notification components"
```

---

### Task 8: Update remaining pages

**Files:**
- Modify: `src/pages/Landing.tsx`
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/Settings.tsx`
- Modify: `src/pages/Calendar.tsx`

- [ ] **Step 1: Update Landing.tsx**

Remove all `shadow-[...]` classes. Replace `bg-card` usage — the feature cards should be `bg-card` (now lin). Remove any `border-border` remnants. The footer shadow can be removed.

- [ ] **Step 2: Update Login.tsx**

Input fields: remove `border border-input` on the main email input, use `bg-card` instead (flat). Keep focus ring. The OTP inputs can keep a subtle border for usability.

- [ ] **Step 3: Update Settings.tsx**

Replace remaining `shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)]` → remove. Cards already use `bg-card`.

- [ ] **Step 4: Update Calendar.tsx**

No major changes — the calendar already uses semantic color classes that will update via CSS tokens.

- [ ] **Step 5: Verify build**

Run: `pnpm build`

- [ ] **Step 6: Commit**

```bash
git add src/pages/Landing.tsx src/pages/Login.tsx src/pages/Settings.tsx src/pages/Calendar.tsx
git commit -m "feat: flat design across landing, login, settings, calendar"
```

---

### Task 9: Final sweep + verification

- [ ] **Step 1: Search for remaining shadows**

```bash
grep -r "shadow-\[" src/ --include="*.tsx" -l
```

Remove any remaining `shadow-[2px_0_40px...]` instances that shouldn't be there. Keep shadows only on:
- Modals/overlays (they need elevation)
- Dropdowns/popovers

- [ ] **Step 2: Search for remaining DM Serif Display**

```bash
grep -r "DM Serif" src/ --include="*.tsx" --include="*.css" -l
```

Remove any remaining references.

- [ ] **Step 3: Full build + lint**

```bash
pnpm build
pnpm lint
```

- [ ] **Step 4: Visual check**

Start dev server with `pnpm dev` and verify:
1. Page background is warm white (`#faf8f5`)
2. Cards/blocks are lin (`#f0ebe4`) — no shadows
3. Sidebar is flat lin
4. Explorer shows Netflix portrait event cards
5. Dashboard shows Netflix horizontal event cards
6. Text colors are soft warm brown, not near-black
7. Plus Jakarta Sans on all headings
8. Inter on all body text
9. Tags use pastel system
10. No borders anywhere except form inputs

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: final design system cleanup"
```
