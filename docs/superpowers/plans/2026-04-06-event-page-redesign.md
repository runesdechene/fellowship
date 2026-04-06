# Event Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre EventPage en cockpit exposant avec séparation claire public/amis/privé, hero compact avec grande affiche, dashboard sticky, et barre mobile collante.

**Architecture:** Décomposer l'actuel EventPage.tsx monolithique (570 lignes) en composants ciblés. Nouveau fichier CSS dédié (`EventPage.css`). La logique/hooks existants restent intacts — seul le JSX et le layout changent. Desktop = 2 colonnes (contenu + dashboard sticky). Mobile = colonne unique + barre sticky bottom qui se déplie.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 + CSS custom properties, Supabase

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/pages/EventPage.tsx` | Page shell — hooks, state, layout grid, mode édition |
| `src/pages/EventPage.css` | Tous les styles de la page (pattern existant: Profile.css, Calendar.css, Explorer.css) |
| `src/components/events/EventHero.tsx` | Hero compact : affiche + infos + badges + liens |
| `src/components/events/EventDashboard.tsx` | Dashboard privé desktop : steppers participation/paiement, encadré éphémère, notes perso, actions |
| `src/components/events/EventDashboardMobile.tsx` | Barre sticky mobile + panel slide-up |
| `src/components/events/FriendRow.tsx` | Ligne horizontale d'amis avec avatars |

---

### Task 1: Create EventPage.css with layout foundations

**Files:**
- Create: `src/pages/EventPage.css`

- [ ] **Step 1: Create the CSS file**

```css
/* src/pages/EventPage.css */

/* ── Event Page ────────────────────────────────────────────────────── */

.event-page {
  padding: var(--page-padding);
  padding-bottom: 80px;
}

/* ── Back link ─────────────────────────────────────────────────────── */

.event-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: rgba(61, 48, 40, 0.45);
  text-decoration: none;
  margin-bottom: 20px;
  transition: color 0.15s;
}

.event-back:hover {
  color: hsl(var(--foreground));
}

.event-back svg {
  width: 16px;
  height: 16px;
}

/* ── Hero ──────────────────────────────────────────────────────────── */

.event-hero {
  display: flex;
  gap: 22px;
  margin-bottom: 24px;
}

