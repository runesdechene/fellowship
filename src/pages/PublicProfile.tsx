import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { EventCarousel } from '@/components/profile/EventCarousel'
import { EmailSignupPlaceholder } from '@/components/profile/EmailSignupPlaceholder'
import { QRCodeModal } from '@/components/profile/QRCodeModal'
import { FellowshipFooter } from '@/components/profile/FellowshipFooter'
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
        .select('id, event_id, events(id, name, start_date, end_date, city, primary_tag, image_url)')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      if (!user || user.id !== profileData.id) {
        partsQuery = partsQuery.eq('visibility', 'public')
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
          <EmailSignupPlaceholder brandName={displayName} isOwner={isOwner} />

          <div className="profile-divider">
            <div className="profile-divider-line" />
          </div>

          <EventCarousel upcoming={upcoming} past={past} />
        </div>

        <FellowshipFooter />
      </div>

      {showQR && profile.public_slug && (
        <QRCodeModal slug={profile.public_slug} onClose={() => setShowQR(false)} />
      )}
    </div>
  )
}
