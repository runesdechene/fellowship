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
import { ProfileNetworkStats } from '@/components/profile/ProfileNetworkStats'
import { Code } from 'lucide-react'
import type { Profile } from '@/types/database'
import type { NetworkMember } from '@/lib/profile-network'
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
  const [friends, setFriends] = useState<NetworkMember[]>([])
  const [followers, setFollowers] = useState<NetworkMember[]>([])
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

      const partsQuery = supabase
        .from('participations')
        .select('id, event_id, events(id, name, start_date, end_date, city, department, tags, image_url)')
        .eq('user_id', profileData.id)
        .eq('status', 'inscrit')
        .order('created_at', { ascending: false })

      // Only show "inscrit" participations on public profile (for everyone, including owner)

      const { data: parts } = await partsQuery

      setParticipations((parts as ProfileParticipation[] | null) ?? [])

      // Fetch friends + followers with recency timestamps for this profile
      try {
        type FriendRow = { friend_id: string; friended_at: string }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: friendRows } = await (supabase.rpc as any)('get_friends_with_dates', { p_user_id: profileData.id })
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

          {!networkLoading && (
            <ProfileNetworkStats friends={friends} followers={followers} isOwner={isOwner} />
          )}

          <div className="profile-divider">
            <div className="profile-divider-line" />
          </div>

          {isOwner && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(61,48,40,0.4)', textAlign: 'center', margin: '0 0 8px', fontStyle: 'italic' }}>
              Seuls vos événements inscrits apparaissent sur cette page.
            </p>
          )}

          <EventCarousel upcoming={upcoming} past={past} />

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
