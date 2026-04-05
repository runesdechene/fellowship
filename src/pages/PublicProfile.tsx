import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useMyFriends, useMyFollowers } from '@/hooks/use-follows'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { EventCarousel } from '@/components/profile/EventCarousel'
import { EmailSignupPlaceholder } from '@/components/profile/EmailSignupPlaceholder'
import { QRCodeModal } from '@/components/profile/QRCodeModal'
import { FellowshipFooter } from '@/components/profile/FellowshipFooter'
import { Users, UserCheck } from 'lucide-react'
import type { Profile } from '@/types/database'
import './Profile.css'

interface ProfileParticipation {
  id: string
  event_id: string
  events: {
    id: string
    name: string
    start_date: string
    end_date: string
    city: string
    department?: string
    primary_tag: string
    image_url?: string | null
  } | null
}

interface PublicProfilePageProps {
  overrideSlug?: string
}

export function PublicProfilePage({ overrideSlug }: PublicProfilePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = overrideSlug ?? paramSlug?.replace(/^@/, '')
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [participations, setParticipations] = useState<ProfileParticipation[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const { friends, loading: friendsLoading } = useMyFriends()
  const { followers, loading: followersLoading } = useMyFollowers()

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

      let partsQuery = supabase
        .from('participations')
        .select('id, event_id, events(id, name, start_date, end_date, city, department, primary_tag, image_url)')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      if (!user || user.id !== profileData.id) {
        // Show events where user has any participation status
        partsQuery = partsQuery.in('status', ['interesse', 'inscrit', 'confirme'])
      }

      const { data: parts } = await partsQuery

      setParticipations((parts as ProfileParticipation[] | null) ?? [])
      setLoading(false)
    }

    fetchProfile()
  }, [slug, user])

  if (loading) {
    return <div className="profile-loading">Chargement…</div>
  }

  if (notFound || !profile) {
    return (
      <div className="profile-not-found">
        <div className="profile-not-found-code">404</div>
        <h1 className="profile-not-found-title">Profil introuvable</h1>
        <p className="profile-not-found-text">
          Aucun profil ne correspond à <span>@{slug}</span>.
        </p>
        <Link to="/" className="profile-not-found-link">
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
    <div className="profile-page">
      <div className="profile-container">
        <ProfileHeader profile={profile} isOwner={isOwner} onOpenQR={() => setShowQR(true)} />

        <div className="profile-content">
          {(!user || isOwner) && (
            <EmailSignupPlaceholder brandName={displayName} isOwner={isOwner} />
          )}

          <div className="profile-divider">
            <div className="profile-divider-line" />
          </div>

          <EventCarousel upcoming={upcoming} past={past} />

          {/* Friends & Followers — owner only */}
          {isOwner && (
            <div className="profile-network">
              <div className="profile-network-section">
                <h3 className="profile-network-title">
                  <Users strokeWidth={1.5} />
                  Amis ({friendsLoading ? '…' : friends.length})
                </h3>
                {friendsLoading ? (
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
                  Abonnés ({followersLoading ? '…' : followers.length})
                </h3>
                {followersLoading ? (
                  <p className="profile-network-empty">Chargement…</p>
                ) : followers.length === 0 ? (
                  <p className="profile-network-empty">Personne ne te suit encore</p>
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
          )}
        </div>

        <FellowshipFooter />
      </div>

      {showQR && profile.public_slug && (
        <QRCodeModal slug={profile.public_slug} onClose={() => setShowQR(false)} />
      )}
    </div>
  )
}
