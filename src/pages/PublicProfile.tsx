import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { FollowButton } from '@/components/profile/FollowButton'
import { MapPin, Globe, Calendar, ExternalLink } from 'lucide-react'
import type { Profile } from '@/types/database'

interface PublicParticipation {
  id: string
  event_id: string
  events: {
    id: string
    name: string
    start_date: string
    end_date: string
    city: string
    primary_tag: string
    external_url: string | null
  } | null
}

function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-10 w-10 text-sm'
  if (url) {
    return <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover`} />
  }
  return (
    <div className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [participations, setParticipations] = useState<PublicParticipation[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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
        .select('id, event_id, events(id, name, start_date, end_date, city, primary_tag, external_url)')
        .eq('user_id', profileData.id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })

      setParticipations((parts as PublicParticipation[] | null) ?? [])
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

  const displayName = profile.brand_name ?? profile.display_name ?? 'Utilisateur'

  const upcoming = participations.filter(
    p => p.events && new Date(p.events.start_date) >= new Date()
  )
  const past = participations.filter(
    p => p.events && new Date(p.events.start_date) < new Date()
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Profile header */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar name={displayName} url={profile.avatar_url} size="lg" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <FollowButton targetId={profile.id} />
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {profile.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.city}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Site web
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {profile.bio && (
              <p className="mt-2 text-sm text-foreground/80">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Public calendar */}
        {participations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucun événement public pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-3 text-base font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide text-xs">
                  <Calendar className="h-4 w-4" />
                  Prochains événements
                </h2>
                <div className="space-y-2">
                  {upcoming.map(p => p.events && (
                    <EventCard key={p.id} event={p.events} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="mb-3 text-base font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide text-xs">
                  <Calendar className="h-4 w-4" />
                  Événements passés
                </h2>
                <div className="space-y-2">
                  {past.map(p => p.events && (
                    <EventCard key={p.id} event={p.events} past />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EventCard({
  event,
  past = false,
}: {
  event: PublicParticipation['events'] & {}
  past?: boolean
}) {
  if (!event) return null
  return (
    <div className={`rounded-xl border border-border bg-card p-3 flex items-center gap-3 ${past ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{event.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(event.start_date)}
          {event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}
          {' · '}
          {event.city}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
        {event.primary_tag}
      </span>
      {event.external_url && (
        <a
          href={event.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  )
}
