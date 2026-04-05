# Explorer Redesign — Design Spec

## Summary

Transform the Explorer page into a Netflix-style event catalog. Full-width layout, horizontal scroll rows by category, hero banner, filter chips (tags + temporal + geo), global search integration, and a "Prospection" mode for exposants showing inscription deadlines and ratings.

## Layout

- **Full-width** — no max-width container, content spans the entire available area
- The global SearchBar at the top filters Explorer content dynamically (search query filters all sections)
- Scrollable Netflix rows take the full width

## Mode Normal (tous les utilisateurs)

### Filter Bar
- Row of pill chips, horizontally scrollable on mobile
- **Tag chips**: Tous (default active), Médiéval, Geek, Musique, Foire, Marché, Salon, Littéraire, Historique, Fantastique — from `PRIMARY_TAGS`
- **Divider** (thin vertical line)
- **Temporal chips**: Cette semaine, Ce mois, À venir
- **Divider**
- **Geo chip**: Près de moi (uses user's city/department from profile)
- Chips toggle on/off. Multiple can be active. "Tous" deactivates other tag chips.
- Active chip: bg-primary text-white. Inactive: bg-card text-muted.

### Hero Banner
- First event (most upcoming with an image, or featured/pinned)
- Full-width, 280px tall, rounded-3xl
- Image background with bottom gradient overlay
- Tag glass badge top-left, title large (28px Jakarta 800), location + date, CTA button "Voir l'événement"

### Netflix Sections
Each section = title + horizontal scroll row of portrait cards.

Sections (in order):
1. **"À venir près de toi"** — events matching user's department, sorted by start_date
2. **One section per active tag** — e.g. "Médiéval & Fantastique", "Geek & Pop Culture" — grouped by primary_tag
3. **"Tes amis y vont"** — events where friends have participations (only if user has friends with participations)
4. **"Ajoutés récemment"** — events sorted by created_at desc

If a filter chip is active, only matching events appear in sections. Empty sections are hidden.

### Portrait Event Cards (Netflix style)
- Width: 200px, aspect-ratio 2/3
- Image full cover (or gradient fallback if no image)
- Bottom gradient: `linear-gradient(180deg, transparent 35%, rgba(15,10,5,0.85) 100%)`
- Tag badge: glass top-left
- Date badge: glass top-right (day large + month small)
- Bottom: event name (14px Jakarta 700 white), city with pin icon
- Friend presence: stacked avatars + "X amis" (if friends attend)
- No image fallback: card/secondary gradient bg, text in dark colors instead of white

## Mode Prospection (exposants only)

### Toggle
- iOS-style switch in the header, next to the page title "Explorer"
- Label: "Prospection" with eye icon
- Only visible when `profile.type === 'exposant'`
- State stored in component (not persisted)

### Behavior when active
- **Only events with open inscription are shown** — either: has `registration_deadline` in the future, OR has no `registration_deadline` set (we don't hide events missing this data)
- Events with `registration_deadline` in the past are hidden
- Filter chips change: temporal chips become "< 30 jours", "< 3 mois", "6-12 mois" (filtering by registration_deadline proximity, only for events that have one)

### Alert Banner
- Shown if there are events with deadline < 30 days
- Card with red-tinted background: "Inscriptions bientôt fermées" + count
- Appears between filters and first section

### Sections in Prospection mode
1. **"🔥 Inscriptions bientôt fermées"** — events with registration_deadline < 30 days, title in red
2. **"Inscription ouverte"** — all other open events, with count badge
3. Tag-based sections still appear if tag filters are active

### Card modifications in Prospection mode
- **Deadline badge** replaces date badge (top-right):
  - Red background: `registration_deadline` < 30 days → "J-X"
  - Orange background: < 3 months → "J-X"
  - Glass/neutral: > 3 months → "J-X"
  - No badge: no `registration_deadline` set → show normal date badge instead
- **Rating** appears below city: star icon + avg_overall + (review_count)
- Badge label: "Inscription" small text above the J-X value

## Search Integration

The global SearchBar already queries events by name. On the Explorer page:
- When the user types in the global search, Explorer sections filter to only show matching events
- The search query is passed down from AppLayout or read from a shared state/URL param
- If search is active + no results in a section → section is hidden
- Clearing search restores all sections

Implementation note: for v1, the search can simply filter the already-fetched events client-side. No need for a separate search API.

## Data Requirements

Events table already has:
- `name`, `city`, `department`, `start_date`, `end_date`, `primary_tag`, `image_url`
- `registration_deadline`, `registration_url`
- Computed: `avg_overall`, `review_count` (from events_with_scores view)

No new database changes needed.

## Components

### New
- `src/pages/Explorer.css` — dedicated CSS file
- No new components — Explorer.tsx is rewritten, uses existing EventCard

### Modified
- `src/pages/Explorer.tsx` — complete rewrite
- `src/components/events/EventCard.tsx` — add prospection variant (deadline badge + rating)

### Search integration
- For v1: Explorer reads a search prop or uses local state synced with the global SearchBar
- Future: URL search params for shareable filtered views

## Responsive
- Mobile: cards 160px wide, rows scroll horizontally, chips scroll horizontally
- Tablet: cards 180px
- Desktop: cards 200px, full-width rows
- Hero: 200px on mobile, 280px on desktop
