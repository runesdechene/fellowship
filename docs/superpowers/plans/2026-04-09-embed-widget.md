# Embed Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refaire la page embed (`/:slug/embed`) en widget calendrier style Lu.ma avec cartes horizontales, et ajouter un bouton "Intégrer mon calendrier" sur le profil.

**Architecture:** Réécriture du composant `EmbedPage.tsx` existant + nouveau fichier CSS isolé (pas de Tailwind). Ajout d'une modale `EmbedModal.tsx` réutilisant le pattern de `QRCodeModal.tsx`. Aucune modification backend.

**Tech Stack:** React 19, TypeScript, Supabase (queries existantes), CSS pur (isolation iframe)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/pages/Embed.tsx` | Rewrite | Page embed standalone — fetch data, render cards, handle URL params |
| `src/pages/EmbedPage.css` | Create | Styles isolés (pas de Tailwind/variables Fellowship), light + dark theme |
| `src/components/profile/EmbedModal.tsx` | Create | Modale "Intégrer mon calendrier" avec snippet copiable |
| `src/pages/PublicProfile.tsx` | Modify | Ajouter bouton + modale embed (owner only) |

---

### Task 1: Create EmbedPage.css — isolated styles

**Files:**
- Create: `src/pages/EmbedPage.css`

- [ ] **Step 1: Create the CSS file with all embed styles**

```css
/* ── Embed Widget — Isolated styles (no Tailwind, no Fellowship vars) ── */

.embed-page {
  min-height: 100vh;
  padding: 20px;
  font-family: -apple-system, 'Inter', 'Plus Jakarta Sans', system-ui, sans-serif;
  max-width: 480px;
  margin: 0 auto;
  -webkit-font-smoothing: antialiased;
}

/* Light theme (default) */
.embed-page {
  background: #faf8f5;
  color: #1a1a1a;
}

/* Dark theme */
.embed-page[data-theme="dark"] {
  background: #1a1a1a;
  color: #f0f0f0;
}

/* ── Header ── */

.embed-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 20px;
}

.embed-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.embed-avatar-fallback {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: white;
}

.embed-header-info {
  flex: 1;
  min-width: 0;
}

.embed-header-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.embed-page[data-theme="dark"] .embed-header-name {
  color: #f0f0f0;
}

.embed-header-sub {
  font-size: 11px;
  color: #888;
}

/* ── Event card ── */

.embed-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.embed-card {
  display: flex;
  height: 110px;
  border-radius: 16px;
  overflow: hidden;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.06);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s, box-shadow 0.15s;
}

.embed-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.06), 0 8px 30px rgba(0,0,0,0.1);
}

.embed-page[data-theme="dark"] .embed-card {
  background: #242424;
}

