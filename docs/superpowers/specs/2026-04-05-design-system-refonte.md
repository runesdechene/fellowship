# Design System Refonte — Design Spec

## Summary

Complete visual overhaul of Fellowship's design system. Replaces the current "2015" look with a modern, flat, warm design inspired by Finary (premium feel) and Netflix (event cards). Light theme, Plus Jakarta Sans + Inter typography, lin-toned flat surfaces, portrait event cards with image overlays.

## Typography

### Fonts
- **Display/Headings:** Plus Jakarta Sans — weights 700 and 800, letter-spacing -0.025em
- **Body/UI:** Inter — weights 400, 500, 600
- Replace all DM Serif Display references with Plus Jakarta Sans
- Remove DM Serif Display from Google Fonts import

### Scale (increased from current)
- Page titles (h1): 28-32px, Jakarta 800
- Section headings (h2): 16-18px, Jakarta 700
- Card titles: 15-17px, Jakarta 700
- Body text: 14-15px, Inter 400
- Secondary text: 12-13px, Inter 400
- Labels/captions: 10-11px, Inter 500-600, uppercase tracking-widest
- Tags: 10px, Inter 500

## Color Palette

### Surfaces (inverted from current)
- **Page background:** `#faf8f5` (warm white) — was `#f8f3ee` (linen)
- **Card/block background:** `#f0ebe4` (linen) — was white
- **Sidebar background:** `#f0ebe4` (same linen, flat, no glass)
- No shadows on cards — flat design. Depth via background color contrast only.

### Text (softer than current)
- **Headings:** `#3d3028` (warm dark brown, not near-black)
- **Body:** `rgba(61,48,40,0.65)`
- **Secondary/muted:** `rgba(61,48,40,0.35)`
- **Faint/labels:** `rgba(61,48,40,0.2)`
- **Activity label:** `rgba(61,48,40,0.4)` (exception — slightly stronger for readability)

### Accents (unchanged)
- **Primary (copper):** `hsl(24 72% 44%)` — buttons, active states, dates
- **Forest green:** `hsl(152 32% 40%)` — secondary accent
- **Destructive:** `hsl(0 65% 55%)`

### Tags (pastel system)
- Background: hue at 10% opacity
- Text: saturated hue
- Examples: médiéval `hsl(24 72% 44%)`, geek `hsl(220 70% 50%)`, marché `hsl(152 32% 40%)`, festival `hsl(340 60% 55%)`, foire `hsl(40 80% 50%)`, fantastique `hsl(280 50% 55%)`, littéraire `hsl(190 60% 45%)`, historique `hsl(10 70% 50%)`

## Event Cards — Netflix Style

### Explorer Grid (portrait cards)
- Size: ~200px wide, ~300px tall (responsive)
- Image covers entire card
- Bottom gradient: `linear-gradient(180deg, transparent 40%, rgba(15,10,5,0.85) 100%)`
- Tag top-left: glass style `background:rgba(255,255,255,0.15)`, white text
- Date badge top-right: glass blur container, day large (18px Jakarta 800), month small uppercase
- Content bottom: event name (16px Jakarta 700 white), city with pin icon (11px, white/50%)
- No image fallback: lin gradient background, subtle calendar icon centered, text in dark tones instead of white

### Dashboard List (horizontal cards)
- Full width, 120px tall
- Image covers entire card
- Left gradient: `linear-gradient(90deg, rgba(15,10,5,0.75) 0%, rgba(15,10,5,0.3) 50%, transparent 100%)`
- Layout: date left (28px Jakarta 800), name + city center, countdown badge right
- All text white over the gradient
- No image fallback: lin gradient background with dark text

## Sidebar

- Background: `#f0ebe4` flat (no glass, no backdrop-filter, no shadow)
- Width: keep current w-72
- Nav items: 13px Inter 500, inactive `rgba(61,48,40,0.4)`, active `hsl(24 72% 44%)` with `hsl(24 72% 44% / 0.1)` background
- Border-radius on nav items: 12px
- Icons: Lucide SVG stroke 1.5 (already using lucide-react, just need to remove any emoji usage)
- Activity section separator: 1px line `rgba(61,48,40,0.06)`
- Activity label: `rgba(61,48,40,0.4)`, 10px uppercase

## Components to Update

### Global (index.css + index.html)
- Google Fonts: replace DM Serif Display with Plus Jakarta Sans
- CSS variables: update `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`, `--muted-foreground`
- Body font-size: 15px
- Heading font-family: Plus Jakarta Sans
- Remove all box-shadow from card utility patterns

### Pages
- `Dashboard.tsx` — event cards to horizontal Netflix style, update text colors
- `Explorer.tsx` — event cards to portrait Netflix grid, search input flat style
- `EventPage.tsx` — update text colors and spacing
- `Calendar.tsx` — update text colors
- `Landing.tsx` — update to new design tokens
- `Login.tsx` — update to new design tokens
- `Settings.tsx` — update card backgrounds to lin
- `Notifications.tsx` — update text colors
- `PublicProfile.tsx` — already mostly updated, adjust colors

### Components
- `EventCard.tsx` — rewrite as Netflix-style card (portrait for Explorer, horizontal for Dashboard)
- `Sidebar.tsx` — flat lin background, remove shadow
- `BottomBar.tsx` — update to flat style
- `AppLayout.tsx` — update background
- `NotificationItem.tsx` — update text colors
- `SidebarActivity.tsx` — update text colors, label opacity
- `NotificationSlidePanel.tsx` — update to flat style
- `button.tsx` — update outline variant (no border, use background instead)

### CSS Token Changes
```
--background: 38 22% 97%  →  36 33% 98%     (#faf8f5)
--foreground: 30 10% 15%  →  24 15% 20%     (#3d3028)
--card: 40 18% 99%        →  30 18% 92%     (#f0ebe4)
--card-foreground: same as foreground
--muted: 38 16% 91%       →  30 15% 89%     (#e8e2da)
--muted-foreground: 30 8% 45%  →  24 12% 40% (rgba(61,48,40,0.65) equivalent)
```

## What NOT to Change
- Routing structure
- Data fetching logic
- Hook implementations
- Supabase queries
- Auth flow
- PWA configuration
