import { Link } from 'react-router-dom'
import { Settings, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FollowButton } from '@/components/profile/FollowButton'
import type { Profile } from '@/types/database'

interface ProfileHeaderProps {
  profile: Profile
  isOwner: boolean
  onOpenQR: () => void
}

export function ProfileHeader({ profile, isOwner, onOpenQR }: ProfileHeaderProps) {
  const displayName = profile.brand_name ?? profile.display_name ?? 'Utilisateur'
  const subtitle = [profile.type === 'exposant' ? 'Exposant' : null, profile.city].filter(Boolean).join(' · ')

  return (
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
            style={{ boxShadow: '0 0 30px rgba(139,97,66,0.4)' }}
          />
        ) : (
          <div
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl font-bold text-white ring-4 ring-white/10"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
              boxShadow: '0 0 30px rgba(139,97,66,0.4)',
            }}
          >
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-bold text-white">{displayName}</h1>
      {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      {profile.bio && (
        <p className="mt-3 max-w-xs text-center text-sm leading-relaxed text-white/50">
          {profile.bio}
        </p>
      )}
    </div>
  )
}