.embed-card-image {
  width: 110px;
  flex-shrink: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.embed-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.embed-card-image-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.embed-card-tag {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 8px;
  color: white;
  font-weight: 600;
}

.embed-card-body {
  padding: 14px 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.embed-card-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.3px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.embed-page[data-theme="dark"] .embed-card-name {
  color: #f0f0f0;
}

.embed-card-meta {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
}

.embed-card-date {
  font-weight: 700;
}

.embed-card-city {
  color: #888;
}

.embed-card-link {
  margin-top: 8px;
  font-size: 10px;
  font-weight: 600;
}

/* ── Footer ── */

.embed-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 0 16px;
  text-decoration: none;
  color: inherit;
}

.embed-footer:hover .embed-footer-text {
  opacity: 1;
}

.embed-footer-logo {
  height: 28px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.embed-footer:hover .embed-footer-logo {
  opacity: 0.9;
}

.embed-footer-text {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.embed-page[data-theme="dark"] .embed-footer-text {
  color: #888;
}

/* ── Empty state ── */

.embed-empty {
  text-align: center;
  padding: 48px 24px;
}

.embed-empty-icon {
  width: 40px;
  height: 40px;
  margin: 0 auto 12px;
  color: #ccc;
}

.embed-page[data-theme="dark"] .embed-empty-icon {
  color: #555;
}

.embed-empty-text {
  font-size: 14px;
  color: #888;
}

/* ── Skeleton loading ── */

.embed-skeleton {
  display: flex;
  height: 110px;
  border-radius: 16px;
  overflow: hidden;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.embed-page[data-theme="dark"] .embed-skeleton {
  background: #242424;
}

.embed-skeleton-image {
  width: 110px;
  flex-shrink: 0;
  background: #eee;
  animation: embed-pulse 1.5s ease-in-out infinite;
}

.embed-page[data-theme="dark"] .embed-skeleton-image {
  background: #333;
}

.embed-skeleton-body {
  flex: 1;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.embed-skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: #eee;
  animation: embed-pulse 1.5s ease-in-out infinite;
}

.embed-page[data-theme="dark"] .embed-skeleton-line {
  background: #333;
}

.embed-skeleton-line:nth-child(1) { width: 75%; }
.embed-skeleton-line:nth-child(2) { width: 50%; }
.embed-skeleton-line:nth-child(3) { width: 30%; }

@keyframes embed-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Centered message (loading/error) ── */

.embed-centered {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 14px;
  color: #888;
}

/* ── Responsive ── */

@media (max-width: 360px) {
  .embed-card-image {
    width: 80px;
  }
  .embed-card-name {
    font-size: 13px;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/EmbedPage.css
git commit -m "feat(embed): add isolated CSS for embed widget"
```

---

### Task 2: Rewrite EmbedPage.tsx — full component

**Files:**
- Rewrite: `src/pages/Embed.tsx`

- [ ] **Step 1: Rewrite the component with URL params, data fetching, cards, and footer**

```tsx
import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Calendar } from 'lucide-react'
import type { Profile } from '@/types/database'
import './EmbedPage.css'

/* ── Tag icon map (inline — no Tailwind dependency) ── */
const TAG_EMOJI: Record<string, string> = {
  'fete-medievale': '⚔️',
  'fantastique': '✨',
  'geek': '🎮',
  'festival-musique': '🎵',
  'foire': '🎪',
  'marche': '🧺',
  'salon': '🎤',
  'litteraire': '📖',
  'historique': '🏛️',
}

/* ── Fallback gradient colors for events without images ── */
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #2c1810, #8B4513)',
  'linear-gradient(135deg, #1a3a2a, #3CB371)',
  'linear-gradient(135deg, #3a2a1a, #DAA520)',
  'linear-gradient(135deg, #1a2a3a, #4682B4)',
  'linear-gradient(135deg, #3a1a2a, #8B3A62)',
]

interface EmbedEvent {
  id: string
  events: {
    id: string
    name: string
    start_date: string
    end_date: string
    city: string
    tags: string[] | null
    image_url: string | null
  } | null
}

export function EmbedPage() {
  const { slug: rawSlug } = useParams<{ slug: string }>()
  const slug = rawSlug?.replace(/^@/, '')
  const [searchParams] = useSearchParams()

  const theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light'
  const max = Math.min(Math.max(parseInt(searchParams.get('max') ?? '10', 10) || 10, 1), 50)
  const accent = /^[0-9a-fA-F]{3,8}$/.test(searchParams.get('accent') ?? '')
    ? `#${searchParams.get('accent')}`
    : '#c87941'

  const [profile, setProfile] = useState<Profile | null>(null)
  const [participations, setParticipations] = useState<EmbedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    async function fetchData() {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('public_slug', slug!)
        .single()

      if (!p) { setNotFound(true); setLoading(false); return }
      setProfile(p)

      const { data: parts } = await supabase
        .from('participations')
        .select('id, events(id, name, start_date, end_date, city, tags, image_url)')
        .eq('user_id', p.id)
        .eq('visibility', 'public')

      setParticipations((parts as EmbedEvent[] | null) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [slug])

  const events = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return participations
      .filter(p => p.events && new Date(p.events.start_date) >= now)
      .map(p => p.events!)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, max)
  }, [participations, max])

  const formatDate = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return start === end ? fmt(s) : `${fmt(s)} — ${fmt(e)}`
  }

  if (loading) {
    return (
      <div className="embed-page" data-theme={theme}>
        <div className="embed-cards">
          {[1, 2].map(i => (
            <div key={i} className="embed-skeleton">
              <div className="embed-skeleton-image" />
              <div className="embed-skeleton-body">
                <div className="embed-skeleton-line" />
                <div className="embed-skeleton-line" />
                <div className="embed-skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return <div className="embed-centered">Profil introuvable</div>
  }

  const displayName = profile.brand_name ?? profile.display_name ?? 'Utilisateur'
  const subtitle = [profile.craft_type, profile.city].filter(Boolean).join(' · ')

  return (
    <div className="embed-page" data-theme={theme}>
      {/* Header */}
      <div className="embed-header">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={displayName} className="embed-avatar" />
        ) : (
          <div className="embed-avatar-fallback" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}>
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        <div className="embed-header-info">
          <div className="embed-header-name">{displayName}</div>
          {subtitle && <div className="embed-header-sub">{subtitle}</div>}
        </div>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="embed-empty">
          <Calendar className="embed-empty-icon" strokeWidth={1.5} />
          <p className="embed-empty-text">Aucun événement à venir</p>
        </div>
      ) : (
        <div className="embed-cards">
          {events.map((ev, i) => {
            const tag = ev.tags?.[0] ?? 'autre'
            const emoji = TAG_EMOJI[tag] ?? '📌'
            return (
              <a
                key={ev.id}
                href={`https://flw.sh/evenement/${ev.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="embed-card"
              >
                <div className="embed-card-image">
                  {ev.image_url ? (
                    <img src={ev.image_url} alt={ev.name} />
                  ) : (
                    <div
                      className="embed-card-image-fallback"
                      style={{ background: FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length] }}
                    >
                      {emoji}
                    </div>
                  )}
                  <span className="embed-card-tag">{tag}</span>
                </div>
                <div className="embed-card-body">
                  <div className="embed-card-name">{ev.name}</div>
                  <div className="embed-card-meta">
                    <span className="embed-card-date" style={{ color: accent }}>
                      {formatDate(ev.start_date, ev.end_date)}
                    </span>
                    <span className="embed-card-city">📍 {ev.city}</span>
                  </div>
                  <div className="embed-card-link" style={{ color: accent }}>
                    Voir l'événement →
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {/* Footer — Fellowship branding */}
      <a
        href={`https://flw.sh/@${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="embed-footer"
      >
        <img src="/logo.png" alt="Fellowship" className="embed-footer-logo" />
        <span className="embed-footer-text">Calendrier propulsé par Fellowship</span>
      </a>
    </div>
  )
}
```

- [ ] **Step 2: Run dev server and verify the page renders**

Run: `pnpm dev`
Open: `http://localhost:5173/@rune-de-chene/embed`
Verify: Page loads with header, event cards (or empty state), and Fellowship footer.

- [ ] **Step 3: Test URL parameters**

Test these URLs:
- `/@rune-de-chene/embed?theme=dark` → dark background, dark cards
- `/@rune-de-chene/embed?max=2` → only 2 events shown
- `/@rune-de-chene/embed?accent=e74c3c` → red accent color
- `/@nonexistent/embed` → "Profil introuvable"

- [ ] **Step 4: Commit**

```bash
git add src/pages/Embed.tsx
git commit -m "feat(embed): rewrite embed page with Lu.ma-style horizontal cards"
```

---

### Task 3: Create EmbedModal.tsx — snippet copy modal

**Files:**
- Create: `src/components/profile/EmbedModal.tsx`

- [ ] **Step 1: Create the modal component**

Follow the same pattern as `QRCodeModal.tsx` — backdrop + overlay + modal card.

```tsx
import { useState, useEffect } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmbedModalProps {
  slug: string
  onClose: () => void
}

export function EmbedModal({ slug, onClose }: EmbedModalProps) {
  const [copied, setCopied] = useState(false)
  const snippet = `<iframe src="https://flw.sh/@${slug}/embed" width="100%" height="600" frameborder="0"></iframe>`

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="profile-qr-backdrop">
      <div className="profile-qr-overlay" onClick={onClose} />
      <div className="profile-qr-modal">
        <button onClick={onClose} className="profile-qr-close">
          <X strokeWidth={1.5} />
        </button>
        <h2 className="profile-qr-title">Intégrer mon calendrier</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(61,48,40,0.5)', marginBottom: 16, textAlign: 'center' }}>
          Collez ce code sur votre site pour afficher vos événements automatiquement.
        </p>
        <pre style={{
          background: 'rgba(61,48,40,0.04)',
          borderRadius: 12,
          padding: '14px 16px',
          fontSize: 12,
          fontFamily: 'monospace',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          lineHeight: 1.5,
          color: 'rgba(61,48,40,0.7)',
          marginBottom: 16,
        }}>
          {snippet}
        </pre>
        <div className="profile-qr-actions">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4 text-accent" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copier le code
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/EmbedModal.tsx
git commit -m "feat(embed): add embed snippet copy modal"
```

---

### Task 4: Add "Intégrer mon calendrier" button to PublicProfile.tsx

**Files:**
- Modify: `src/pages/PublicProfile.tsx`

- [ ] **Step 1: Add imports**

Add to the existing imports at the top of `PublicProfile.tsx`:

```tsx
import { Code } from 'lucide-react'
import { EmbedModal } from '@/components/profile/EmbedModal'
```

Update the `lucide-react` import line — add `Code` to the existing destructured imports:

```tsx
import { Users, UserCheck, Code } from 'lucide-react'
```

- [ ] **Step 2: Add state for the embed modal**

Add after the existing `showQR` state (line 41):

```tsx
const [showEmbed, setShowEmbed] = useState(false)
```

- [ ] **Step 3: Add the button in the profile content area**

Insert after the `<ProfileHeader>` component (after line 156), inside the owner check. Add this block right before the `<div className="profile-content">`:

```tsx
{isOwner && profile.public_slug && (
  <button
    onClick={() => setShowEmbed(true)}
    className="profile-embed-btn"
  >
    <Code size={16} strokeWidth={2} />
    Intégrer mon calendrier
  </button>
)}
```

- [ ] **Step 4: Add the modal render**

Add right after the `QRCodeModal` render block (after line 229), before the closing `</div>`:

```tsx
{showEmbed && profile.public_slug && (
  <EmbedModal slug={profile.public_slug} onClose={() => setShowEmbed(false)} />
)}
```

- [ ] **Step 5: Add button styles to Profile.css**

Append to `src/pages/Profile.css`:

```css
/* ── Embed button ── */

.profile-embed-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto 16px;
  padding: 8px 18px;
  border-radius: 12px;
  border: 1px solid rgba(61, 48, 40, 0.1);
  background: rgba(200, 121, 65, 0.06);
  color: hsl(25 60% 45%);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.profile-embed-btn:hover {
  background: rgba(200, 121, 65, 0.12);
  border-color: rgba(200, 121, 65, 0.2);
}
```

- [ ] **Step 6: Verify**

Run: `pnpm dev`
1. Navigate to your own profile
2. Verify the "Intégrer mon calendrier" button appears
3. Click it — the modal opens with the iframe snippet
4. Click "Copier le code" — snippet is in clipboard
5. Navigate to another user's profile — button should NOT appear

- [ ] **Step 7: Commit**

```bash
git add src/pages/PublicProfile.tsx src/pages/Profile.css src/components/profile/EmbedModal.tsx
git commit -m "feat(embed): add 'Intégrer mon calendrier' button on own profile"
```

---

### Task 5: Final verification and cleanup

- [ ] **Step 1: Test the full flow end-to-end**

1. Go to your profile → click "Intégrer mon calendrier" → copy snippet
2. Open the embed URL directly in a new tab: `http://localhost:5173/@your-slug/embed`
3. Verify: header with avatar/name, event cards with images, Fellowship footer
4. Test `?theme=dark` — dark mode
5. Test `?accent=e74c3c` — red accent
6. Test `?max=1` — only one card
7. Test with a slug that has no public participations — empty state with calendar icon
8. Test with a nonexistent slug — "Profil introuvable"

- [ ] **Step 2: Run build check**

Run: `pnpm build`
Expected: No TypeScript errors, clean build.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(embed): polish and fixes from final review"
```