.event-poster {
  width: 220px;
  height: 310px;
  border-radius: 16px;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(140, 80, 30, 0.2);
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

.event-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.event-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.event-tag-primary {
  background: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

.event-tag-secondary {
  background: hsl(var(--muted));
  color: rgba(61, 48, 40, 0.5);
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
}

.event-title {
  font-family: var(--font-heading);
  font-size: 26px;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.025em;
  color: hsl(var(--foreground));
  margin: 0 0 10px 0;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-family: var(--font-body);
  font-size: 13px;
  color: rgba(61, 48, 40, 0.5);
}

.event-meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.event-meta-item svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.event-badges {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.event-badge-status {
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

.event-links {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.event-link-btn {
  font-family: var(--font-body);
  font-size: 12px;
  color: rgba(61, 48, 40, 0.6);
  text-decoration: none;
  padding: 5px 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: border-color 0.15s, color 0.15s;
}

.event-link-btn:hover {
  border-color: hsl(var(--primary) / 0.3);
  color: hsl(var(--primary));
}

.event-link-btn svg {
  width: 14px;
  height: 14px;
}

.event-link-btn.primary {
  color: hsl(var(--primary));
  border-color: hsl(var(--primary) / 0.3);
}

.event-reg-note {
  margin-top: 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: hsl(var(--muted) / 0.5);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: rgba(61, 48, 40, 0.5);
}

.event-reg-note svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Two-column layout ─────────────────────────────────────────────── */

.event-separator {
  height: 1px;
  background: hsl(var(--border));
  margin-bottom: 22px;
}

.event-columns {
  display: flex;
  gap: 22px;
}

.event-main {
  flex: 1;
  min-width: 0;
}

.event-sidebar {
  width: 250px;
  flex-shrink: 0;
}

/* ── Section labels ────────────────────────────────────────────────── */

.event-section-label {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.event-section-label.public {
  color: hsl(var(--primary));
}

.event-section-label.friends {
  color: hsl(252 56% 58%);
}

.event-section-label.private {
  color: rgba(61, 48, 40, 0.45);
}

.event-section-card {
  background: hsl(var(--card));
  border-radius: 12px;
  padding: 14px;
  border: 1px solid hsl(var(--border));
  margin-bottom: 20px;
}

/* ── Friends row ───────────────────────────────────────────────────── */

.friends-row {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.friends-row::-webkit-scrollbar {
  display: none;
}

.friend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  width: 64px;
  text-decoration: none;
  color: inherit;
}

.friend-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.friend-avatar-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 15px;
  font-weight: 700;
}

.friend-name {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 64px;
}

.friend-status {
  font-size: 9px;
  font-weight: 600;
}

.friend-status.inscrit { color: hsl(152 50% 38%); }
.friend-status.en_cours { color: hsl(210 60% 50%); }
.friend-status.interesse { color: hsl(30 80% 50%); }

/* ── Notes & Reviews side by side ──────────────────────────────────── */

.event-notes-reviews {
  display: flex;
  gap: 12px;
}

.event-notes-reviews > div {
  flex: 1;
  min-width: 0;
}

/* ── Dashboard (desktop) ──────────────────────────────────────────── */

.event-dashboard {
  background: hsl(36 50% 96%);
  border: 1px solid hsl(30 25% 85%);
  border-radius: 14px;
  padding: 16px;
  position: sticky;
  top: 20px;
}

.event-dashboard-title {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(61, 48, 40, 0.45);
  margin-bottom: 14px;
}

.event-dashboard-label {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  color: hsl(var(--foreground));
  margin-bottom: 6px;
}

.event-stepper {
  display: flex;
  gap: 3px;
  margin-bottom: 6px;
}

.event-stepper-btn {
  flex: 1;
  text-align: center;
  padding: 6px 2px;
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

.event-stepper-btn.passed {
  background: hsl(var(--primary) / 0.2);
  color: hsl(var(--primary));
}

.event-stepper-btn.inactive {
  background: hsl(var(--muted));
  color: rgba(61, 48, 40, 0.4);
}

.event-stepper-btn.inactive:hover {
  background: hsl(var(--muted) / 0.8);
}

/* Payment stepper active states */
.event-stepper-btn.pay-active.a_payer { background: hsl(0 65% 55% / 0.12); color: hsl(0 65% 45%); }
.event-stepper-btn.pay-active.en_cours_paiement { background: hsl(38 90% 50% / 0.15); color: hsl(38 80% 35%); }
.event-stepper-btn.pay-active.paye { background: hsl(152 50% 38% / 0.15); color: hsl(152 50% 32%); }

/* ── Ephemeral info box ────────────────────────────────────────────── */

.event-info-box {
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 14px;
  font-family: var(--font-body);
  animation: event-info-box-in 0.25s ease-out;
}

.event-info-box-title {
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 3px;
}

.event-info-box-text {
  font-size: 11px;
  line-height: 1.5;
}

.event-info-box.interesse {
  background: hsl(38 90% 50% / 0.08);
  border: 1px solid hsl(38 90% 50% / 0.2);
}
.event-info-box.interesse .event-info-box-title { color: hsl(38 80% 40%); }
.event-info-box.interesse .event-info-box-text { color: hsl(30 50% 30%); }

.event-info-box.en_cours {
  background: hsl(210 60% 50% / 0.08);
  border: 1px solid hsl(210 60% 50% / 0.2);
}
.event-info-box.en_cours .event-info-box-title { color: hsl(210 60% 45%); }
.event-info-box.en_cours .event-info-box-text { color: hsl(210 30% 25%); }

.event-info-box.inscrit {
  background: hsl(var(--primary) / 0.08);
  border: 1px solid hsl(var(--primary) / 0.2);
}
.event-info-box.inscrit .event-info-box-title { color: hsl(var(--primary)); }
.event-info-box.inscrit .event-info-box-text { color: hsl(24 30% 30%); }

@keyframes event-info-box-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.event-dashboard-sep {
  height: 1px;
  background: hsl(30 25% 85%);
  margin: 14px 0;
}

.event-dashboard-textarea {
  width: 100%;
  border: 1px solid hsl(30 25% 85%);
  border-radius: 8px;
  padding: 8px;
  font-family: var(--font-body);
  font-size: 12px;
  background: hsl(var(--card));
  color: hsl(var(--foreground));
  resize: none;
  height: 60px;
  box-sizing: border-box;
}

.event-dashboard-textarea:focus {
  outline: none;
  border-color: hsl(var(--primary) / 0.3);
}

.event-dashboard-action {
  width: 100%;
  padding: 7px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background: hsl(var(--card));
  font-family: var(--font-body);
  font-size: 11px;
  color: hsl(var(--foreground));
  cursor: pointer;
  transition: border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.event-dashboard-action:hover {
  border-color: hsl(var(--primary) / 0.3);
}

.event-dashboard-action.destructive {
  border-color: hsl(0 65% 80%);
  color: hsl(0 65% 45%);
}

.event-dashboard-action.destructive:hover {
  background: hsl(0 65% 55% / 0.05);
}

/* ── CTA (no participation yet) ────────────────────────────────────── */

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

/* ── Mobile: sticky bottom bar ─────────────────────────────────────── */

.event-mobile-bar {
  display: none;
}

@media (max-width: 767px) {
  .event-hero {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .event-poster {
    width: 180px;
    height: 255px;
  }

  .event-info {
    align-items: center;
  }

  .event-tags, .event-badges, .event-links {
    justify-content: center;
  }

  .event-meta {
    align-items: center;
  }

  .event-columns {
    flex-direction: column;
  }

  .event-sidebar {
    display: none;
  }

  .event-notes-reviews {
    flex-direction: column;
  }

  .event-mobile-bar {
    display: block;
    position: fixed;
    bottom: 56px; /* above BottomBar */
    left: 0;
    right: 0;
    z-index: 40;
  }

  .event-mobile-bar-collapsed {
    background: hsl(36 50% 96% / 0.95);
    backdrop-filter: blur(12px);
    border-top: 1px solid hsl(30 25% 85%);
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
  }

  .event-mobile-bar-badges {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .event-mobile-bar-toggle svg {
    width: 18px;
    height: 18px;
    color: rgba(61, 48, 40, 0.4);
    transition: transform 0.2s;
  }

  .event-mobile-bar-toggle.open svg {
    transform: rotate(180deg);
  }

  .event-mobile-panel {
    background: hsl(36 50% 96%);
    border-top: 1px solid hsl(30 25% 85%);
    padding: 16px;
    max-height: 60vh;
    overflow-y: auto;
    animation: event-panel-slide-up 0.25s ease-out;
  }

  @keyframes event-panel-slide-up {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .event-page {
    padding-bottom: 140px; /* room for mobile bar + BottomBar */
  }
}
```

- [ ] **Step 2: Build check**

Run: `pnpm build`
Expected: PASS (CSS file just needs to exist, not imported yet)

- [ ] **Step 3: Commit**

```bash
git add src/pages/EventPage.css
git commit -m "feat: EventPage.css — layout foundations for redesign"
```

---

### Task 2: Create EventHero component

**Files:**
- Create: `src/components/events/EventHero.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/events/EventHero.tsx
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Users, ExternalLink, FileText, Mail, StickyNote, Image } from 'lucide-react'
import type { Event } from '@/types/database'

interface EventHeroProps {
  event: Event
  friendCount: number
  participationStatus?: string | null
  paymentStatus?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}

const PAYMENT_LABELS: Record<string, string> = {
  a_payer: 'À payer',
  en_cours_paiement: 'En cours',
  paye: 'Payé',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function EventHero({ event, friendCount, participationStatus, paymentStatus }: EventHeroProps) {
  return (
    <div className="event-hero">
      {/* Poster */}
      <div className="event-poster">
        {event.image_url ? (
          <img src={event.image_url} alt={event.name} />
        ) : (
          <div className="event-poster-empty">
            <Image strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="event-info">
        <div className="event-tags">
          <span className="event-tag-primary">{event.primary_tag}</span>
          {event.tags?.map(tag => (
            <span key={tag} className="event-tag-secondary">{tag}</span>
          ))}
        </div>

        <h1 className="event-title">{event.name}</h1>

        <div className="event-meta">
          <div className="event-meta-item">
            <Calendar strokeWidth={1.5} />
            <span>{formatDate(event.start_date)}{event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}</span>
          </div>
          <div className="event-meta-item">
            <MapPin strokeWidth={1.5} />
            <span>{event.city}, {event.department}</span>
          </div>
          {event.registration_deadline && (
            <div className="event-meta-item">
              <Clock strokeWidth={1.5} />
              <span>Inscription avant le {formatDate(event.registration_deadline)}</span>
            </div>
          )}
          {friendCount > 0 && (
            <div className="event-meta-item">
              <Users strokeWidth={1.5} />
              <span>{friendCount} participant{friendCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Status + payment badges */}
        {participationStatus && (
          <div className="event-badges">
            <span
              className="event-badge-status"
              style={{ background: 'hsl(var(--primary))', color: 'white' }}
            >
              ✓ {STATUS_LABELS[participationStatus] ?? participationStatus}
            </span>
            {participationStatus === 'inscrit' && paymentStatus && (
              <span
                className="event-badge-status"
                style={
                  paymentStatus === 'paye'
                    ? { background: 'hsl(152 50% 38% / 0.12)', color: 'hsl(152 50% 32%)', border: '1px solid hsl(152 50% 38% / 0.25)' }
                    : paymentStatus === 'en_cours_paiement'
                      ? { background: 'hsl(38 90% 50% / 0.12)', color: 'hsl(38 80% 35%)', border: '1px solid hsl(38 90% 50% / 0.2)' }
                      : { background: 'hsl(0 65% 55% / 0.08)', color: 'hsl(0 65% 45%)', border: '1px solid hsl(0 65% 55% / 0.15)' }
                }
              >
                💰 {PAYMENT_LABELS[paymentStatus] ?? paymentStatus}
              </span>
            )}
          </div>
        )}

        {/* Links */}
        <div className="event-links">
          {event.registration_url && (
            <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className="event-link-btn primary">
              <FileText strokeWidth={1.5} />
              S'inscrire
            </a>
          )}
          {event.external_url && (
            <a href={event.external_url} target="_blank" rel="noopener noreferrer" className="event-link-btn">
              <ExternalLink strokeWidth={1.5} />
              Site web
            </a>
          )}
          {event.contact_email && (
            <a href={`mailto:${event.contact_email}`} className="event-link-btn">
              <Mail strokeWidth={1.5} />
              {event.contact_email}
            </a>
          )}
        </div>

        {event.registration_note && (
          <div className="event-reg-note">
            <StickyNote strokeWidth={1.5} />
            <span>{event.registration_note}</span>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/events/EventHero.tsx
git commit -m "feat: EventHero component — poster + info + badges + links"
```

---

### Task 3: Create FriendRow component

**Files:**
- Create: `src/components/events/FriendRow.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/events/FriendRow.tsx
import { Link } from 'react-router-dom'

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

interface FriendOnEvent {
  id: string
  display_name: string | null
  brand_name: string | null
  avatar_url: string | null
  public_slug: string | null
  status: string
}

interface FriendRowProps {
  friends: FriendOnEvent[]
}

const STATUS_LABELS: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}

export function FriendRow({ friends }: FriendRowProps) {
  if (friends.length === 0) return null

  return (
    <div className="friends-row">
      {friends.map(friend => {
        const name = friend.brand_name ?? friend.display_name ?? '?'
        const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]
        return (
          <Link
            key={friend.id}
            to={`/@${friend.public_slug ?? friend.id}`}
            className="friend-item"
          >
            {friend.avatar_url ? (
              <img src={friend.avatar_url} alt={name} className="friend-avatar" />
            ) : (
              <div
                className="friend-avatar-fallback"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
              >
                {name[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <span className="friend-name">{name}</span>
            <span className={`friend-status ${friend.status}`}>
              {STATUS_LABELS[friend.status] ?? friend.status}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export type { FriendOnEvent }
```

- [ ] **Step 2: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/events/FriendRow.tsx
git commit -m "feat: FriendRow — horizontal friend list with avatars and status"
```

---

### Task 4: Create EventDashboard component (desktop)

**Files:**
- Create: `src/components/events/EventDashboard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/events/EventDashboard.tsx
import { useState, useEffect } from 'react'
import { FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateParticipation } from '@/hooks/use-participations'
import type { Participation } from '@/types/database'
import type { ParticipationStatus } from '@/types/database'

interface EventDashboardProps {
  participation: Participation | null
  isExposant: boolean
  isPast: boolean
  onUpdate: (p: Participation) => void
  onLeave: () => void
  onJoin: (status: ParticipationStatus, visibility: 'amis' | 'public') => void
  onToggleReport: () => void
  showReportForm: boolean
}

const PARTICIPATION_STEPS = [
  { key: 'interesse' as const, label: 'Intéressé' },
  { key: 'en_cours' as const, label: 'En cours' },
  { key: 'inscrit' as const, label: 'Inscrit' },
]

const PAYMENT_STEPS = [
  { key: 'a_payer', label: 'À payer' },
  { key: 'en_cours_paiement', label: 'En cours' },
  { key: 'paye', label: 'Payé' },
]

const INFO_MESSAGES: Record<string, { title: string; text: string }> = {
  interesse: {
    title: '👀 Intéressé',
    text: 'Tes amis peuvent voir que tu t\'intéresses à cet événement. Tu recevras les notifications de mise à jour.',
  },
  en_cours: {
    title: '📋 En cours d\'inscription',
    text: 'Tes amis voient que tu es en cours d\'inscription. Tu recevras les notifications de mise à jour.',
  },
  inscrit: {
    title: '✓ Inscrit',
    text: 'Ton public peut voir que tu participes. L\'événement apparaît sur ton calendrier live.',
  },
}

export function EventDashboard({
  participation,
  isExposant,
  isPast,
  onUpdate,
  onLeave,
  onJoin,
  onToggleReport,
  showReportForm,
}: EventDashboardProps) {
  const [infoBox, setInfoBox] = useState<string | null>(null)

  // Auto-hide info box after 5 seconds
  useEffect(() => {
    if (!infoBox) return
    const timer = setTimeout(() => setInfoBox(null), 5000)
    return () => clearTimeout(timer)
  }, [infoBox])

  const handleStatusChange = async (status: ParticipationStatus) => {
    if (!participation) return
    const { data } = await updateParticipation(participation.id, { status })
    if (data) {
      onUpdate(data)
      setInfoBox(status)
    }
  }

  const handlePaymentChange = async (paymentStatus: string) => {
    if (!participation) return
    const { data } = await updateParticipation(participation.id, { payment_status: paymentStatus })
    if (data) onUpdate(data)
  }

  // CTA — no participation yet
  if (!participation) {
    return (
      <div className="event-dashboard">
        <div className="event-cta">
          <p className="event-cta-title">Tu y vas ?</p>
          <div className="event-cta-buttons">
            {isExposant ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onJoin('interesse', 'amis')}>Intéressé</Button>
                <Button size="sm" variant="outline" onClick={() => onJoin('en_cours', 'amis')}>En cours d'inscription</Button>
                <Button size="sm" onClick={() => onJoin('inscrit', 'amis')}>Inscrit</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => onJoin('interesse', 'amis')}>Intéressé</Button>
                <Button size="sm" onClick={() => onJoin('inscrit', 'public')}>J'y vais !</Button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Public user — simple view
  if (!isExposant) {
    return (
      <div className="event-dashboard">
        <div className="event-dashboard-title">🔒 Mon suivi</div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-medium text-sm">
            {participation.status === 'interesse' ? 'Intéressé' : "J'y vais !"}
          </span>
        </div>
        <button className="event-dashboard-action destructive" onClick={onLeave}>
          Retirer ma participation
        </button>
      </div>
    )
  }

  // Exposant — full dashboard
  const statusOrder = ['interesse', 'en_cours', 'inscrit']
  const currentIdx = statusOrder.indexOf(participation.status)
  const currentPayment = (participation.payment_status as string) ?? 'a_payer'

  return (
    <div className="event-dashboard">
      <div className="event-dashboard-title">🔒 Mon suivi</div>

      {/* Participation stepper */}
      <div className="event-dashboard-label">Participation</div>
      <div className="event-stepper">
        {PARTICIPATION_STEPS.map((step, i) => (
          <button
            key={step.key}
            onClick={() => handleStatusChange(step.key)}
            className={`event-stepper-btn ${
              step.key === participation.status
                ? 'active'
                : i < currentIdx
                  ? 'passed'
                  : 'inactive'
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Ephemeral info box */}
      {infoBox && INFO_MESSAGES[infoBox] && (
        <div
          className={`event-info-box ${infoBox}`}
          onClick={() => setInfoBox(null)}
        >
          <div className="event-info-box-title">{INFO_MESSAGES[infoBox].title}</div>
          <div className="event-info-box-text">{INFO_MESSAGES[infoBox].text}</div>
        </div>
      )}

      {/* Payment stepper — only when inscrit */}
      {participation.status === 'inscrit' && (
        <>
          <div className="event-dashboard-label">Paiement</div>
          <div className="event-stepper" style={{ marginBottom: 14 }}>
            {PAYMENT_STEPS.map(step => (
              <button
                key={step.key}
                onClick={() => handlePaymentChange(step.key)}
                className={`event-stepper-btn ${
                  currentPayment === step.key
                    ? `pay-active ${step.key}`
                    : 'inactive'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="event-dashboard-sep" />

      {/* Private notes */}
      <div className="event-dashboard-label">Notes perso</div>
      <textarea
        className="event-dashboard-textarea"
        placeholder="Penser à apporter les bannières..."
        style={{ marginBottom: 14 }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isPast && (
          <button className="event-dashboard-action" onClick={onToggleReport}>
            <FileText style={{ width: 14, height: 14 }} strokeWidth={1.5} />
            {showReportForm ? 'Fermer le bilan' : 'Bilan post-événement'}
          </button>
        )}
        <button className="event-dashboard-action destructive" onClick={onLeave}>
          <Trash2 style={{ width: 14, height: 14 }} strokeWidth={1.5} />
          Retirer ma participation
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/events/EventDashboard.tsx
git commit -m "feat: EventDashboard — private sticky sidebar with steppers and info boxes"
```

---

### Task 5: Create EventDashboardMobile component

**Files:**
- Create: `src/components/events/EventDashboardMobile.tsx`

- [ ] **Step 1: Create the component**

This is the sticky bottom bar that shows on mobile. Collapsed = badges row. Expanded = full dashboard panel.

```tsx
// src/components/events/EventDashboardMobile.tsx
import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { EventDashboard } from './EventDashboard'
import type { Participation, ParticipationStatus } from '@/types/database'

interface EventDashboardMobileProps {
  participation: Participation | null
  isExposant: boolean
  isPast: boolean
  onUpdate: (p: Participation) => void
  onLeave: () => void
  onJoin: (status: ParticipationStatus, visibility: 'amis' | 'public') => void
  onToggleReport: () => void
  showReportForm: boolean
}

const STATUS_LABELS: Record<string, string> = {
  interesse: 'Intéressé',
  en_cours: 'En cours',
  inscrit: 'Inscrit',
}

const PAYMENT_LABELS: Record<string, string> = {
  a_payer: 'À payer',
  en_cours_paiement: 'En cours',
  paye: 'Payé',
}

export function EventDashboardMobile(props: EventDashboardMobileProps) {
  const [open, setOpen] = useState(false)
  const { participation } = props

  return (
    <div className="event-mobile-bar">
      {open && (
        <div className="event-mobile-panel">
          <EventDashboard {...props} />
        </div>
      )}
      <div className="event-mobile-bar-collapsed" onClick={() => setOpen(!open)}>
        <div className="event-mobile-bar-badges">
          {participation ? (
            <>
              <span
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'white',
                  padding: '3px 10px',
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {STATUS_LABELS[participation.status] ?? participation.status}
              </span>
              {participation.status === 'inscrit' && participation.payment_status && (
                <span
                  style={{
                    background: participation.payment_status === 'paye' ? 'hsl(152 50% 38% / 0.12)' : 'hsl(var(--muted))',
                    color: participation.payment_status === 'paye' ? 'hsl(152 50% 32%)' : 'rgba(61,48,40,0.5)',
                    padding: '3px 10px',
                    borderRadius: 16,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {PAYMENT_LABELS[(participation.payment_status as string)] ?? ''}
                </span>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--primary))' }}>
              Tu y vas ?
            </span>
          )}
        </div>
        <div className={`event-mobile-bar-toggle ${open ? 'open' : ''}`}>
          <ChevronUp strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/events/EventDashboardMobile.tsx
git commit -m "feat: EventDashboardMobile — sticky bottom bar with slide-up panel"
```

---

### Task 6: Fetch friends on event + new hook

**Files:**
- Modify: `src/hooks/use-participations.ts`

We need to fetch the list of friends who have a participation on a specific event, with their profile data.

- [ ] **Step 1: Add `useFriendsOnEvent` hook**

Add this function at the end of `src/hooks/use-participations.ts`:

```typescript
export function useFriendsOnEvent(eventId: string | undefined) {
  const { user } = useAuth()
  const [friends, setFriends] = useState<{ id: string; display_name: string | null; brand_name: string | null; avatar_url: string | null; public_slug: string | null; status: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !eventId) { setLoading(false); return }

    async function fetch() {
      const { data: friendIds } = await supabase.rpc('get_friend_ids', { p_user_id: user!.id })
      if (!friendIds || (friendIds as string[]).length === 0) {
        setFriends([])
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('participations')
        .select('status, profiles(id, display_name, brand_name, avatar_url, public_slug)')
        .eq('event_id', eventId)
        .in('user_id', friendIds as string[])

      const result = (data ?? []).map((p: { status: string; profiles: { id: string; display_name: string | null; brand_name: string | null; avatar_url: string | null; public_slug: string | null } }) => ({
        ...p.profiles,
        status: p.status,
      }))

      setFriends(result)
      setLoading(false)
    }

    fetch()
  }, [user, eventId])

  return { friends, loading }
}
```

- [ ] **Step 2: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-participations.ts
git commit -m "feat: useFriendsOnEvent hook — fetch friends with participation on a specific event"
```

---

### Task 7: Rewrite EventPage.tsx with new components

**Files:**
- Modify: `src/pages/EventPage.tsx`

This is the big task: replace the entire EventPage JSX (view mode only — keep edit mode as-is) with the new layout using EventHero, FriendRow, EventDashboard, and EventDashboardMobile.

- [ ] **Step 1: Rewrite EventPage.tsx**

Keep all existing hooks, state, and handlers. Replace the JSX return (view mode) with:

1. Import new components and CSS:
```typescript
import { EventHero } from '@/components/events/EventHero'
import { EventDashboard } from '@/components/events/EventDashboard'
import { EventDashboardMobile } from '@/components/events/EventDashboardMobile'
import { FriendRow } from '@/components/events/FriendRow'
import { useFriendsOnEvent } from '@/hooks/use-participations'
import './EventPage.css'
```

2. Add friends hook inside the component:
```typescript
const { friends: friendsOnEvent } = useFriendsOnEvent(id)
```

3. Replace view-mode JSX with new two-column layout:
   - `<Link>` back button with `event-back` class
   - `<EventHero>` with event data + participation status badges
   - `<div className="event-separator" />`
   - `<div className="event-columns">` with left column (description, FriendRow, notes + reviews side by side) and right column (`<EventDashboard>`)
   - `<EventDashboardMobile>` outside the columns (fixed position, mobile only)

4. Keep the edit mode JSX block (`{editing ? (...) : (new layout)}`) intact — editing UI is unchanged.

5. Remove old inline participation JSX block.

6. Remove unused imports (`PaymentTracker`, inline icons that moved to sub-components).

- [ ] **Step 2: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Test visually**

Run: `pnpm dev`
Check: Desktop shows two-column layout. Mobile shows stacked + bottom bar.

- [ ] **Step 4: Commit**

```bash
git add src/pages/EventPage.tsx
git commit -m "feat: EventPage redesign — two-column layout, hero, dashboard sidebar, mobile bar"
```

---

### Task 8: Clean up unused files

**Files:**
- Delete: `src/components/events/PaymentTracker.tsx`

- [ ] **Step 1: Remove PaymentTracker**

Delete `src/components/events/PaymentTracker.tsx` — its functionality is now in EventDashboard.

- [ ] **Step 2: Check no imports remain**

Run: `grep -rn "PaymentTracker" src/`
Expected: No matches.

- [ ] **Step 3: Build check**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git rm src/components/events/PaymentTracker.tsx
git commit -m "chore: remove PaymentTracker, replaced by EventDashboard"
```
