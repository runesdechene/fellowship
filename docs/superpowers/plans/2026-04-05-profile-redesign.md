# Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the two profile pages into a single brand showcase at `/@slug` with ambient gradient header, event cards carousel, email signup placeholder, QR code modal, and Fellowship footer branding.

**Architecture:** The unified ProfilePage fetches profile by slug and composes four sub-components: ProfileHeader (ambient gradient + avatar + action buttons), EventCarousel (scrollable cards), EmailSignupPlaceholder, and QRCodeModal. Owner detection compares auth user ID with profile ID. Friends/followers migrate to Dashboard. `/profil` becomes a redirect.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS v4, Supabase, lucide-react, qrcode.react

**Spec:** `docs/superpowers/specs/2026-04-05-profile-redesign.md`

---

## File Structure

### New files
- `src/components/profile/ProfileHeader.tsx` — ambient gradient header with avatar, name, bio, owner/visitor buttons
- `src/components/profile/EventCarousel.tsx` — horizontally scrollable event cards
- `src/components/profile/EmailSignupPlaceholder.tsx` — visual placeholder for future email subscription
- `src/components/profile/QRCodeModal.tsx` — modal with QR code, download HD, copy link
- `src/components/profile/FellowshipFooter.tsx` — subtle Fellowship logo footer
- `supabase/migrations/20260405140000_add_banner_url.sql` — add banner_url column to profiles

### Modified files
- `src/types/supabase.ts` — add `banner_url` field to profiles type
- `src/pages/PublicProfile.tsx` — rewrite as unified ProfilePage composing the new components
- `src/pages/Profile.tsx` — replace with redirect to `/@slug`
- `src/pages/Dashboard.tsx` — add "Réseau" section with friends/followers lists
- `src/App.tsx` — no route changes needed (routes already correct)

### Removed files
- `src/components/profile/QRCodeCard.tsx` — replaced by QRCodeModal

---

### Task 1: Database migration — add banner_url to profiles

**Files:**
- Create: `supabase/migrations/20260405140000_add_banner_url.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add banner_url column for profile banner images
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;
```

- [ ] **Step 2: Update TypeScript types**

In `src/types/supabase.ts`, add `banner_url: string | null` to the profiles Row type (around line 287, after `avatar_url`):

```typescript
          banner_url: string | null
```

Add to profiles Insert type (around line 304, after `avatar_url`):

```typescript
          banner_url?: string | null
```

Add to profiles Update type (around line 321, after `avatar_url`):

```typescript
          banner_url?: string | null
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: no type errors

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260405140000_add_banner_url.sql src/types/supabase.ts
git commit -m "feat: add banner_url column to profiles"
```

---

### Task 2: Create ProfileHeader component

**Files:**
- Create: `src/components/profile/ProfileHeader.tsx`

- [ ] **Step 1: Write the component**

The ProfileHeader renders the ambient gradient header with avatar, name, bio, and contextual action buttons (owner vs visitor).

```tsx
import { Link } from 'react-router-dom'
import { Settings, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FollowButton } from '@/components/profile/FollowButton'
import type { Profile } from '@/types/database'

const GRADIENTS = [
  ['#2d1810', '#5a3825', '#8b6142'],
  ['#1a1a3e', '#3d2b6b', '#6c5ce7'],
  ['#0d2818', '#1a4d2e', '#2d8659'],
  ['#3d1c02', '#7a3803', '#b85c1e'],
  ['#1c1c2e', '#3b2d4a', '#6b4d8a'],
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

interface ProfileHeaderProps {
  profile: Profile
  isOwner: boolean
  onOpenQR: () => void
}

export function ProfileHeader({ profile, isOwner, onOpenQR }: ProfileHeaderProps) {
  const displayName = profile.brand_name ?? profile.display_name ?? 'Utilisateur'
  const subtitle = [profile.type === 'exposant' ? 'Exposant' : null, profile.city].filter(Boolean).join(' · ')
  const [c1, c2, c3] = GRADIENTS[hashName(displayName) % GRADIENTS.length]
  const bannerUrl = (profile as Record<string, unknown>).banner_url as string | null

  return (
    <div className="relative overflow-hidden rounded-b-3xl">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={
          bannerUrl
            ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(180deg, ${c1} 0%, ${c2} 60%, ${c3} 100%)` }
        }
      />
      {/* Dark overlay for banner images */}
      {bannerUrl && <div className="absolute inset-0 bg-black/50" />}
      {/* Radial halo glow */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${c2}44 0%, transparent 70%)` }}
      />

      {/* Content */}
      <div className="relative flex flex-col items-center px-4 pb-8 pt-6">
        {/* Action buttons */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          {isOwner ? (
            <>
              <Link to="/reglages">
                <Button size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Modifier mon profil
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={onOpenQR} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <QrCode className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <FollowButton targetId={profile.id} />
          )}
        </div>

        {/* Avatar */}
        <div className="mt-6">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-[72px] w-[72px] rounded-full object-cover ring-4 ring-white/10"
              style={{ boxShadow: `0 0 30px ${c2}55` }}
            />
          ) : (
            <div
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl font-bold text-white ring-4 ring-white/10"
              style={{
                background: `linear-gradient(135deg, ${c2}, ${c3})`,
                boxShadow: `0 0 30px ${c2}55`,
              }}
            >
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>

        {/* Name + subtitle */}
        <h1 className="mt-4 text-2xl font-bold text-white">{displayName}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-white/60">{subtitle}</p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-white/70">
            {profile.bio}
          </p>
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
git add src/components/profile/ProfileHeader.tsx
git commit -m "feat: ProfileHeader with ambient gradient and action buttons"
```

