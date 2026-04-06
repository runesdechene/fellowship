# Event Page Redesign v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte de la page événement en layout 2 colonnes continu inspiré Lu.ma — colonne gauche étroite (poster + infos), colonne droite large (flow continu titre → contenu).

**Architecture:** Layout 2 colonnes unique du haut en bas. Gauche (260px) : poster, ajouté par, liens, amis. Droite (flex:1) : tags, titre, meta-rows, mon suivi inline, notes/avis, à propos. Le composant EventHero est supprimé, son contenu est intégré directement dans EventPage.

**Tech Stack:** React 19, TypeScript, CSS custom (EventPage.css), Supabase queries, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-04-06-event-page-redesign-v2.md`
**Maquette:** `.superpowers/brainstorm/9924-1775505826/content/event-page-luma-v4.html`

---

### Task 1: New EventPage.css

**Files:**
- Rewrite: `src/pages/EventPage.css`

- [ ] **Step 1: Replace EventPage.css with the new 2-column layout styles**

Replace the entire file content with:

```css
/* src/pages/EventPage.css — Event Page Redesign v2 */

/* ── Page container ───────────────────────────────────────────────── */

.event-page {
  max-width: 960px;
  margin-left: auto;
  margin-right: auto;
  padding: var(--page-padding);
  padding-bottom: 80px;
}

/* ── Back button ──────────────────────────────────────────────────── */

.event-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(61, 48, 40, 0.5);
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 24px;
  padding: 6px 12px 6px 8px;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}

.event-back:hover {
  background: rgba(61, 48, 40, 0.06);
  color: hsl(var(--foreground));
}

.event-back svg {
  width: 16px;
  height: 16px;
}

/* ── Top bar (back + edit) ────────────────────────────────────────── */

.event-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.event-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: hsl(var(--muted));
  border: none;
  cursor: pointer;
  color: rgba(61, 48, 40, 0.5);
  transition: background 0.15s, color 0.15s;
}

.event-edit-btn:hover {
  background: hsl(var(--muted) / 0.8);
  color: hsl(var(--foreground));
}

/* ── Full 2-column layout ─────────────────────────────────────────── */

.event-two-col {
  display: flex;
  gap: 32px;
}

/* Left column */
.event-col-left {
  width: 260px;
  flex-shrink: 0;
}

.event-col-left-sticky {
  position: sticky;
  top: 20px;
}

/* Right column */
.event-col-right {
  flex: 1;
  min-width: 0;
}

/* ── Poster ───────────────────────────────────────────────────────── */

.event-poster {
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(140, 80, 30, 0.18);
  margin-bottom: 20px;
}

.event-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-poster-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, hsl(var(--primary)), hsl(24 60% 28%));
  color: white;
}

.event-poster-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.2;
}

/* ── Left column cards ────────────────────────────────────────────── */

.event-left-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 16px;
}

.event-left-card-label {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(61, 48, 40, 0.4);
  margin-bottom: 12px;
}

/* Organizer row */
.event-organizer-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.event-organizer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.event-organizer-avatar-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.event-organizer-name {
  font-size: 14px;
  font-weight: 600;
}

.event-organizer-role {
  font-size: 12px;
  color: rgba(61, 48, 40, 0.5);
}

/* Links list */
.event-links-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-link-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  text-decoration: none;
  color: hsl(var(--foreground));
  font-size: 13px;
  font-weight: 500;
  transition: border-color 0.15s, color 0.15s;
}

.event-link-item:hover {
  border-color: hsl(var(--primary) / 0.3);
  color: hsl(var(--primary));
}

.event-link-item svg {
  width: 16px;
  height: 16px;
  color: rgba(61, 48, 40, 0.5);
  flex-shrink: 0;
}

.event-link-item.primary {
  border-color: hsl(var(--primary) / 0.3);
  color: hsl(var(--primary));
}

/* Friends vertical list */
.event-friends-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-friend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
  padding: 4px 6px;
  margin: -4px -6px;
  border-radius: 8px;
  transition: background 0.15s;
}

