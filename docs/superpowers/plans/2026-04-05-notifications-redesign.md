# Notifications Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move desktop notifications from a dedicated page into the sidebar (inline activity section + slide-over panel), keep mobile page, expand notification types, and visually distinguish friend notifications with avatar+glow.

**Architecture:** The sidebar gains two modes: normal nav and notifications panel. A shared `NotificationItem` component is used across sidebar activity, slide-over panel, and mobile page. Friend detection is done client-side by fetching the user's following list and comparing against `actor_id` in notification data. New notification types are added via a Supabase migration.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS v4, Supabase, lucide-react icons

**Spec:** `docs/superpowers/specs/2026-04-05-notifications-redesign.md`

---

## File Structure

### New files
- `src/components/notifications/NotificationItem.tsx` — shared notification item (avatar+glow for friends, neutral for community)
- `src/components/notifications/SidebarActivity.tsx` — inline activity section for sidebar bottom
- `src/components/notifications/NotificationSlidePanel.tsx` — full notification panel that replaces sidebar
- `src/hooks/use-following-ids.ts` — lightweight hook returning Set of user IDs the current user follows (for friend detection)
- `supabase/migrations/20260405130000_add_notification_types.sql` — new enum values

### Modified files
- `src/types/supabase.ts` — add new notification_type enum values
- `src/types/database.ts` — add NotificationData type
- `src/hooks/use-notifications.ts` — add new type labels/icons, accept followingIds for friend detection
- `src/components/layout/Sidebar.tsx` — remove notif nav link, widen to w-72, integrate SidebarActivity, add slide-over panel mode
- `src/components/layout/BottomBar.tsx` — remove notif from nav (keep bell separately with badge)
- `src/pages/Notifications.tsx` — upgrade from placeholder to full list using NotificationItem

### Removed files
- `src/components/notifications/NotificationBell.tsx` — replaced by SidebarActivity
- `src/components/notifications/NotificationPanel.tsx` — replaced by NotificationSlidePanel

---

### Task 1: Database migration — add new notification types

**Files:**
- Create: `supabase/migrations/20260405130000_add_notification_types.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add new notification types for full platform activity monitoring
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_image_added';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_info_added';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260405130000_add_notification_types.sql
git commit -m "feat: add new notification types for platform activity"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `src/types/supabase.ts:478-482`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Add new enum values to supabase.ts**

In `src/types/supabase.ts`, update the `notification_type` enum (around line 478):

```typescript
      notification_type:
        | "deadline_reminder"
        | "friend_going"
        | "new_follower"
        | "friend_note"
        | "event_created"
        | "event_updated"
        | "event_image_added"
        | "event_info_added"