---

### Task 3: Create EventCarousel component

**Files:**
- Create: `src/components/profile/EventCarousel.tsx`

- [ ] **Step 1: Write the component**

Horizontally scrollable event cards with snap scrolling.

```tsx
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'

interface CarouselEvent {
  id: string
  name: string
  start_date: string
  end_date: string
  city: string
  primary_tag: string
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: 'numeric' })
}

function formatMonth(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
}

function EventCardItem({ event, past = false }: { event: CarouselEvent; past?: boolean }) {
  return (
    <Link
      to={`/evenement/${event.id}`}
      className={`flex-shrink-0 w-48 snap-start rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-4 hover:shadow-[2px_0_40px_-10px_rgba(0,0,0,0.12)] transition-shadow ${past ? 'opacity-60' : ''}`}
    >
      <div className="text-3xl font-bold text-primary leading-none">{formatDay(event.start_date)}</div>
      <div className="text-sm font-medium text-primary/70 uppercase">{formatMonth(event.start_date)}</div>
      <p className="mt-3 text-sm font-semibold leading-snug truncate">{event.name}</p>
      <p className="mt-1 text-xs text-muted-foreground truncate">{event.city}</p>
      <span className="mt-2 inline-block rounded-full bg-primary/10 text-primary text-[0.65rem] px-2 py-0.5 font-medium">
        {event.primary_tag}
      </span>
    </Link>
  )
}

interface EventCarouselProps {
  upcoming: CarouselEvent[]
  past: CarouselEvent[]
}

export function EventCarousel({ upcoming, past }: EventCarouselProps) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <Calendar className="mx-auto h-10 w-10 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">Aucun événement pour le moment</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Prochains événements
          </h2>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
            {upcoming.map(e => (
              <EventCardItem key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Événements passés
          </h2>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
            {past.map(e => (
              <EventCardItem key={e.id} event={e} past />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add scrollbar-hide utility to index.css**

Append to `src/index.css` (before the closing of the file):

```css
/* Hide scrollbar for carousel */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/EventCarousel.tsx src/index.css
git commit -m "feat: EventCarousel with horizontal snap scrolling"
```

---

### Task 4: Create EmailSignupPlaceholder component

**Files:**
- Create: `src/components/profile/EmailSignupPlaceholder.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Mail } from 'lucide-react'

interface EmailSignupPlaceholderProps {
  brandName: string
  isOwner: boolean
}

export function EmailSignupPlaceholder({ brandName, isOwner }: EmailSignupPlaceholderProps) {
  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 text-center">
      {isOwner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary/10 px-3 py-0.5 text-[0.65rem] font-medium text-primary whitespace-nowrap">
          Vos visiteurs verront ce formulaire ici
        </div>
      )}
      <Mail className="mx-auto h-6 w-6 text-muted-foreground/40" />
      <p className="mt-2 text-sm font-medium">
        Restez informé des prochains événements de {brandName}
      </p>
      <div className="mt-4 flex items-center gap-2 max-w-xs mx-auto">
        <input
          type="email"
          placeholder="votre@email.com"
          disabled
          className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
        />
        <button
          disabled
          className="rounded-lg bg-primary/50 px-4 py-2 text-sm font-medium text-primary-foreground cursor-not-allowed"
        >
          S'inscrire
        </button>
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
git add src/components/profile/EmailSignupPlaceholder.tsx
git commit -m "feat: EmailSignupPlaceholder for profile page"
```

---

### Task 5: Create QRCodeModal component

**Files:**
- Create: `src/components/profile/QRCodeModal.tsx`

- [ ] **Step 1: Write the component**

Reuses download logic from the existing QRCodeCard. Adds "Copier le lien" button.

```tsx
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Download, Copy, Check, X } from 'lucide-react'

