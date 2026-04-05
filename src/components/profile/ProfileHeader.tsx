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
  const bannerUrl = profile.banner_url

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
      {bannerUrl && <div className="absolute inset-0 bg-black/50" />}
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

        <h1 className="mt-4 text-2xl font-bold text-white">{displayName}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
        {profile.bio && (
          <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-white/70">{profile.bio}</p>
        )}
      </div>
    </div>
  )
}
