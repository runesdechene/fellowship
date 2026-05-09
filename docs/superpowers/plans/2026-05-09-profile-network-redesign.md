# Profile Network Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promouvoir amis/abonnés en haut du profil sous forme de pills cliquables (compteur + 3 avatars récents), ouvrir une modal détaillée au clic, fixer le bug d'avatars manquants, et permettre le "Suivre en retour" depuis la modal abonnés (owner only).

**Architecture:** Pure helpers (`src/lib/profile-network.ts`) pour le tri par récence et la décision d'afficher le CTA follow-back, testés en unitaire. Trois nouveaux composants React (`ProfileNetworkStats` + `FriendsModal` + `FollowersModal`) consommant un sous-composant partagé `NetworkListItem`. Nouveau RPC `get_friends_with_dates` pour exposer la date d'amitié mutuelle. Refactoring de `PublicProfile.tsx` pour fetch les nouvelles données et placer le bloc en haut.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind v4, Supabase (Postgres + supabase-js), Vitest 4 + Testing Library, lucide-react, React Router 7.

**Spec:** `docs/superpowers/specs/2026-05-09-profile-network-redesign-design.md`

---

## File Structure

**New files:**
- `supabase/migrations/20260509120000_get_friends_with_dates.sql` — Postgres RPC
- `src/lib/profile-network.ts` — pure helpers (recency sort, follow-back predicate)
- `src/lib/profile-network.test.ts` — unit tests
- `src/components/profile/NetworkListItem.tsx` — shared row (avatar + name + craft + optional right slot)
- `src/components/profile/NetworkListItem.test.tsx` — avatar fallback test
- `src/components/profile/FriendsModal.tsx` — modal Amis
- `src/components/profile/FollowersModal.tsx` — modal Abonnés (avec follow-back si owner)
- `src/components/profile/ProfileNetworkStats.tsx` — les deux pills cliquables + container
- `src/components/profile/ProfileNetworkStats.css` — styles co-localisés du nouveau bloc

**Modified files:**
- `src/pages/PublicProfile.tsx` — supprime l'ancien bloc, change le fetch (utilise nouveau RPC + ordre), monte `<ProfileNetworkStats>` en haut
- `src/pages/Profile.css` — supprime classes `.profile-network*` devenues inutiles
- `package.json` — bump version

**Conventions du projet (à respecter dans chaque task) :**
- Pnpm pour tout (`pnpm dev`, `pnpm build`, `pnpm test`)
- Pas de commentaires inutiles dans le code
- Path alias `@` → `./src`
- Pattern d'avatar fallback déjà utilisé dans `EventPage.tsx`, `ParticipantsModal.tsx` : `GRADIENTS` array + `hashName()` helper. **Dans ce plan, on duplique ce pattern une fois de plus dans `NetworkListItem.tsx`** (factoriser hors scope, YAGNI)
- Modal pattern : copier la structure de `src/components/events/ParticipantsModal.tsx` (overlay, max-w-md, scroll, header + close button)

---

### Task 1 : Migration SQL — RPC `get_friends_with_dates`

**Files:**
- Create: `supabase/migrations/20260509120000_get_friends_with_dates.sql`

- [ ] **Step 1 : Créer la migration**

Créer le fichier `supabase/migrations/20260509120000_get_friends_with_dates.sql` avec :

```sql
-- Returns mutual-follow friends with the date the friendship became mutual
-- (= MAX of both follow timestamps). Used for sorting friends by recency.
CREATE OR REPLACE FUNCTION get_friends_with_dates(p_user_id UUID)
RETURNS TABLE(friend_id UUID, friended_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    f1.following_id AS friend_id,
    GREATEST(f1.created_at, f2.created_at) AS friended_at
  FROM follows f1
  INNER JOIN follows f2
    ON f1.follower_id = f2.following_id
   AND f1.following_id = f2.follower_id
  WHERE f1.follower_id = p_user_id
$$;
```

- [ ] **Step 2 : Appliquer la migration sur le projet Supabase**