.event-friend-row:hover {
  background: rgba(61, 48, 40, 0.04);
}

.event-friend-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.event-friend-avatar-fallback {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.event-friend-name {
  font-size: 13px;
  font-weight: 600;
}

.event-friend-status {
  font-size: 10px;
  font-weight: 600;
}

.event-friend-status.inscrit { color: hsl(152 50% 38%); }
.event-friend-status.en_cours { color: hsl(210 60% 50%); }
.event-friend-status.interesse { color: hsl(38 90% 50%); }

/* ── Right column: tags, title, meta ──────────────────────────────── */

.event-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.event-tag-primary {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.event-tag-secondary {
  background: rgba(61, 48, 40, 0.06);
  color: rgba(61, 48, 40, 0.5);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.event-title {
  font-family: var(--font-heading);
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: hsl(var(--foreground));
  margin: 0 0 20px 0;
}

/* Meta rows */
.event-meta-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.event-meta-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.event-meta-row-clickable {
  cursor: pointer;
  border-radius: 8px;
  padding: 4px 6px;
  margin: -4px -6px;
  transition: background 0.15s;
}

.event-meta-row-clickable:hover {
  background: rgba(61, 48, 40, 0.05);
}

.event-meta-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.event-meta-icon svg {
  width: 18px;
  height: 18px;
  color: rgba(61, 48, 40, 0.5);
}

.event-meta-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-top: 2px;
}

.event-meta-primary {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.event-meta-secondary {
  font-size: 12px;
  color: rgba(61, 48, 40, 0.5);
}

/* ── Mon suivi (inline in right col) ──────────────────────────────── */

.event-suivi {
  background: hsl(36 50% 96%);
  border: 1px solid hsl(30 25% 85%);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 24px;
}

.event-suivi-header {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 700;
  color: hsl(var(--primary));
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid hsl(30 25% 85%);
  display: flex;
  align-items: center;
  gap: 6px;
}

.event-suivi-grid {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.event-suivi-block {
  flex: 1;
  min-width: 120px;
}

.event-suivi-block-label {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 6px;
}

.event-suivi-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.event-suivi-action {
  padding: 6px 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: transparent;
  font-family: var(--font-body);
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  color: rgba(61, 48, 40, 0.5);
}

.event-suivi-action:hover {
  border-color: hsl(var(--primary) / 0.3);
  color: hsl(var(--primary));
}

.event-suivi-action.destructive {
  border-color: hsl(0 65% 80%);
  color: hsl(0 65% 45%);
}

.event-suivi-action.destructive:hover {
  background: hsl(0 65% 55% / 0.05);
}

/* Steppers (reused from old) */
.event-stepper {
  display: flex;
  gap: 3px;
}

.event-stepper-btn {
  flex: 1;
  text-align: center;
  padding: 7px 2px;
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.event-stepper-btn.active {
  background: hsl(var(--primary));
  color: white;
}

.event-stepper-btn.active.interesse {
  background: hsl(38 90% 50%);
}

.event-stepper-btn.active.en_cours {
  background: hsl(210 60% 50%);
}

.event-stepper-btn.active.inscrit {
  background: hsl(152 50% 38%);
}

.event-stepper-btn.passed {
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
}

.event-stepper-btn.inactive {
  background: rgba(61, 48, 40, 0.06);
  color: rgba(61, 48, 40, 0.4);
}

.event-stepper-btn.inactive:hover {
  background: rgba(61, 48, 40, 0.1);
}

/* Payment stepper */
.event-stepper-btn.pay-active.a_payer { background: hsl(0 65% 55% / 0.12); color: hsl(0 65% 45%); }
.event-stepper-btn.pay-active.en_cours_paiement { background: hsl(38 90% 50% / 0.15); color: hsl(38 80% 35%); }
.event-stepper-btn.pay-active.paye { background: hsl(152 50% 38% / 0.15); color: hsl(152 50% 32%); }

/* Info box (ephemeral) */
.event-info-box {
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 10px;
  font-family: var(--font-body);
  animation: event-info-box-in 0.25s ease-out;
  cursor: pointer;
}

.event-info-box-title { font-size: 11px; font-weight: 700; margin-bottom: 3px; }
.event-info-box-text { font-size: 11px; line-height: 1.5; }

.event-info-box.interesse { background: hsl(38 90% 50% / 0.08); border: 1px solid hsl(38 90% 50% / 0.2); }
.event-info-box.interesse .event-info-box-title { color: hsl(38 80% 40%); }
.event-info-box.interesse .event-info-box-text { color: hsl(30 50% 30%); }

.event-info-box.en_cours { background: hsl(210 60% 50% / 0.08); border: 1px solid hsl(210 60% 50% / 0.2); }
.event-info-box.en_cours .event-info-box-title { color: hsl(210 60% 45%); }
.event-info-box.en_cours .event-info-box-text { color: hsl(210 30% 25%); }

.event-info-box.inscrit { background: hsl(152 50% 38% / 0.08); border: 1px solid hsl(152 50% 38% / 0.2); }
.event-info-box.inscrit .event-info-box-title { color: hsl(152 50% 32%); }
.event-info-box.inscrit .event-info-box-text { color: hsl(152 25% 22%); }

@keyframes event-info-box-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* CTA (no participation) */
.event-cta {
  padding: 20px;
  text-align: center;
}

.event-cta-title {
  font-family: var(--font-heading);
  font-size: 16px;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin-bottom: 12px;
}

.event-cta-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ── Separator ────────────────────────────────────────────────────── */

.event-separator {
  height: 1px;
  background: hsl(var(--border));
  margin-bottom: 24px;
}

/* ── Section cards (right column content) ─────────────────────────── */

.event-section-card {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 20px;
}

.event-section-title {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-section-title.muted {
  color: rgba(61, 48, 40, 0.5);
}

/* Notes + Avis side by side */
.event-notes-reviews {
  display: flex;
  gap: 16px;
}

.event-notes-reviews > div {
  flex: 1;
  min-width: 0;
}

/* ── Mobile ───────────────────────────────────────────────────────── */

@media (max-width: 767px) {
  .event-two-col {
    flex-direction: column;
    align-items: center;
  }

  .event-col-left {
    width: 220px;
    text-align: center;
  }

  .event-col-right {
    width: 100%;
  }

  .event-col-left-sticky {
    position: static;
  }

  .event-tags {
    justify-content: center;
  }

  .event-title {
    text-align: center;
  }

  .event-meta-list {
    align-items: center;
  }

  .event-suivi-grid {
    flex-direction: column;
  }

  .event-notes-reviews {
    flex-direction: column;
  }

  .event-friends-col {
    align-items: center;
  }

  .event-page {
    padding-bottom: 80px;
  }
}
```

- [ ] **Step 2: Verify the file saved correctly**

Run: `wc -l src/pages/EventPage.css`
Expected: ~400+ lines

- [ ] **Step 3: Commit**

```bash
git add src/pages/EventPage.css
git commit -m "refactor: rewrite EventPage.css for 2-column Lu.ma-inspired layout"
```

---

### Task 2: Fetch "Ajouté par" creator profile

**Files:**
- Modify: `src/hooks/use-events.ts`

The `useEvent` hook currently fetches just the event. We need the creator profile too (`created_by` → `profiles`).

- [ ] **Step 1: Update useEvent to join creator profile**

Add a new hook `useEventCreator` at the end of `src/hooks/use-events.ts`:

```typescript
export function useEventCreator(createdBy: string | null | undefined) {
  const [creator, setCreator] = useState<{
    id: string
    display_name: string | null
    brand_name: string | null
    avatar_url: string | null
    public_slug: string | null
    craft_type: string | null
  } | null>(null)

  useEffect(() => {
    if (!createdBy) return
    supabase
      .from('profiles')
      .select('id, display_name, brand_name, avatar_url, public_slug, craft_type')
      .eq('id', createdBy)
      .single()
      .then(({ data }) => {
        if (data) setCreator(data)
      })
  }, [createdBy])

  return creator
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-events.ts
git commit -m "feat: add useEventCreator hook to fetch event creator profile"
```

---

### Task 3: Rewrite EventPage.tsx with 2-column layout

**Files:**
- Rewrite: `src/pages/EventPage.tsx`

This is the main task. The new layout is a single 2-column structure from top to bottom. EventHero is no longer used — its content is inlined.

- [ ] **Step 1: Rewrite EventPage.tsx**

Replace the view-mode render (the `<div>` inside the `else` branch after the editing block, lines 332-428) with the new 2-column layout. Keep ALL existing state, hooks, handlers, and edit mode unchanged. Only the view-mode JSX changes.

The new view-mode JSX structure:

```tsx
<div className="event-two-col">
  {/* ── LEFT COLUMN ── */}
  <div className="event-col-left">
    {/* Poster */}
    <div className="event-poster">
      {event.image_url ? (
        <img src={event.image_url} alt={event.name} />
      ) : (
        <div className="event-poster-empty">
          <ImageIcon strokeWidth={1} />
        </div>
      )}
    </div>

    <div className="event-col-left-sticky">
      {/* Ajouté par */}
      {creator && (
        <div className="event-left-card">
          <div className="event-left-card-label">Ajouté par</div>
          <Link to={`/@${creator.public_slug ?? creator.id}`} className="event-organizer-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt={creatorName} className="event-organizer-avatar" />
            ) : (
              <div className="event-organizer-avatar-fallback" style={{ background: `linear-gradient(135deg, ${creatorGradient[0]}, ${creatorGradient[1]})` }}>
                {creatorName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div>
              <div className="event-organizer-name">{creatorName}</div>
              {creator.craft_type && <div className="event-organizer-role">{creator.craft_type}</div>}
            </div>
          </Link>
        </div>
      )}

      {/* Liens */}
      {(event.registration_url || event.external_url || event.contact_email) && (
        <div className="event-left-card">
          <div className="event-left-card-label">Liens</div>
          <div className="event-links-list">
            {event.registration_url && (
              <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className="event-link-item primary">
                <FileText strokeWidth={1.5} />
                S'inscrire
              </a>
            )}
            {event.external_url && (
              <a href={event.external_url} target="_blank" rel="noopener noreferrer" className="event-link-item">
                <ExternalLink strokeWidth={1.5} />
                Site web
              </a>
            )}
            {event.contact_email && (
              <a href={`mailto:${event.contact_email}`} className="event-link-item">
                <Mail strokeWidth={1.5} />
                {event.contact_email}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Amis présents */}
      {friendsOnEvent.length > 0 && (
        <div className="event-left-card">
          <div className="event-left-card-label">Amis présents</div>
          <div className="event-friends-col">
            {friendsOnEvent.map(friend => {
              const fname = friend.brand_name ?? friend.display_name ?? '?'
              const [from, to] = GRADIENTS[hashName(fname) % GRADIENTS.length]
              return (
                <Link key={friend.id} to={`/@${friend.public_slug ?? friend.id}`} className="event-friend-row">
                  {friend.avatar_url ? (
                    <img src={friend.avatar_url} alt={fname} className="event-friend-avatar" />
                  ) : (
                    <div className="event-friend-avatar-fallback" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
                      {fname[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div>
                    <div className="event-friend-name">{fname}</div>
                    <div className={`event-friend-status ${friend.status}`}>
                      {STATUS_LABELS_FRIEND[friend.status] ?? friend.status}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  </div>

  {/* ── RIGHT COLUMN ── */}
  <div className="event-col-right">
    {/* Tags */}
    <div className="event-tags">
      <span className="event-tag-primary">{event.primary_tag}</span>
      {event.tags?.map(tag => (
        <span key={tag} className="event-tag-secondary">{tag}</span>
      ))}
    </div>

    {/* Title */}
    <h1 className="event-title">{event.name}</h1>

    {/* Meta rows */}
    <div className="event-meta-list">
      <div className="event-meta-row">
        <div className="event-meta-icon"><Calendar strokeWidth={1.5} /></div>
        <div className="event-meta-text">
          <span className="event-meta-primary">{formatDate(event.start_date)}{event.end_date !== event.start_date ? ` — ${formatDate(event.end_date)}` : ''}</span>
          <span className="event-meta-secondary">{dayCount(event.start_date, event.end_date)}</span>
        </div>
      </div>
      <div className="event-meta-row">
        <div className="event-meta-icon"><MapPin strokeWidth={1.5} /></div>
        <div className="event-meta-text">
          <span className="event-meta-primary">{event.city} ({event.department})</span>
        </div>
      </div>
      {event.registration_deadline && (
        <div className="event-meta-row">
          <div className="event-meta-icon"><Clock strokeWidth={1.5} /></div>
          <div className="event-meta-text">
            <span className="event-meta-primary">Inscription avant le {formatDate(event.registration_deadline)}</span>
            <span className="event-meta-secondary">{daysUntil(event.registration_deadline)}</span>
          </div>
        </div>
      )}
      {friendCount > 0 && (
        <div className="event-meta-row event-meta-row-clickable" onClick={() => setShowParticipants(true)}>
          <div className="event-meta-icon"><Users strokeWidth={1.5} /></div>
          <div className="event-meta-text">
            <span className="event-meta-primary">{friendCount} participant{friendCount > 1 ? 's' : ''}{participation ? ' dont vous' : ''}</span>
            <span className="event-meta-secondary">Voir les participants</span>
          </div>
        </div>
      )}
    </div>

    {/* Registration note */}
    {event.registration_note && (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'hsl(var(--muted) / 0.5)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'rgba(61,48,40,0.5)', marginBottom: 20 }}>
        <StickyNote strokeWidth={1.5} style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
        <span>{event.registration_note}</span>
      </div>
    )}

    {/* Mon suivi */}
    <EventDashboard
      participation={participation}
      isExposant={isExposant}
      isPast={isPast}
      onUpdate={setParticipation}
      onLeave={handleLeave}
      onJoin={handleJoin}
      onToggleReport={() => setShowReportForm(!showReportForm)}
      showReportForm={showReportForm}
    />

    <div className="event-separator" />

    {/* Notes + Avis */}
    <div className="event-notes-reviews">
      <div className="event-section-card">
        <div className="event-section-title muted">📝 Notes partagées ({notes.length})</div>
        <NoteForm eventId={event.id} onNoteAdded={refetchNotes} />
        <NotesFeed notes={notes} onRefresh={refetchNotes} />
      </div>
      <div className="event-section-card">
        <div className="event-section-title muted">⭐ Avis ({reviews.length})</div>
        <ReviewSummary event={event} canSeeDetails={canSeeDetails} />
        {isPast && isExposant && (
          <>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setShowReviewForm(!showReviewForm)}>
              {showReviewForm ? 'Fermer' : 'Donner mon avis'}
            </Button>
            {showReviewForm && <ReviewForm eventId={event.id} onReviewSubmitted={refetchReviews} />}
          </>
        )}
      </div>
    </div>

    {/* À propos */}
    {event.description && (
      <div className="event-section-card">
        <div className="event-section-title">🌍 À propos</div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(61,48,40,0.7)', whiteSpace: 'pre-wrap', margin: 0 }}>{event.description}</p>
      </div>
    )}

    {/* Report form */}
    {showReportForm && <EventReportForm eventId={event.id} />}
  </div>
</div>

{showParticipants && (
  <ParticipantsModal eventId={event.id} onClose={() => setShowParticipants(false)} />
)}
```

At the top of the component (after hooks, before JSX), add these helpers and the creator hook:

```tsx
import { useEventCreator } from '@/hooks/use-events'
// Add to imports: Calendar, MapPin, Clock, Users, ExternalLink, FileText, Mail, StickyNote, Image as ImageIcon
// Remove import of EventHero

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

const STATUS_LABELS_FRIEND: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function dayCount(start: string, end: string) {
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
  return diff > 1 ? `${diff} jours` : '1 jour'
}

function daysUntil(date: string) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  if (diff < 0) return 'Date passée'
  if (diff === 0) return "Aujourd'hui"
  return `${diff} jour${diff > 1 ? 's' : ''} restant${diff > 1 ? 's' : ''}`
}
```

Inside the component, after the existing hooks:

```tsx
const creator = useEventCreator(event?.created_by)
const creatorName = creator?.brand_name ?? creator?.display_name ?? '?'
const creatorGradient = GRADIENTS[hashName(creatorName) % GRADIENTS.length]
```

Remove the import of `EventHero`, `FriendRow`, and `EventDashboardMobile` (the mobile inline dashboard div is no longer needed — the suivi is inline in the right column now).

Remove the unused `HeroBanner` import if present.

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/EventPage.tsx
git commit -m "feat: rewrite EventPage with 2-column Lu.ma-inspired layout"
```

---

### Task 4: Update EventDashboard.tsx for inline suivi style

**Files:**
- Modify: `src/components/events/EventDashboard.tsx`

The dashboard now renders inline in the right column instead of a sidebar card. Update the wrapper class and header style to use the new CSS classes.

- [ ] **Step 1: Update the wrapper and header markup**

In `EventDashboard.tsx`, change the wrapper div class from `event-dashboard` to `event-suivi` for all three return paths (CTA, public user, exposant).

For the exposant full dashboard return (line 128), change:
- `<div className="event-dashboard">` → `<div className="event-suivi">`
- `<div className="event-dashboard-title">🔒 Mon suivi</div>` → `<div className="event-suivi-header">🔒 Mon suivi</div>`
- `<div className="event-dashboard-label">` → `<div className="event-suivi-block-label">`
- Wrap the participation and payment steppers in: `<div className="event-suivi-grid"><div className="event-suivi-block">...</div><div className="event-suivi-block">...</div></div>`
- Change the action buttons at the bottom to use `event-suivi-actions` wrapper and `event-suivi-action` class per button.
- The `event-dashboard-sep` div → `<div style={{ height: 1, background: 'hsl(30 25% 85%)', margin: '14px 0' }} />`

For the CTA (no participation) return (line 84), change:
- `<div className="event-dashboard">` → `<div className="event-suivi">`

For the public user return (line 109), change:
- `<div className="event-dashboard">` → `<div className="event-suivi">`
- `<div className="event-dashboard-title">🔒 Mon suivi</div>` → `<div className="event-suivi-header">🔒 Mon suivi</div>`

- [ ] **Step 2: Verify build compiles**

Run: `pnpm build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/events/EventDashboard.tsx
git commit -m "refactor: update EventDashboard to use inline suivi styling"
```

---

### Task 5: Clean up unused files and verify

**Files:**
- Check: `src/components/events/EventHero.tsx` — may still be imported elsewhere
- Check: `src/components/events/EventDashboardMobile.tsx` — no longer used
- Check: `src/components/events/HeroBanner.tsx` and `HeroBanner.css` — check if used anywhere else

- [ ] **Step 1: Check for remaining imports of removed components**

Run: `grep -r "EventHero\|EventDashboardMobile\|HeroBanner" src/ --include="*.tsx" --include="*.ts" -l`

If only `EventPage.tsx` imported them (and we already removed those imports), the files are safe to leave (they won't be bundled). If they're imported elsewhere, leave them.

- [ ] **Step 2: Run full build**

Run: `pnpm build`
Expected: Build succeeds with zero errors.

- [ ] **Step 3: Manual visual verification**

Run: `pnpm dev`

Open the app in browser, navigate to any event page. Verify:
- 2-column layout: poster + sticky left cards / continuous right flow
- Left column order: Ajouté par → Liens → Amis présents
- Right column order: tags → title → meta → suivi → separator → notes/avis → à propos
- Mon suivi header is visually prominent (copper color, border-bottom)
- Meta rows have icon squares
- Participants row is clickable and opens modal
- Mobile: columns stack, poster centered

- [ ] **Step 4: Commit if any final fixes were needed**

```bash
git add -A
git commit -m "fix: event page cleanup and visual polish"
```
