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
  } | null
}

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>()
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

      const { data: parts } = await supabase
        .from('participations')
        .select('id, event_id, events(id, name, start_date, end_date, city, primary_tag)')
        .eq('user_id', profileData.id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })

      setParticipations((parts as ProfileParticipation[] | null) ?? [])
      setLoading(false)
    }

    fetchProfile()
  }, [slug])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Chargement…
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
        <div className="text-6xl font-bold text-muted-foreground/30">404</div>
        <h1 className="text-2xl font-bold">Profil introuvable</h1>
        <p className="text-muted-foreground">
          Aucun profil ne correspond à <span className="font-mono text-foreground">@{slug}</span>.
        </p>
        <Link to="/" className="text-primary hover:underline text-sm">
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
    <div className="min-h-screen bg-background">
      <ProfileHeader profile={profile} isOwner={isOwner} onOpenQR={() => setShowQR(true)} />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <EventCarousel upcoming={upcoming} past={past} />
        <EmailSignupPlaceholder brandName={displayName} isOwner={isOwner} />
      </div>

      <FellowshipFooter />

      {showQR && profile.public_slug && (
        <QRCodeModal slug={profile.public_slug} onClose={() => setShowQR(false)} />
      )}
    </div>
  )
}