```

- [ ] **Step 2: Add NotificationData interface to database.ts**

Append to `src/types/database.ts`:

```typescript
// Notification data payload (stored in JSONB `data` column)
export interface NotificationData {
  actor_id?: string
  actor_name?: string
  event_id?: string
  event_name?: string
  friend_name?: string
  follower_name?: string
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: no type errors

- [ ] **Step 4: Commit**

```bash
git add src/types/supabase.ts src/types/database.ts
git commit -m "feat: add new notification types and NotificationData interface"
```

---

### Task 3: Create `use-following-ids` hook

**Files:**
- Create: `src/hooks/use-following-ids.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export function useFollowingIds() {
  const { user } = useAuth()
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return

    async function fetch() {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user!.id)

      setFollowingIds(new Set((data ?? []).map(r => r.following_id)))
    }

    fetch()
  }, [user])

  return followingIds
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-following-ids.ts
git commit -m "feat: add useFollowingIds hook for friend detection"
```

---

### Task 4: Create shared `NotificationItem` component

**Files:**
- Create: `src/components/notifications/NotificationItem.tsx`

- [ ] **Step 1: Write the component**

This component renders a single notification. It takes a `notification`, an `isFriend` boolean, and an `onRead` callback. Friend notifications show an avatar with glow; community notifications are neutral.

```tsx
import { Link } from 'react-router-dom'
import { Users, UserPlus, Clock, MessageSquare, Calendar, ImagePlus, FileEdit, Info } from 'lucide-react'
import type { Notification, NotificationData } from '@/types/database'

const GRADIENTS = [
  ['#f0a060', '#e74c3c'],
  ['#6c5ce7', '#a29bfe'],
  ['#00b894', '#00cec9'],
  ['#fd79a8', '#e84393'],
  ['#f39c12', '#d68910'],
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

function ActorAvatar({ name }: { name: string }) {
  const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full"
      style={{
        width: 22,
        height: 22,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 0 8px ${from}66`,
        fontSize: 9,
        fontWeight: 700,
        color: 'white',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

const TYPE_CONFIG: Record<string, { icon: typeof Users; color: string; label: (d: NotificationData) => string; link: (d: NotificationData) => string }> = {
  friend_going: {
    icon: Users,
    color: 'text-primary',
    label: (d) => `${d.actor_name ?? d.friend_name ?? 'Un ami'} participe à ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  new_follower: {
    icon: UserPlus,
    color: 'text-accent',
    label: (d) => `${d.actor_name ?? d.follower_name ?? 'Quelqu\'un'} te suit`,
    link: () => '/profil',
  },
  deadline_reminder: {
    icon: Clock,
    color: 'text-destructive',
    label: (d) => `Inscription pour ${d.event_name ?? 'un événement'} bientôt`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  friend_note: {
    icon: MessageSquare,
    color: 'text-primary',
    label: (d) => `${d.actor_name ?? d.friend_name ?? 'Un ami'} a laissé une note sur ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_created: {
    icon: Calendar,
    color: 'text-primary',
    label: (d) => `${d.actor_name ?? 'Quelqu\'un'} a ajouté ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_updated: {
    icon: FileEdit,
    color: 'text-muted-foreground',
    label: (d) => `${d.event_name ?? 'Un événement'} a été modifié`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_image_added: {
    icon: ImagePlus,
    color: 'text-muted-foreground',
    label: (d) => `Photo ajoutée sur ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
  event_info_added: {
    icon: Info,
    color: 'text-muted-foreground',
    label: (d) => `Info ajoutée sur ${d.event_name ?? 'un événement'}`,
    link: (d) => d.event_id ? `/evenement/${d.event_id}` : '/explorer',
  },
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface NotificationItemProps {
  notification: Notification
  isFriend: boolean
  onRead: (id: string) => void
  compact?: boolean
}

export function NotificationItem({ notification, isFriend, onRead, compact = false }: NotificationItemProps) {
  const data = (notification.data ?? {}) as NotificationData
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.event_created
  const Icon = config.icon
  const label = config.label(data)
  const link = config.link(data)
  const actorName = data.actor_name ?? data.friend_name ?? data.follower_name

  return (
    <Link
      to={link}
      onClick={() => !notification.read && onRead(notification.id)}
      className={`flex items-start gap-2.5 rounded-lg transition-colors hover:bg-muted ${
        compact ? 'px-2 py-1.5' : 'p-3'
      } ${!notification.read ? 'bg-primary/5' : ''} ${!isFriend && !compact ? 'opacity-60' : ''}`}
    >
      {isFriend && actorName ? (
        <ActorAvatar name={actorName} />
      ) : (
        <div className={`mt-0.5 ${isFriend ? '' : 'ml-0.5'}`} style={!isFriend ? { width: 22 } : undefined}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`${compact ? 'text-xs' : 'text-sm'} ${!notification.read ? 'font-medium' : 'text-muted-foreground'} leading-snug`}>
          {label}
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(notification.created_at)}</p>
        )}
      </div>
      {!notification.read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />}
    </Link>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications/NotificationItem.tsx
git commit -m "feat: shared NotificationItem with avatar+glow for friends"
```

---

### Task 5: Create `SidebarActivity` component

**Files:**
- Create: `src/components/notifications/SidebarActivity.tsx`

- [ ] **Step 1: Write the component**

Shows the 3-5 most recent notifications inline at the bottom of the sidebar. Accepts an `onShowAll` callback to trigger the slide-over panel.

```tsx
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from './NotificationItem'

interface SidebarActivityProps {
  collapsed: boolean
  onShowAll: () => void
}

export function SidebarActivity({ collapsed, onShowAll }: SidebarActivityProps) {
  const { notifications, unreadCount, markAsRead } = useNotifications()
  const followingIds = useFollowingIds()
  const recent = notifications.slice(0, 4)

  if (collapsed) {
    return (
      <button
        onClick={onShowAll}
        className="relative flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Activité
        </span>
        {unreadCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="px-2.5 py-2 text-xs text-muted-foreground">Aucune activité récente</p>
      ) : (
        <div className="space-y-0.5">
          {recent.map(n => {
            const data = (n.data ?? {}) as Record<string, unknown>
            const actorId = typeof data.actor_id === 'string' ? data.actor_id : undefined
            return (
              <NotificationItem
                key={n.id}
                notification={n}
                isFriend={!!actorId && followingIds.has(actorId)}
                onRead={markAsRead}
                compact
              />
            )
          })}
        </div>
      )}
      <button
        onClick={onShowAll}
        className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-center text-[0.6875rem] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        Voir tout →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications/SidebarActivity.tsx
git commit -m "feat: SidebarActivity component for inline notifications"
```

---

### Task 6: Create `NotificationSlidePanel` component

**Files:**
- Create: `src/components/notifications/NotificationSlidePanel.tsx`

- [ ] **Step 1: Write the component**

Full notifications panel that replaces the sidebar in-place. Shows all notifications, scrollable, with "← Retour" and "Tout lire" buttons.

```tsx
import { useEffect } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from './NotificationItem'
import { Button } from '@/components/ui/button'

interface NotificationSlidePanelProps {
  onClose: () => void
}

export function NotificationSlidePanel({ onClose }: NotificationSlidePanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <div className="flex-1" />
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
            <Check className="mr-1 h-3 w-3" />
            Tout lire
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto p-2">
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Aucune notification</p>
        ) : (
          <div className="space-y-0.5">
            {notifications.map(n => {
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
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications/NotificationSlidePanel.tsx
git commit -m "feat: NotificationSlidePanel replaces sidebar in-place"
```

---

### Task 7: Modify Sidebar — integrate activity section + slide-over

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar**

Key changes:
1. Width from `w-60` to `w-72` (expanded) and `w-[60px]` stays (collapsed)
2. Remove `Bell`/Notifications from both `exposantNav` and `publicNav`
3. Add `showNotifPanel` state
4. When `showNotifPanel` is true, render `NotificationSlidePanel` instead of normal sidebar content
5. Integrate `SidebarActivity` at the bottom of the nav area

Replace the full content of `src/components/layout/Sidebar.tsx`:

```tsx
import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  CalendarDays,
  Compass,
  User,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Users,
} from 'lucide-react'
import { SidebarActivity } from '@/components/notifications/SidebarActivity'
import { NotificationSlidePanel } from '@/components/notifications/NotificationSlidePanel'

const exposantNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/calendrier', icon: CalendarDays, label: 'Calendrier' },
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

const publicNav = [
  { to: '/explorer', icon: Compass, label: 'Explorer' },
  { to: '/suivis', icon: Users, label: 'Mes suivis' },
  { to: '/profil', icon: User, label: 'Profil' },
  { to: '/reglages', icon: Settings, label: 'Réglages' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const { profile } = useAuth()
  const nav = profile?.type === 'exposant' ? exposantNav : publicNav

  return (
    <aside
      className={`hidden md:flex flex-col bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[60px]' : 'w-72'
      }`}
    >
      {showNotifPanel ? (
        <NotificationSlidePanel onClose={() => setShowNotifPanel(false)} />
      ) : (
        <>
          {/* Header: logo + collapse toggle */}
          <div className="flex h-14 items-center justify-between px-3">
            <Link
              to={profile?.type === 'exposant' ? '/dashboard' : '/explorer'}
              className="flex items-center overflow-hidden"
            >
              {collapsed ? (
                <img src="/icon.png" alt="Fellowship" className="h-7 w-7 shrink-0" />
              ) : (
                <img src="/logo.png" alt="Fellowship" className="h-7 shrink-0" />
              )}
            </Link>
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 px-2 pt-2">
            {nav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[0.8125rem] font-medium ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${collapsed ? 'justify-center px-0' : ''}`
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Activity section */}
          <div className="border-t border-border mt-2 pt-2">
            <SidebarActivity collapsed={collapsed} onShowAll={() => setShowNotifPanel(true)} />
          </div>

          {/* Expand button (only visible when collapsed) */}
          {collapsed && (
            <div className="px-2 pb-3">
              <button
                onClick={() => setCollapsed(false)}
                className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: sidebar with activity section + slide-over notif panel"
```

---

### Task 8: Update BottomBar — keep bell for mobile

**Files:**
- Modify: `src/components/layout/BottomBar.tsx`

- [ ] **Step 1: Update BottomBar**

Remove `Notifications` from the nav arrays but keep the bell icon linking to `/notifications`. The bell stays in the BottomBar for mobile access. No functional change — just remove the duplicate entry so `Bell` is no longer imported from the nav config and added explicitly.

Actually, looking at the current code, the bell is already in the nav arrays linking to `/notifications`. This is fine for mobile — keep it exactly as-is. **No changes needed to BottomBar.tsx.**

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors (no changes made)

---

### Task 9: Upgrade NotificationsPage for mobile

**Files:**
- Modify: `src/pages/Notifications.tsx`

- [ ] **Step 1: Rewrite NotificationsPage**

Upgrade from the current placeholder to a full notification list using `NotificationItem`.

```tsx
import { Bell, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { Button } from '@/components/ui/button'

export function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()

  return (
    <div className="page-width p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="mr-1 h-3 w-3" />
            Tout lire
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Chargement...</p>
      ) : notifications.length === 0 ? (
        <div className="py-16 text-center">
          <Bell className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {notifications.map(n => {
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

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Notifications.tsx
git commit -m "feat: full NotificationsPage for mobile with friend detection"
```

---

### Task 10: Remove old notification components

**Files:**
- Delete: `src/components/notifications/NotificationBell.tsx`
- Delete: `src/components/notifications/NotificationPanel.tsx`

- [ ] **Step 1: Check for remaining imports**

Search the codebase for any imports of `NotificationBell` or `NotificationPanel`:

```bash
cd /c/Users/uriel/desktop/DEVS/fellowship && grep -r "NotificationBell\|NotificationPanel" src/ --include="*.tsx" --include="*.ts" -l
```

If any files still import these, remove the imports. The `Sidebar.tsx` was already rewritten in Task 7 without them. Check `AppLayout.tsx` and any other files.

- [ ] **Step 2: Delete the old files**

```bash
rm src/components/notifications/NotificationBell.tsx
rm src/components/notifications/NotificationPanel.tsx
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: no errors — no remaining references to deleted components

- [ ] **Step 4: Commit**

```bash
git add -u src/components/notifications/NotificationBell.tsx src/components/notifications/NotificationPanel.tsx
git commit -m "chore: remove old NotificationBell and NotificationPanel"
```

---

### Task 11: Final integration verification

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Expected: clean build, no errors

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: no new lint errors

- [ ] **Step 3: Visual check**

Start dev server with `pnpm dev` and verify:
1. Sidebar is wider (w-72, 288px)
2. No "Notifications" link in sidebar nav
3. Activity section visible at bottom of sidebar with recent notifications
4. Clicking "Voir tout →" replaces sidebar with slide-over panel
5. "← Retour" closes panel and restores sidebar
6. Collapsed sidebar shows bell icon with badge
7. Clicking bell in collapsed sidebar opens slide-over panel
8. Mobile BottomBar still has bell linking to /notifications
9. /notifications page shows full list with friend avatar+glow styling

- [ ] **Step 4: Final commit if any fixups needed**

```bash
git add -A
git commit -m "fix: final integration adjustments for notifications redesign"
```
