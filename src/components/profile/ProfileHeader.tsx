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
  const subtitle = [profile.craft_type ?? (profile.type === 'exposant' ? 'Exposant' : null), profile.city].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col items-center pt-12 pb-4 px-4">
      {/* Avatar */}
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={displayName}
          className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/10"
          style={{ boxShadow: '0 4px 20px rgba(184,115,51,0.2)' }}
        />
      ) : (
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white ring-4 ring-primary/10"
          style={{
            background: 'linear-gradient(135deg, hsl(24 72% 44%), hsl(24 60% 55%))',
            boxShadow: '0 4px 20px rgba(184,115,51,0.2)',
          }}
        >
          {displayName[0]?.toUpperCase() ?? '?'}
        </div>
      )}

      {/* Name */}
      <h1 className="mt-4 text-3xl font-extrabold text-foreground">
        {displayName}
      </h1>
      {subtitle && (
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground/50">
          {subtitle}
        </p>
      )}

      {/* Bio */}
      {profile.bio && (
        <p className="mt-3 max-w-[280px] text-center text-sm leading-relaxed text-muted-foreground">
          {profile.bio}
        </p>
      )}

      {/* Action buttons — positioned absolutely at page top-right (rendered via parent) */}
      {isOwner ? (
        <div className="fixed right-4 top-4 z-40 flex items-center gap-2 md:absolute">
          <Link to="/reglages">
            <Button size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Modifier mon profil
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenQR}
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="fixed right-4 top-4 z-40 md:absolute">
          <FollowButton targetId={profile.id} />
        </div>
      )}
    </div>
  )
}