interface QRCodeModalProps {
  slug: string
  onClose: () => void
}

export function QRCodeModal({ slug, onClose }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false)
  const url = `https://flw.sh/@${slug}`

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleDownload = () => {
    const svg = document.getElementById('profile-qr-code')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 1024, 1024)
      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `fellowship-${slug}-qr.png`
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative rounded-2xl bg-card p-8 shadow-xl max-w-sm w-full mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-bold mb-6">Ton QR Code Fellowship</h2>

          <div className="inline-block rounded-xl bg-white p-5">
            <QRCodeSVG id="profile-qr-code" value={url} size={256} level="M" />
          </div>

          <p className="mt-4 text-sm text-muted-foreground font-mono">{url}</p>

          <div className="mt-6 flex gap-3 justify-center">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger HD
            </Button>
            <Button variant="outline" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-accent" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copier le lien
                </>
              )}
            </Button>
          </div>
        </div>
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
git add src/components/profile/QRCodeModal.tsx
git commit -m "feat: QRCodeModal with HD download and copy link"
```

---

### Task 6: Create FellowshipFooter component

**Files:**
- Create: `src/components/profile/FellowshipFooter.tsx`

- [ ] **Step 1: Write the component**

```tsx
export function FellowshipFooter() {
  return (
    <div className="flex justify-center py-10">
      <img
        src="/logo.png"
        alt="Fellowship"
        className="h-6 opacity-15 grayscale brightness-200"
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/FellowshipFooter.tsx
git commit -m "feat: subtle Fellowship footer branding"
```

---

### Task 7: Rewrite ProfilePage (unified)

**Files:**
- Modify: `src/pages/PublicProfile.tsx` (complete rewrite)

- [ ] **Step 1: Rewrite PublicProfile.tsx as the unified profile page**

This replaces the entire content of the file. It composes all the sub-components and handles owner detection.

```tsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { EventCarousel } from '@/components/profile/EventCarousel'
import { EmailSignupPlaceholder } from '@/components/profile/EmailSignupPlaceholder'
import { QRCodeModal } from '@/components/profile/QRCodeModal'
import { FellowshipFooter } from '@/components/profile/FellowshipFooter'
import type { Profile } from '@/types/database'

interface ProfileParticipation {
  id: string
  event_id: string
  events: {
    id: string
    name: string
    start_date: string
    end_date: string
    city: string
    primary_tag: string
  } | null
}

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [participations, setParticipations] = useState<ProfileParticipation[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (!slug) return

    async function fetchProfile() {
      setLoading(true)

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('public_slug', slug!)
        .single()

      if (error || !profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData)

      const { data: parts } = await supabase
        .from('participations')
        .select('id, event_id, events(id, name, start_date, end_date, city, primary_tag)')
        .eq('user_id', profileData.id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })

      setParticipations((parts as ProfileParticipation[] | null) ?? [])
      setLoading(false)
    }

    fetchProfile()
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
        <div className="text-6xl font-bold text-muted-foreground/30">404</div>
        <h1 className="text-2xl font-bold">Profil introuvable</h1>
        <p className="text-muted-foreground">
          Aucun profil ne correspond à <span className="font-mono text-foreground">@{slug}</span>.
        </p>
        <Link to="/" className="text-primary hover:underline text-sm">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  const isOwner = user?.id === profile.id
  const displayName = profile.brand_name ?? profile.display_name ?? 'Utilisateur'
  const now = new Date()

  const upcoming = participations
    .filter(p => p.events && new Date(p.events.start_date) >= now)
    .map(p => p.events!)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  const past = participations
    .filter(p => p.events && new Date(p.events.start_date) < now)
    .map(p => p.events!)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())

  return (
    <div className="min-h-screen bg-background">
      <ProfileHeader profile={profile} isOwner={isOwner} onOpenQR={() => setShowQR(true)} />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <EventCarousel upcoming={upcoming} past={past} />
        <EmailSignupPlaceholder brandName={displayName} isOwner={isOwner} />
      </div>

      <FellowshipFooter />

      {showQR && profile.public_slug && (
        <QRCodeModal slug={profile.public_slug} onClose={() => setShowQR(false)} />
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
git add src/pages/PublicProfile.tsx
git commit -m "feat: unified ProfilePage with ambient header, carousel, email placeholder"
```

---

### Task 8: Convert Profile.tsx to redirect

**Files:**
- Modify: `src/pages/Profile.tsx` (complete rewrite)

- [ ] **Step 1: Replace Profile.tsx with a redirect**

```tsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

export function ProfilePage() {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (profile?.public_slug) {
    return <Navigate to={`/@${profile.public_slug}`} replace />
  }

  // Fallback if no slug set yet
  return <Navigate to="/reglages" replace />
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Profile.tsx
git commit -m "feat: /profil redirects to /@slug"
```

---

### Task 9: Add friends/followers to Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add Réseau section to Dashboard**

Add imports at the top of `src/pages/Dashboard.tsx`:

```tsx
import { useMyFriends, useMyFollowers } from '@/hooks/use-follows'
import { UserCheck } from 'lucide-react'
```

Add hooks inside `DashboardPage` component, after the existing hooks:

```tsx
  const { friends, loading: friendsLoading } = useMyFriends()
  const { followers, loading: followersLoading } = useMyFollowers()
```

Add the Réseau section at the end of the return JSX, after the "Derniers ajouts" section's closing `</section>` and `)}`:

```tsx
      {/* Réseau */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold mb-4">
          <Users className="h-5 w-5 text-accent" />
          Réseau
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Friends */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              Amis ({friendsLoading ? '…' : friends.length})
            </h3>
            {friendsLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-muted-foreground">Pas encore d'amis</p>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => (
                  <Link
                    key={friend.id}
                    to={`/@${friend.public_slug ?? friend.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-3 hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(friend.brand_name ?? friend.display_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{friend.brand_name ?? friend.display_name ?? 'Utilisateur'}</p>
                      {friend.city && <p className="text-xs text-muted-foreground">{friend.city}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {/* Followers */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
              <UserCheck className="inline h-4 w-4 mr-1" />
              Abonnés ({followersLoading ? '…' : followers.length})
            </h3>
            {followersLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : followers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Personne ne te suit encore</p>
            ) : (
              <div className="space-y-2">
                {followers.map(follower => (
                  <Link
                    key={follower.id}
                    to={`/@${follower.public_slug ?? follower.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-card shadow-[2px_0_40px_-10px_rgba(0,0,0,0.06)] p-3 hover:bg-muted transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(follower.brand_name ?? follower.display_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{follower.brand_name ?? follower.display_name ?? 'Utilisateur'}</p>
                      {follower.city && <p className="text-xs text-muted-foreground">{follower.city}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add Réseau section with friends/followers to Dashboard"
```

---

### Task 10: Remove old QRCodeCard + cleanup

**Files:**
- Delete: `src/components/profile/QRCodeCard.tsx`

- [ ] **Step 1: Check for remaining imports of QRCodeCard**

```bash
cd /c/Users/uriel/desktop/DEVS/fellowship && grep -r "QRCodeCard" src/ --include="*.tsx" --include="*.ts" -l
```

If any files still import QRCodeCard, remove the imports. Expected: only `QRCodeCard.tsx` itself.

- [ ] **Step 2: Delete the file**

```bash
rm src/components/profile/QRCodeCard.tsx
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add -u src/components/profile/QRCodeCard.tsx
git commit -m "chore: remove old QRCodeCard, replaced by QRCodeModal"
```

---

### Task 11: Final integration verification

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Expected: clean build, no errors

- [ ] **Step 2: Run lint on changed files**

```bash
npx eslint src/components/profile/ProfileHeader.tsx src/components/profile/EventCarousel.tsx src/components/profile/EmailSignupPlaceholder.tsx src/components/profile/QRCodeModal.tsx src/components/profile/FellowshipFooter.tsx src/pages/PublicProfile.tsx src/pages/Profile.tsx src/pages/Dashboard.tsx
```

Expected: no errors

- [ ] **Step 3: Visual check**

Start dev server with `pnpm dev` and verify:
1. `/@my-slug` shows the unified profile with ambient gradient header
2. Avatar centered with glow
3. "Modifier mon profil" + QR code buttons visible (owner view)
4. Event cards scroll horizontally with snap
5. Email signup placeholder visible with owner hint badge
6. Fellowship logo footer at bottom, subtle opacity
7. QR code modal opens/closes, download and copy work
8. `/profil` redirects to `/@slug`
9. Visiting another user's profile shows "Suivre" button instead of edit buttons
10. Dashboard now has "Réseau" section with friends and followers

- [ ] **Step 4: Final commit if any fixups needed**

```bash
git add -A
git commit -m "fix: final integration adjustments for profile redesign"
```
