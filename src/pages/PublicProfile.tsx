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

const GRADIENTS = [
  ['#1a0f0a', '#2d1810', '#3d2418', '#2a1a10', '#1a0f0a'],
  ['#0a0f1a', '#10182d', '#1a2a4d', '#10182d', '#0a0f1a'],
  ['#0a1a0f', '#102d18', '#1a4d2a', '#102d18', '#0a1a0f'],
  ['#1a0f02', '#2d1c0a', '#4d3418', '#2d1c0a', '#1a0f02'],
  ['#0f0a1a', '#1c102d', '#2d1a4d', '#1c102d', '#0f0a1a'],
]

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return Math.abs(h)
}

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

interface PublicProfilePageProps {
  overrideSlug?: string
}

export function PublicProfilePage({ overrideSlug }: PublicProfilePageProps = {}) {
  const { slug: paramSlug } = useParams<{ slug: string }>()
  const slug = overrideSlug ?? paramSlug
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

  const gradientColors = GRADIENTS[hashName(displayName) % GRADIENTS.length]
  const gradient = `linear-gradient(180deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 15%, ${gradientColors[2]} 40%, ${gradientColors[3]} 70%, ${gradientColors[4]} 100%)`
  const haloColor = gradientColors[2]
  const bannerUrl = profile.banner_url

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Full-page ambient background */}
      <div
        className="absolute inset-0"
        style={
          bannerUrl
            ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: gradient }
        }
      />
      {bannerUrl && <div className="absolute inset-0 bg-black/60" />}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at 50% 15%, ${haloColor}33 0%, transparent 60%)` }}
      />

      {/* Content */}
      <div className="relative">
        <ProfileHeader profile={profile} isOwner={isOwner} onOpenQR={() => setShowQR(true)} />

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
          <EventCarousel upcoming={upcoming} past={past} />
          <EmailSignupPlaceholder brandName={displayName} isOwner={isOwner} />
        </div>

        <FellowshipFooter />
      </div>

      {showQR && profile.public_slug && (
        <QRCodeModal slug={profile.public_slug} onClose={() => setShowQR(false)} />
      )}
    </div>
  )
}
