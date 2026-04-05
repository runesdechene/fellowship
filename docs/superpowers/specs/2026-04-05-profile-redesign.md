# Profile Redesign — Design Spec

## Summary

Unify the two profile pages (private `/profil` and public `/@slug`) into a single page at `/@slug`. The profile becomes a brand showcase: ambient gradient header, scrollable event cards, email signup placeholder, and a QR code sharing modal. Friends/followers lists move to the Dashboard.

## Unified Profile Page

- `/@slug` is the single profile page for everyone
- `/profil` redirects to `/@my-slug` (using the connected user's `public_slug`)
- When the visitor IS the profile owner (connected): show "Modifier" button, "QR Code" button, and email placeholder with owner hint
- When the visitor is another connected user: show "Suivre" button
- When the visitor is anonymous (QR code scan): show the vitrine as-is + email placeholder

## Section 1: Ambient Gradient Header

- Full-width ambient gradient with a radial halo glow (warm tones from Fellowship palette)
- Avatar centered (64-72px), rounded-full, with a subtle glow/shadow matching the gradient
- Brand name (`brand_name ?? display_name`) large and centered below avatar
- Subtitle line: métier/type + city (e.g. "Artisan bois · Bordeaux")
- Bio text centered below, max ~300px width, muted color
- If the user has uploaded a banner image: use it as background with a dark overlay (gradient to transparent at bottom)
- If no banner: auto-generated gradient from the Fellowship palette (based on name hash, similar to NotificationItem avatar logic)
- **Top-right corner (owner only):** Two buttons side by side — "Modifier mon profil" (prominent, filled/primary style, links to `/reglages`) + QR Code share button (icon button). Both clearly visible so the owner understands this is THEIR public profile and can edit it.
- **Top-right corner (visitor):** "Suivre" button (FollowButton component)

## Section 2: Event Cards Carousel

- Section title: "Prochains événements" (only if there are upcoming events)
- Horizontally scrollable row of event cards
- Each card contains:
  - Date prominent (day + month, large text)
  - Event name
  - City
  - Primary tag as a small pill/badge
- Scroll with CSS `overflow-x: auto` + `snap-x` for nice snapping
- If no upcoming events: show a subtle empty state ("Aucun événement à venir")
- Section "Événements passés" below, same card style but with reduced opacity (~60%). Only show if there are past events. Collapsed by default or shown inline with visual distinction.

## Section 3: Email Signup Placeholder

- Visual placeholder for future email subscription feature
- Shows: "Restez informé des prochains événements de [Brand Name]"
- Disabled email input field + disabled "S'inscrire" button (non-functional, visual only)
- When the profile owner views it: a small badge/overlay text "Vos visiteurs verront ce formulaire ici" to help them visualize the public experience
- Styled as a card with subtle border, centered

## QR Code Modal

- Triggered by the QR Code button in the header (owner only)
- Centered modal overlay with backdrop blur
- Large QR code SVG (256px or larger display)
- Below QR: the URL `flw.sh/@slug` displayed as text
- "Télécharger en PNG HD" button (generates 1024px PNG, reuse existing QRCodeCard download logic)
- "Copier le lien" button (copies URL to clipboard)
- Close via X button, Escape, or backdrop click

## Route Changes

- `/profil` → `<Navigate to={/@${profile.public_slug}} replace />` (requires auth, reads slug from profile)
- `/@:slug` → unified `ProfilePage` component (replaces both `Profile.tsx` and `PublicProfile.tsx`)

## Dashboard Migration

- Move friends list and followers list from Profile to Dashboard
- Add a "Réseau" section on the Dashboard with:
  - Friends count + list
  - Followers count + list
- Reuse existing friends/followers rendering logic

## Components

### New
- `ProfileHeader` — ambient gradient header with avatar, name, bio, action buttons
- `EventCarousel` — horizontal scrollable event cards
- `EmailSignupPlaceholder` — visual placeholder for future email subscription
- `QRCodeModal` — modal wrapper around QR code with download + copy link

### Modified
- `ProfilePage` (was `PublicProfile.tsx`) — rewritten as unified profile page composing the above components
- `Profile.tsx` → becomes a redirect component
- `Dashboard.tsx` — add friends/followers "Réseau" section
- `App.tsx` — update `/profil` route to redirect

### Removed
- `QRCodeCard.tsx` — replaced by `QRCodeModal`

## Section 4: Footer "Propulsé par Fellowship"

- Fellowship logo (`/logo.png`) displayed centered at the bottom of the page
- White/desaturated, low opacity (~15-20%) — subtle branding, not intrusive
- No link, no text — just the logo mark as a quiet signature
- Adds legitimacy: "this profile is powered by something real"

## Data Fetching

The unified ProfilePage needs:
- Profile data: fetch by `public_slug` from `profiles` table (existing logic from PublicProfile)
- Participations: fetch public participations with event joins (existing logic from PublicProfile)
- Follow status: `useFollowStatus(profile.id)` for the "Suivre" button (existing hook)
- Owner detection: compare `profile.id` with `useAuth().user?.id`

No new database queries or migrations needed.