Run :
```bash
"C:/Users/uriel/desktop/DEVS/fellowship/node_modules/supabase/bin/supabase.exe" db push
```

Expected : confirmation `Applying migration 20260509120000_get_friends_with_dates.sql...` puis succès. Si la commande demande une confirmation interactive, taper `Y`.

- [ ] **Step 3 : Vérifier le RPC fonctionne**

Run un test ad-hoc dans le SQL Editor Supabase ou via psql (depuis n'importe quel user authentifié dans le dashboard) :

```sql
SELECT * FROM get_friends_with_dates('<un user_id valide>'::uuid) LIMIT 5;
```

Expected : retourne 0+ lignes avec colonnes `friend_id` (UUID) et `friended_at` (timestamp). Pas d'erreur.

- [ ] **Step 4 : Commit**

```bash
git add supabase/migrations/20260509120000_get_friends_with_dates.sql
git commit -m "migration: add get_friends_with_dates RPC for friend recency sort"
```

---

### Task 2 : Helpers purs — `src/lib/profile-network.ts`

**Files:**
- Create: `src/lib/profile-network.ts`
- Test: `src/lib/profile-network.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/lib/profile-network.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { getRecentPreview, shouldShowFollowBack, type NetworkMember } from './profile-network'

const make = (id: string, joinedAt: string): NetworkMember => ({
  id,
  display_name: id,
  brand_name: null,
  avatar_url: null,
  public_slug: null,
  craft_type: null,
  city: null,
  joinedAt,
})

describe('getRecentPreview', () => {
  it('returns the N most recent members sorted desc by joinedAt', () => {
    const a = make('a', '2026-01-01T00:00:00Z')
    const b = make('b', '2026-03-01T00:00:00Z')
    const c = make('c', '2026-02-01T00:00:00Z')
    const d = make('d', '2026-04-01T00:00:00Z')
    const result = getRecentPreview([a, b, c, d], 3)
    expect(result.map(m => m.id)).toEqual(['d', 'b', 'c'])
  })

  it('returns all members when N >= length', () => {
    const a = make('a', '2026-01-01T00:00:00Z')
    expect(getRecentPreview([a], 3).map(m => m.id)).toEqual(['a'])
  })

  it('returns an empty array for empty input', () => {
    expect(getRecentPreview([], 3)).toEqual([])
  })

  it('does not mutate the input array', () => {
    const a = make('a', '2026-01-01T00:00:00Z')
    const b = make('b', '2026-03-01T00:00:00Z')
    const input = [a, b]
    getRecentPreview(input, 3)
    expect(input.map(m => m.id)).toEqual(['a', 'b'])
  })
})

describe('shouldShowFollowBack', () => {
  it('returns true for owner viewing a non-friend follower', () => {
    expect(shouldShowFollowBack('x', new Set(['a', 'b']), true)).toBe(true)
  })

  it('returns false when the follower is already a friend', () => {
    expect(shouldShowFollowBack('a', new Set(['a', 'b']), true)).toBe(false)
  })

  it('returns false when not the owner (visiting another profile)', () => {
    expect(shouldShowFollowBack('x', new Set(['a']), false)).toBe(false)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `pnpm test src/lib/profile-network.test.ts`
Expected : FAIL avec `Failed to resolve import "./profile-network"`.

- [ ] **Step 3 : Implémenter le module**

Créer `src/lib/profile-network.ts` :

```ts
export type NetworkMember = {
  id: string
  display_name: string | null
  brand_name: string | null
  avatar_url: string | null
  public_slug: string | null
  craft_type: string | null
  city: string | null
  joinedAt: string
}

export function getRecentPreview(members: NetworkMember[], limit: number): NetworkMember[] {
  return [...members]
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
    .slice(0, limit)
}

export function shouldShowFollowBack(
  memberId: string,
  friendIds: Set<string>,
  isOwner: boolean,
): boolean {
  return isOwner && !friendIds.has(memberId)
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run : `pnpm test src/lib/profile-network.test.ts`
Expected : PASS — 7 tests passent.

- [ ] **Step 5 : Commit**

```bash
git add src/lib/profile-network.ts src/lib/profile-network.test.ts
git commit -m "feat(profile): add network helpers — recency sort + follow-back predicate"
```

---

### Task 3 : Composant `NetworkListItem` (avatar fix au passage)

**Files:**
- Create: `src/components/profile/NetworkListItem.tsx`
- Test: `src/components/profile/NetworkListItem.test.tsx`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/components/profile/NetworkListItem.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NetworkListItem } from './NetworkListItem'
import type { NetworkMember } from '@/lib/profile-network'

const base: NetworkMember = {
  id: 'u1',
  display_name: 'Alice',
  brand_name: null,
  avatar_url: null,
  public_slug: 'alice',
  craft_type: 'Forgeron',
  city: 'Paris',
  joinedAt: '2026-05-01T00:00:00Z',
}

const renderItem = (m: NetworkMember) =>
  render(
    <MemoryRouter>
      <NetworkListItem member={m} />
    </MemoryRouter>,
  )

describe('NetworkListItem', () => {
  it('renders the avatar image when avatar_url is provided', () => {
    renderItem({ ...base, avatar_url: 'https://example.com/a.jpg' })
    const img = screen.getByRole('img', { name: 'Alice' }) as HTMLImageElement
    expect(img.src).toBe('https://example.com/a.jpg')
  })

  it('renders an initial fallback when avatar_url is null', () => {
    renderItem({ ...base, avatar_url: null })
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('prefers brand_name over display_name', () => {
    renderItem({ ...base, brand_name: 'Atelier du Chêne', display_name: 'Alice' })
    expect(screen.getByText('Atelier du Chêne')).toBeInTheDocument()
  })

  it('renders craft_type when provided', () => {
    renderItem(base)
    expect(screen.getByText('Forgeron')).toBeInTheDocument()
  })

  it('links to /@public_slug', () => {
    renderItem(base)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/@alice')
  })

  it('falls back to /@id when public_slug is null', () => {
    renderItem({ ...base, public_slug: null })
    expect(screen.getByRole('link')).toHaveAttribute('href', '/@u1')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `pnpm test src/components/profile/NetworkListItem.test.tsx`
Expected : FAIL — module non résolu.

- [ ] **Step 3 : Implémenter le composant**

Créer `src/components/profile/NetworkListItem.tsx` :

```tsx
import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { NetworkMember } from '@/lib/profile-network'

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

interface NetworkListItemProps {
  member: NetworkMember
  rightSlot?: ReactNode
}

export function NetworkListItem({ member, rightSlot }: NetworkListItemProps) {
  const name = member.brand_name ?? member.display_name ?? 'Utilisateur'
  const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]
  const target = `/@${member.public_slug ?? member.id}`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10 }}>
      <Link
        to={target}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
        className="hover:bg-muted"
      >
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={name}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${from}, ${to})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {name[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          {member.craft_type && (
            <div style={{ fontSize: 11, color: 'rgba(61,48,40,0.4)' }}>{member.craft_type}</div>
          )}
        </div>
      </Link>
      {rightSlot}
    </div>
  )
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run : `pnpm test src/components/profile/NetworkListItem.test.tsx`
Expected : PASS — 6 tests passent.

- [ ] **Step 5 : Commit**

```bash
git add src/components/profile/NetworkListItem.tsx src/components/profile/NetworkListItem.test.tsx
git commit -m "feat(profile): NetworkListItem — shared row with proper avatar rendering"
```

---

### Task 4 : `FriendsModal`

**Files:**
- Create: `src/components/profile/FriendsModal.tsx`

Pas de tests unitaires (composant essentiellement présentational, rendu testé manuellement). Le pattern est calqué sur `ParticipantsModal`.

- [ ] **Step 1 : Implémenter le composant**

Créer `src/components/profile/FriendsModal.tsx` :

```tsx
import { X, Users } from 'lucide-react'
import { NetworkListItem } from './NetworkListItem'
import type { NetworkMember } from '@/lib/profile-network'

interface FriendsModalProps {
  friends: NetworkMember[]
  onClose: () => void
}

export function FriendsModal({ friends, onClose }: FriendsModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[70vh] flex flex-col rounded-2xl bg-card overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid hsl(var(--border))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users style={{ width: 18, height: 18, color: 'rgba(61,48,40,0.45)' }} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>
              Amis ({friends.length})
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'hsl(var(--muted))',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(61,48,40,0.5)',
            }}
            aria-label="Fermer"
          >
            <X style={{ width: 16, height: 16 }} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {friends.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(61,48,40,0.3)' }}>
              Pas encore d'amis
            </div>
          ) : (
            friends.map(f => <NetworkListItem key={f.id} member={f} />)
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier le build TS**

Run : `pnpm build`
Expected : `built in Xs`, aucune erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add src/components/profile/FriendsModal.tsx
git commit -m "feat(profile): FriendsModal — dedicated modal for friends list"
```

---

### Task 5 : `FollowersModal` (avec follow-back)

**Files:**
- Create: `src/components/profile/FollowersModal.tsx`

- [ ] **Step 1 : Implémenter le composant**

Créer `src/components/profile/FollowersModal.tsx` :

```tsx
import { useState } from 'react'
import { X, UserCheck, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { NetworkListItem } from './NetworkListItem'
import { shouldShowFollowBack, type NetworkMember } from '@/lib/profile-network'

interface FollowersModalProps {
  followers: NetworkMember[]
  friendIds: Set<string>
  isOwner: boolean
  ownerEmptyLabel?: string
  onClose: () => void
}

export function FollowersModal({ followers, friendIds, isOwner, ownerEmptyLabel, onClose }: FollowersModalProps) {
  const { user } = useAuth()
  const [followedBack, setFollowedBack] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Set<string>>(new Set())

  const handleFollowBack = async (followerId: string) => {
    if (!user || pending.has(followerId)) return
    setPending(prev => new Set(prev).add(followerId))
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: followerId })
    setPending(prev => {
      const next = new Set(prev)
      next.delete(followerId)
      return next
    })
    if (!error) {
      setFollowedBack(prev => new Set(prev).add(followerId))
    }
  }

  const emptyLabel = isOwner ? ownerEmptyLabel ?? 'Personne ne te suit encore' : 'Aucun abonné'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[70vh] flex flex-col rounded-2xl bg-card overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid hsl(var(--border))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCheck style={{ width: 18, height: 18, color: 'rgba(61,48,40,0.45)' }} strokeWidth={1.5} />
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700 }}>
              Abonnés ({followers.length})
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'hsl(var(--muted))',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(61,48,40,0.5)',
            }}
            aria-label="Fermer"
          >
            <X style={{ width: 16, height: 16 }} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {followers.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'rgba(61,48,40,0.3)' }}>
              {emptyLabel}
            </div>
          ) : (
            followers.map(f => {
              const showBtn = shouldShowFollowBack(f.id, friendIds, isOwner) && !followedBack.has(f.id)
              const rightSlot = showBtn ? (
                <button
                  onClick={() => handleFollowBack(f.id)}
                  disabled={pending.has(f.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: 'hsl(var(--primary))',
                    color: 'white',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: pending.has(f.id) ? 'wait' : 'pointer',
                    flexShrink: 0,
                    opacity: pending.has(f.id) ? 0.6 : 1,
                  }}
                >
                  <UserPlus style={{ width: 12, height: 12 }} strokeWidth={2} />
                  Suivre
                </button>
              ) : undefined
              return <NetworkListItem key={f.id} member={f} rightSlot={rightSlot} />
            })
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier le build TS**

Run : `pnpm build`
Expected : `built in Xs`, aucune erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add src/components/profile/FollowersModal.tsx
git commit -m "feat(profile): FollowersModal — list with optional follow-back CTA for owner"
```

---

### Task 6 : `ProfileNetworkStats` (pills + ouverture des modals)

**Files:**
- Create: `src/components/profile/ProfileNetworkStats.tsx`
- Create: `src/components/profile/ProfileNetworkStats.css`

- [ ] **Step 1 : Créer le CSS**

Créer `src/components/profile/ProfileNetworkStats.css` :

```css
.pn-stats {
  display: flex;
  gap: 8px;
  margin: 16px 0 12px;
}

.pn-stat {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: hsl(var(--card));
  border: 1px solid rgba(61,48,40,0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  text-align: left;
  font: inherit;
  color: inherit;
}

.pn-stat:hover {
  background: hsl(var(--muted));
  border-color: rgba(61,48,40,0.15);
}

.pn-bubbles {
  display: inline-flex;
  flex-shrink: 0;
}

.pn-bubble {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid hsl(var(--card));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: 700;
  overflow: hidden;
}

.pn-bubble + .pn-bubble {
  margin-left: -8px;
}

.pn-bubble img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pn-bubble-empty {
  background: rgba(61,48,40,0.08);
}

.pn-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  min-width: 0;
}

.pn-num {
  font-size: 15px;
  font-weight: 700;
}

.pn-label {
  font-size: 11px;
  color: rgba(61,48,40,0.55);
}

@media (max-width: 480px) {
  .pn-stats {
    flex-direction: column;
  }
}
```

- [ ] **Step 2 : Implémenter le composant**

Créer `src/components/profile/ProfileNetworkStats.tsx` :

```tsx
import { useMemo, useState } from 'react'
import { FriendsModal } from './FriendsModal'
import { FollowersModal } from './FollowersModal'
import { getRecentPreview, type NetworkMember } from '@/lib/profile-network'
import './ProfileNetworkStats.css'

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

interface ProfileNetworkStatsProps {
  friends: NetworkMember[]
  followers: NetworkMember[]
  isOwner: boolean
}

export function ProfileNetworkStats({ friends, followers, isOwner }: ProfileNetworkStatsProps) {
  const [openModal, setOpenModal] = useState<'friends' | 'followers' | null>(null)

  const friendsPreview = useMemo(() => getRecentPreview(friends, 3), [friends])
  const followersPreview = useMemo(() => getRecentPreview(followers, 3), [followers])
  const friendIds = useMemo(() => new Set(friends.map(f => f.id)), [friends])

  return (
    <>
      <div className="pn-stats">
        <button className="pn-stat" onClick={() => setOpenModal('friends')} aria-label={`Voir les ${friends.length} amis`}>
          <BubbleStack members={friendsPreview} />
          <div className="pn-text">
            <span className="pn-num">{friends.length}</span>
            <span className="pn-label">{friends.length === 1 ? 'ami' : 'amis'}</span>
          </div>
        </button>
        <button className="pn-stat" onClick={() => setOpenModal('followers')} aria-label={`Voir les ${followers.length} abonnés`}>
          <BubbleStack members={followersPreview} />
          <div className="pn-text">
            <span className="pn-num">{followers.length}</span>
            <span className="pn-label">{followers.length === 1 ? 'abonné' : 'abonnés'}</span>
          </div>
        </button>
      </div>

      {openModal === 'friends' && (
        <FriendsModal friends={friends} onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'followers' && (
        <FollowersModal
          followers={followers}
          friendIds={friendIds}
          isOwner={isOwner}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  )
}

function BubbleStack({ members }: { members: NetworkMember[] }) {
  if (members.length === 0) {
    return (
      <span className="pn-bubbles">
        <span className="pn-bubble pn-bubble-empty" aria-hidden />
      </span>
    )
  }
  return (
    <span className="pn-bubbles">
      {members.map(m => {
        const name = m.brand_name ?? m.display_name ?? '?'
        const [from, to] = GRADIENTS[hashName(name) % GRADIENTS.length]
        return (
          <span
            key={m.id}
            className="pn-bubble"
            style={{ background: m.avatar_url ? 'transparent' : `linear-gradient(135deg, ${from}, ${to})` }}
            title={name}
          >
            {m.avatar_url ? <img src={m.avatar_url} alt="" /> : (name[0]?.toUpperCase() ?? '?')}
          </span>
        )
      })}
    </span>
  )
}
```

- [ ] **Step 3 : Vérifier le build TS**

Run : `pnpm build`
Expected : `built in Xs`, aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/components/profile/ProfileNetworkStats.tsx src/components/profile/ProfileNetworkStats.css
git commit -m "feat(profile): ProfileNetworkStats — clickable pills with avatar preview"
```

---

### Task 7 : Intégration dans `PublicProfile.tsx` + suppression de l'ancien bloc

**Files:**
- Modify: `src/pages/PublicProfile.tsx`
- Modify: `src/pages/Profile.css`

- [ ] **Step 1 : Vérifier l'état du fichier**

Run : `git diff HEAD -- src/pages/PublicProfile.tsx src/pages/Profile.css`
Expected : aucune sortie (fichier propre, pas de WIP à préserver).

- [ ] **Step 2 : Modifier le fetch dans `PublicProfile.tsx`**

Dans `src/pages/PublicProfile.tsx`, repérer la fonction `fetchProfile` (autour de la ligne 51) et son bloc `try { ... }` qui fetche amis + abonnés (autour des lignes 95-112). Remplacer ce bloc :

```tsx
      // Fetch friends (mutual follows) and followers for this profile
      try {
        const { data: friendIds } = await supabase.rpc('get_friend_ids', { p_user_id: profileData.id })
        if (friendIds && (friendIds as string[]).length > 0) {
          const { data: friendProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', friendIds as string[])
          setFriends(friendProfiles ?? [])
        }

        const { data: followerData } = await supabase
          .from('follows')
          .select('profiles!follows_follower_id_fkey(*)')
          .eq('following_id', profileData.id)
        setFollowers(followerData?.map((f: { profiles: Profile }) => f.profiles).filter(Boolean) ?? [])
      } catch {
        // Non-critical — profile still loads
      }
      setNetworkLoading(false)
```

par :

```tsx
      // Fetch friends + followers with recency timestamps for this profile
      try {
        type FriendRow = { friend_id: string; friended_at: string }
        const { data: friendRows } = await supabase.rpc('get_friends_with_dates', { p_user_id: profileData.id })
        const friendDates = (friendRows as FriendRow[] | null) ?? []

        if (friendDates.length > 0) {
          const { data: friendProfiles } = await supabase
            .from('profiles')
            .select('id, display_name, brand_name, avatar_url, public_slug, craft_type, city')
            .in('id', friendDates.map(f => f.friend_id))
          const dateMap = new Map(friendDates.map(f => [f.friend_id, f.friended_at]))
          const enriched: NetworkMember[] = (friendProfiles ?? []).map(p => ({
            ...p,
            joinedAt: dateMap.get(p.id) ?? new Date(0).toISOString(),
          }))
          setFriends(enriched)
        } else {
          setFriends([])
        }

        const { data: followerData } = await supabase
          .from('follows')
          .select('created_at, profiles!follows_follower_id_fkey(id, display_name, brand_name, avatar_url, public_slug, craft_type, city)')
          .eq('following_id', profileData.id)
          .order('created_at', { ascending: false })

        type FollowerRow = {
          created_at: string
          profiles: {
            id: string
            display_name: string | null
            brand_name: string | null
            avatar_url: string | null
            public_slug: string | null
            craft_type: string | null
            city: string | null
          } | null
        }

        const followersList: NetworkMember[] = ((followerData as FollowerRow[] | null) ?? [])
          .filter(f => f.profiles)
          .map(f => ({ ...f.profiles!, joinedAt: f.created_at }))
        setFollowers(followersList)
      } catch {
        // Non-critical — profile still loads
      }
      setNetworkLoading(false)
```

- [ ] **Step 3 : Mettre à jour les imports et types de state**

Toujours dans `src/pages/PublicProfile.tsx` :

- En haut, retirer `Users, UserCheck, Code` du import lucide-react et ne garder que `Code` :
  - Avant : `import { Users, UserCheck, Code } from 'lucide-react'`
  - Après : `import { Code } from 'lucide-react'`

- Ajouter l'import du nouveau composant et du type :
  - `import { ProfileNetworkStats } from '@/components/profile/ProfileNetworkStats'`
  - `import type { NetworkMember } from '@/lib/profile-network'`

- Modifier les types des states `friends` / `followers` :
  - Avant : `const [friends, setFriends] = useState<Profile[]>([])`
  - Après : `const [friends, setFriends] = useState<NetworkMember[]>([])`
  - Avant : `const [followers, setFollowers] = useState<Profile[]>([])`
  - Après : `const [followers, setFollowers] = useState<NetworkMember[]>([])`

- [ ] **Step 4 : Insérer `<ProfileNetworkStats>` en haut + supprimer l'ancien bloc**

Toujours dans `src/pages/PublicProfile.tsx`. Repérer l'ouverture du bloc `<div className="profile-content">` (ligne ~169). Juste après le rendu conditionnel `EmailSignupPlaceholder`, ajouter `<ProfileNetworkStats>` AVANT le `<div className="profile-divider">`. Remplacer :

```tsx
        <div className="profile-content">
          {(!user || isOwner) && (
            <EmailSignupPlaceholder brandName={displayName} isOwner={isOwner} />
          )}

          <div className="profile-divider">
            <div className="profile-divider-line" />
          </div>
```

par :

```tsx
        <div className="profile-content">
          {(!user || isOwner) && (
            <EmailSignupPlaceholder brandName={displayName} isOwner={isOwner} />
          )}

          {!networkLoading && (
            <ProfileNetworkStats friends={friends} followers={followers} isOwner={isOwner} />
          )}

          <div className="profile-divider">
            <div className="profile-divider-line" />
          </div>
```

- [ ] **Step 5 : Supprimer l'ancien bloc `profile-network`**

Toujours dans `src/pages/PublicProfile.tsx`. Supprimer entièrement le bloc qui commence par `{/* Friends & Followers */}` (autour de la ligne 186) et se termine par le `</div>` fermant `<div className="profile-network">` (autour de la ligne 238). Le bloc supprimé est :

```tsx
          {/* Friends & Followers */}
          <div className="profile-network">
              <div className="profile-network-section">
                <h3 className="profile-network-title">
                  <Users strokeWidth={1.5} />
                  Amis ({networkLoading ? '…' : friends.length})
                </h3>
                {networkLoading ? (
                  <p className="profile-network-empty">Chargement…</p>
                ) : friends.length === 0 ? (
                  <p className="profile-network-empty">Pas encore d'amis</p>
                ) : (
                  <div className="profile-network-list">
                    {friends.map(friend => (
                      <Link key={friend.id} to={`/@${friend.public_slug ?? friend.id}`} className="profile-network-item">
                        <div className="profile-network-avatar">
                          {(friend.brand_name ?? friend.display_name ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="profile-network-info">
                          <span className="profile-network-name">{friend.brand_name ?? friend.display_name ?? 'Utilisateur'}</span>
                          {friend.city && <span className="profile-network-city">{friend.city}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="profile-network-section">
                <h3 className="profile-network-title">
                  <UserCheck strokeWidth={1.5} />
                  Abonnés ({networkLoading ? '…' : followers.length})
                </h3>
                {networkLoading ? (
                  <p className="profile-network-empty">Chargement…</p>
                ) : followers.length === 0 ? (
                  <p className="profile-network-empty">{isOwner ? 'Personne ne te suit encore' : 'Aucun abonné'}</p>
                ) : (
                  <div className="profile-network-list">
                    {followers.map(follower => (
                      <Link key={follower.id} to={`/@${follower.public_slug ?? follower.id}`} className="profile-network-item">
                        <div className="profile-network-avatar">
                          {(follower.brand_name ?? follower.display_name ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="profile-network-info">
                          <span className="profile-network-name">{follower.brand_name ?? follower.display_name ?? 'Utilisateur'}</span>
                          {follower.city && <span className="profile-network-city">{follower.city}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
```

- [ ] **Step 6 : Supprimer l'import `Profile` non utilisé si applicable**

Toujours dans `src/pages/PublicProfile.tsx` : vérifier si le type `Profile` est encore utilisé après les changements (notamment dans le state setter ou dans `setProfile`). Il l'est probablement encore (`profile: Profile | null` state), donc on garde l'import. Si TypeScript signale `Profile is declared but its value is never read`, retirer l'import. Si non, ne pas y toucher.

- [ ] **Step 7 : Supprimer les classes CSS devenues inutiles**

Dans `src/pages/Profile.css`, repérer et supprimer toutes les déclarations `.profile-network`, `.profile-network-section`, `.profile-network-title`, `.profile-network-empty`, `.profile-network-list`, `.profile-network-item`, `.profile-network-avatar`, `.profile-network-info`, `.profile-network-name`, `.profile-network-city`. Astuce : `grep -n "profile-network" src/pages/Profile.css` pour les localiser, puis suppression bloc par bloc.

- [ ] **Step 8 : Vérifier le build TS et le lint**

Run : `pnpm build`
Expected : `built in Xs`, aucune erreur.

Run : `pnpm lint`
Expected : 0 erreur. (Si warnings préexistants → ignorer ; aucune nouvelle warning ne doit être introduite.)

- [ ] **Step 9 : Lancer toute la suite de tests**

Run : `pnpm test`
Expected : tous les tests passent (incluant les nouveaux des Tasks 2 et 3).

- [ ] **Step 10 : Commit**

```bash
git add src/pages/PublicProfile.tsx src/pages/Profile.css
git commit -m "feat(profile): wire ProfileNetworkStats — replace bottom block, fix avatars"
```

---

### Task 8 : Vérification manuelle + bump version + push

- [ ] **Step 1 : Lancer le serveur dev**

Run : `pnpm dev` (background)
Naviguer vers le profil propre (`/profil`) et vérifier :

1. ✅ Pills "amis" et "abonnés" apparaissent en haut sous le header (au-dessus de la divider line / EmailSignupPlaceholder)
2. ✅ Compteurs corrects (correspondent au volume réel)
3. ✅ Bulles avatars : si la personne a un `avatar_url`, c'est l'image qui s'affiche (pas la lettre). Confirmer avec un compte qui a un avatar uploadé.
4. ✅ Clic sur "amis" → modal Amis s'ouvre, liste correcte, tri récents en haut
5. ✅ Clic sur "abonnés" → modal Abonnés s'ouvre. Pour les non-amis, bouton "Suivre" visible (icône UserPlus + texte). Cliquer → bouton disparaît.
6. ✅ Aller sur le profil de quelqu'un d'autre (`/@slug`) : pills affichées, mais aucun bouton "Suivre" dans la modal abonnés
7. ✅ État vide : si compte sans amis → pill montre `0 amis` + bulle vide grise. Modal ouvrable, message "Pas encore d'amis"
8. ✅ Mobile (DevTools < 480px) : les pills passent en vertical empilées
9. ✅ L'ancien bloc en bas de page a bien disparu

- [ ] **Step 2 : Bumper la version**

Modifier `package.json` :
- Avant : `"version": "0.7.5",`
- Après : `"version": "0.7.6",`

- [ ] **Step 3 : Build final**

Run : `pnpm build`
Expected : succès.

- [ ] **Step 4 : Commit + push**

```bash
git add package.json
git commit -m "chore: bump version to 0.7.6"
git push origin main
```

Expected : push réussi vers `runesdechene/fellowship` sur `main`.
