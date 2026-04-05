import { Link } from 'react-router-dom'
import { Settings, QrCode } from 'lucide-react'
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

      {/* Edit + QR buttons — under banner, right side */}
      {isOwner && (
        <div className="profile-banner-actions">
          <Link to="/reglages" className="profile-banner-btn">
            <Settings strokeWidth={1.5} />
          </Link>
          <button onClick={onOpenQR} className="profile-banner-btn">
            <QrCode strokeWidth={1.5} />
          </button>
        </div>
      )}

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

    </div>
  )
}
