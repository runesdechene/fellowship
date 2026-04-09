import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { EventCarousel } from '@/components/profile/EventCarousel'
import { EmailSignupPlaceholder } from '@/components/profile/EmailSignupPlaceholder'
import { QRCodeModal } from '@/components/profile/QRCodeModal'
import { EmbedModal } from '@/components/profile/EmbedModal'
import { FellowshipFooter } from '@/components/profile/FellowshipFooter'
import { Users, UserCheck, Code } from 'lucide-react'
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
    tags: string[] | null
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
  const [showEmbed, setShowEmbed] = useState(false)
  const [friends, setFriends] = useState<Profile[]>([])
  const [followers, setFollowers] = useState<Profile[]>([])
  const [networkLoading, setNetworkLoading] = useState(true)

  useEffect(() => {
    if (!slug) return

    async function fetchProfile() {
      setLoading(true)

      // Try by slug first, then by ID (for notification links using actor_id)
      let profileData = null
      const { data: bySlug } = await supabase
        .from('profiles')
        .select('*')
        .eq('public_slug', slug!)
        .single()

      if (bySlug) {
        profileData = bySlug
      } else {
        const { data: byId } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', slug!)
          .single()
        profileData = byId
      }

      if (!profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData)

      let partsQuery = supabase
        .from('participations')
        .select('id, event_id, events(id, name, start_date, end_date, city, department, tags, image_url)')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      // RLS handles visibility — inscrit visible to all authenticated,
      // interesse/amis visible only to friends
      // Owner sees everything (RLS: user_id = auth.uid())

      const { data: parts } = await partsQuery

      setParticipations((parts as ProfileParticipation[] | null) ?? [])

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

        {isOwner && profile.public_slug && (
          <button
            onClick={() => setShowEmbed(true)}
            className="profile-embed-btn"
          >
            <Code size={16} strokeWidth={2} />
            Intégrer mon calendrier
          </button>
        )}

        <div className="profile-content">
          {(!user || isOwner) && (
            <EmailSignupPlaceholder brandName={displayName} isOwner={isOwner} />
          )}

          <div className="profile-divider">
            <div className="profile-divider-line" />
          </div>

          <EventCarousel upcoming={upcoming} past={past} />

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
        </div>

        <FellowshipFooter />
      </div>

      {showQR && profile.public_slug && (
        <QRCodeModal slug={profile.public_slug} onClose={() => setShowQR(false)} />
      )}

      {showEmbed && profile.public_slug && (
        <EmbedModal slug={profile.public_slug} onClose={() => setShowEmbed(false)} />
      )}
    </div>
  )
}
