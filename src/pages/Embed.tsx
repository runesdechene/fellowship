import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Calendar, ExternalLink } from 'lucide-react'
import type { Profile } from '@/types/database'

interface EmbedParticipation {
  id: string
  events: {
    id: string
    name: string
    start_date: string
    end_date: string
    city: string
    primary_tag: string
  } | null
}

export function EmbedPage() {
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [participations, setParticipations] = useState<EmbedParticipation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    async function fetch() {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('public_slug', slug!)
        .single()

      if (!p) { setLoading(false); return }
      setProfile(p)

      const { data: parts } = await supabase
        .from('participations')
        .select('id, events(id, name, start_date, end_date, city, primary_tag)')
        .eq('user_id', p.id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })

      setParticipations((parts as EmbedParticipation[] | null) ?? [])
      setLoading(false)
    }
    fetch()
  }, [slug])

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Chargement...</div>
  }

  if (!profile) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Profil introuvable</div>
  }

  const displayName = profile.brand_name ?? profile.display_name ?? 'Utilisateur'

  return (
    <div className="min-h-screen bg-background p-4 font-[Nunito,system-ui,sans-serif]">
      {/* Mini header */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-card p-3">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <span className="font-semibold text-sm">{displayName}</span>
        </div>
        <a
          href={`https://flw.sh/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Voir sur Fellowship
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Events list */}
      {participations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">Aucun événement public</p>
        </div>
      ) : (
        <div className="space-y-2">
          {participations.map(p => p.events && (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.events.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(p.events.start_date)}
                  {p.events.end_date !== p.events.start_date && ` — ${formatDate(p.events.end_date)}`}
                  {' · '}{p.events.city}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                {p.events.primary_tag}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
