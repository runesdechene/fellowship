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
import type { Profile, EntityRow } from '@/types/database'
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

/** Build a Profile-compatible object from an EntityRow for ProfileHeader (legacy prop). */
function entityAsProfile(entity: EntityRow): Profile {
  return {
    id: entity.actor_id,
    avatar_url: entity.avatar_url,
    banner_url: entity.banner_url,
    bio: entity.bio,
    brand_name: entity.brand_name,
    city: entity.city,
    craft_type: entity.craft_type,
    created_at: entity.created_at,
    department: entity.department,
    display_name: entity.brand_name,
    email: '',
    plan: 'free' as Profile['plan'],
    postal_code: entity.postal_code,
    public_slug: entity.public_slug,
    role: 'user',
    sex: null,
    type: 'public' as Profile['type'],
    website: entity.website,
  }
}

export function PublicProfilePage({ overrideSlug }: PublicProfilePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = overrideSlug ?? paramSlug?.replace(/^@/, '')
  const { user, currentActor } = useAuth()
  const [entity, setEntity] = useState<EntityRow | null>(null)
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

      // Resolve entity by public_slug. Also try by actor_id for notification links.
      let entityData: EntityRow | null = null
      const { data: bySlug } = await supabase
        .from('entities')
        .select('*')
        .eq('public_slug', slug!)
        .single()

      if (bySlug) {
        entityData = bySlug as EntityRow
      } else {
        // Fallback: look up by actor_id (notification links may use the raw id)
        const { data: byId } = await supabase
          .from('entities')
          .select('*')
          .eq('actor_id', slug!)
          .single()
        entityData = (byId as EntityRow) ?? null
      }

      if (!entityData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setEntity(entityData)

      const { data: parts } = await supabase
        .from('participations')
        .select('id, event_id, events(id, name, start_date, end_date, city, department, tags, image_url)')
        .eq('actor_id', entityData.actor_id)
        .eq('status', 'inscrit')
        .order('created_at', { ascending: false })

      setParticipations((parts as ProfileParticipation[] | null) ?? [])

      // Fetch friends + followers for this entity's actor_id
      try {
        type FriendRow = { friend_id: string; friended_at: string }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: friendRows } = await (supabase.rpc as any)('get_friends_with_dates', { p_user_id: entityData.actor_id })
        const friendDates = (friendRows as FriendRow[] | null) ?? []

        if (friendDates.length > 0) {
          const friendActorIds = friendDates.map(f => f.friend_id)
          const { data: friendActors } = await supabase
            .from('actor_public')
            .select('actor_id, label, avatar_url, public_slug')
            .in('actor_id', friendActorIds)
          const dateMap = new Map(friendDates.map(f => [f.friend_id, f.friended_at]))
          const enriched: NetworkMember[] = ((friendActors ?? []) as Array<{ actor_id: string | null; label: string | null; avatar_url: string | null; public_slug: string | null }>).map(a => ({
            id: a.actor_id ?? '',
            display_name: null,
            brand_name: a.label,
            avatar_url: a.avatar_url,
            public_slug: a.public_slug,
            craft_type: null,
            city: null,
            joinedAt: dateMap.get(a.actor_id ?? '') ?? new Date(0).toISOString(),
          }))
          setFriends(enriched)
        } else {
          setFriends([])
        }

        // Followers: 2-query pattern — get actor ids, then resolve via actor_public
        const { data: followerLinks } = await supabase
          .from('follows')
          .select('created_at, follower_actor')
          .eq('following_actor', entityData.actor_id)
          .order('created_at', { ascending: false })

        type FollowerLink = { created_at: string; follower_actor: string | null }
        const links = (followerLinks as FollowerLink[] | null) ?? []
        const followerActorIds = links.map(l => l.follower_actor).filter((id): id is string => !!id)

        if (followerActorIds.length > 0) {
          const { data: followerActors } = await supabase
            .from('actor_public')
            .select('actor_id, label, avatar_url, public_slug')
            .in('actor_id', followerActorIds)
          const dateMap = new Map(links.map(l => [l.follower_actor ?? '', l.created_at]))
          const followersList: NetworkMember[] = ((followerActors ?? []) as Array<{ actor_id: string | null; label: string | null; avatar_url: string | null; public_slug: string | null }>).map(a => ({
            id: a.actor_id ?? '',
            display_name: null,
            brand_name: a.label,
            avatar_url: a.avatar_url,
            public_slug: a.public_slug,
            craft_type: null,
            city: null,
            joinedAt: dateMap.get(a.actor_id ?? '') ?? new Date(0).toISOString(),
          }))
          setFollowers(followersList)
        } else {
          setFollowers([])
        }
      } catch {
        // Non-critical — profile still loads
      }
      setNetworkLoading(false)

      setLoading(false)
    }

    fetchProfile()
  }, [slug, currentActor])

  if (loading) {
    return <div className="profile-loading">Chargement…</div>
  }

  if (notFound || !entity) {
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

  const isOwner = currentActor?.id === entity.actor_id
  const displayName = entity.brand_name
  const now = new Date()

  const upcoming = participations
    .filter(p => p.events && new Date(p.events.start_date) >= now)
    .map(p => p.events!)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

  const past = participations
    .filter(p => p.events && new Date(p.events.start_date) < now)
    .map(p => p.events!)
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())

  const profileForHeader = entityAsProfile(entity)

  return (
    <div className="profile-page">
      <div className="profile-container">
        <ProfileHeader profile={profileForHeader} isOwner={isOwner} onOpenQR={() => setShowQR(true)} />

        {isOwner && entity.public_slug && (
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

      {showQR && entity.public_slug && (
        <QRCodeModal slug={entity.public_slug} onClose={() => setShowQR(false)} />
      )}

      {showEmbed && entity.public_slug && (
        <EmbedModal slug={entity.public_slug} onClose={() => setShowEmbed(false)} />
      )}
    </div>
  )
}
