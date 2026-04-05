# Notifications Redesign — Design Spec

## Summary

Move notifications from a dedicated desktop page to an inline activity section at the bottom of the sidebar. Mobile keeps the full `/notifications` page. Expand notification types to cover all platform activity. Visually distinguish friend notifications with avatar+glow styling.

## Desktop: Sidebar Activity Section

- Sidebar width increases from `w-60` (240px) to `w-72` (288px) — +48px for the activity section
- Remove "Notifications" link from sidebar nav (both exposant and public nav arrays)
- Add an "Activité" section at the bottom of the sidebar, below the nav items, above the collapse button
- Shows the 3-5 most recent notifications inline
- Friend notifications display: miniature avatar (initial letter + gradient background) with a subtle glow/shadow
- Community notifications display: no avatar, reduced opacity, left-padded to align with friend notif text
- Unread count badge on the section header ("🔔 Activité" + badge)
- "Voir tout →" link at the bottom opens the slide-over panel
- When sidebar is collapsed: show only a bell icon with unread badge (clicking opens the slide-over panel directly)

## Desktop: Slide-Over Notifications Panel

- Panel replaces the sidebar in-place — same width, same position. The sidebar content is hidden while the panel is open.
- "← Retour" button in the top-left corner closes the panel and restores the sidebar
- No backdrop, no extra width — zero impact on the central content layout
- Full notification history, scrollable
- Same styling rules: friend notifs have avatar+glow, community notifs are neutral
- Header with "← Retour" on the left + "Tout lire" button on the right (mark all as read)
- Click a notification → navigates to the relevant page + closes panel
- Close via Retour button or Escape key
- Smooth slide/crossfade transition between sidebar and panel (~200ms ease)

## Mobile: No Change

- BottomBar keeps the bell icon linking to `/notifications`
- `/notifications` route stays — renders the full `NotificationsPage`
- `NotificationsPage` gets upgraded from placeholder to full notification list (same item styling as modal)

## Notification Types

### Existing (no change to trigger logic)
- `friend_going` — a followed user participates in an event → notify the follower
- `friend_note` — a followed user leaves a note → notify the follower
- `new_follower` — someone follows you → notify you
- `deadline_reminder` — registration deadline approaching → notify participants

### New types
- `event_created` — any user creates an event → broadcast to ALL users (early-stage community signal)
- `event_updated` — event details modified → notify participants + followers of creator
- `event_image_added` — image added to an event → notify participants + followers of creator
- `event_info_added` — note/info added to an event → notify participants + followers of creator

### Database
- Add new enum values to `notification_type`: `event_created`, `event_updated`, `event_image_added`, `event_info_added`
- Notification `data` JSONB must include `actor_id` and `actor_name` for friend detection
- Friend detection: query follows table to check if notification actor is someone the current user follows

## Friend Detection Logic

A notification is a "friend notification" when the `actor_id` in the notification data matches someone the current user follows. This is checked client-side using the existing follows data from `use-follows.ts`.

## Components

### New
- `SidebarActivity` — the inline activity section for the sidebar
- `NotificationSlidePanel` — slide-over panel from the left for "Voir tout"
- `NotificationItem` — shared notification item component (used by SidebarActivity, NotificationSlidePanel, and NotificationsPage)

### Modified
- `Sidebar` — remove notifications nav link, integrate SidebarActivity at bottom
- `BottomBar` — keep as-is (bell stays)
- `NotificationsPage` — upgrade from placeholder to full list using NotificationItem
- `useNotifications` — add friend detection, add support for new notification types

### Removed
- `NotificationBell` — no longer needed (sidebar handles desktop, BottomBar handles mobile)
- `NotificationPanel` — replaced by NotificationSlidePanel

## Avatar+Glow Styling

For friend notifications, render a 22px circle with:
- Background: gradient based on a hash of the actor's name (from a small palette of warm/artisan gradients)
- Content: first letter of actor name, white, bold, 9px
- Box-shadow: `0 0 8px` with the gradient's primary color at 40% opacity
- Positioned to the left of the notification text

Community notifications have no avatar, text is left-padded by ~30px to align with friend notif text content.
