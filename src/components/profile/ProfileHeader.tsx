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
  const bannerUrl = profile.banner_url

  return (
    <div className="profile-header">
      {/* Banner */}
      <div className={`profile-banner ${bannerUrl ? '' : 'profile-banner-empty'}`}>
        {bannerUrl && <img src={bannerUrl} alt="" className="profile-banner-image" />}
      </div>

      {/* Avatar — overlapping banner */}
      <div className="profile-avatar-wrapper">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={displayName} className="profile-avatar" />
        ) : (
          <div className="profile-avatar-fallback">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
        )}
      </div>

      <h1 className="profile-name">{displayName}</h1>
      {subtitle && <p className="profile-subtitle">{subtitle}</p>}

      {!isOwner && (
        <div className="profile-follow">
          <FollowButton targetId={profile.id} />
        </div>
      )}

      {profile.bio && <p className="profile-bio">{profile.bio}</p>}

      {isOwner && (
        <div className="profile-actions">
          <Link to="/reglages">
            <Button size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Modifier mon profil
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={onOpenQR}>
            <QrCode className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
