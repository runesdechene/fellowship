import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Calendar } from 'lucide-react'
import type { Profile } from '@/types/database'
import './EmbedPage.css'

/* ── Tag icon map (inline — no Tailwind dependency) ── */
const TAG_EMOJI: Record<string, string> = {
  'fete-medievale': '⚔️',
  'fantastique': '✨',
  'geek': '🎮',
  'festival-musique': '🎵',
  'foire': '🎪',
  'marche': '🧺',
  'salon': '🎤',
  'litteraire': '📖',
  'historique': '🏛️',
}

/* ── Fallback gradient colors for events without images ── */
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #2c1810, #8B4513)',
  'linear-gradient(135deg, #1a3a2a, #3CB371)',
  'linear-gradient(135deg, #3a2a1a, #DAA520)',
  'linear-gradient(135deg, #1a2a3a, #4682B4)',
  'linear-gradient(135deg, #3a1a2a, #8B3A62)',
]

interface EmbedEvent {
  id: string
  events: {
    id: string
    name: string
    start_date: string
    end_date: string
    city: string
    tags: string[] | null
    image_url: string | null
  } | null
}

export function EmbedPage() {
  const { slug: rawSlug } = useParams<{ slug: string }>()
  const slug = rawSlug?.replace(/^@/, '')
  const [searchParams] = useSearchParams()

  const theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light'
  const max = Math.min(Math.max(parseInt(searchParams.get('max') ?? '10', 10) || 10, 1), 50)
  const accent = /^[0-9a-fA-F]{3,8}$/.test(searchParams.get('accent') ?? '')
    ? `#${searchParams.get('accent')}`
    : '#c87941'

  const [profile, setProfile] = useState<Profile | null>(null)
  const [participations, setParticipations] = useState<EmbedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    async function fetchData() {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('public_slug', slug!)
        .single()

      if (!p) { setNotFound(true); setLoading(false); return }
      setProfile(p)

      const { data: parts } = await supabase
        .from('participations')
        .select('id, events(id, name, start_date, end_date, city, tags, image_url)')
        .eq('user_id', p.id)
        .eq('visibility', 'public')

      setParticipations((parts as EmbedEvent[] | null) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [slug])

  const events = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return participations
      .filter(p => p.events && new Date(p.events.start_date) >= now)
      .map(p => p.events!)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, max)
  }, [participations, max])

  const formatDate = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return start === end ? fmt(s) : `${fmt(s)} — ${fmt(e)}`
  }

  if (loading) {
    return (
      <div className="embed-page" data-theme={theme}>
        <div className="embed-cards">
          {[1, 2].map(i => (
            <div key={i} className="embed-skeleton">
              <div className="embed-skeleton-image" />
              <div className="embed-skeleton-body">
                <div className="embed-skeleton-line" />
                <div className="embed-skeleton-line" />
                <div className="embed-skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return <div className="embed-centered">Profil introuvable</div>
  }

  const displayName = profile.brand_name ?? profile.display_name ?? 'Utilisateur'
  const subtitle = [profile.craft_type, profile.city].filter(Boolean).join(' · ')

  return (
    <div className="embed-page" data-theme={theme}>
      {/* Header */}
      <div className="embed-header">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={displayName} className="embed-avatar" />
        ) : (
          <div className="embed-avatar-fallback" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}>
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        <div className="embed-header-info">
          <div className="embed-header-name">{displayName}</div>
          {subtitle && <div className="embed-header-sub">{subtitle}</div>}
        </div>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="embed-empty">
          <Calendar className="embed-empty-icon" strokeWidth={1.5} />
          <p className="embed-empty-text">Aucun événement à venir</p>
        </div>
      ) : (
        <div className="embed-cards">
          {events.map((ev, i) => {
            const tag = ev.tags?.[0] ?? 'autre'
            const emoji = TAG_EMOJI[tag] ?? '📌'
            return (
              <a
                key={ev.id}
                href={`https://flw.sh/evenement/${ev.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="embed-card"
              >
                <div className="embed-card-image">
                  {ev.image_url ? (
                    <img src={ev.image_url} alt={ev.name} />
                  ) : (
                    <div
                      className="embed-card-image-fallback"
                      style={{ background: FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length] }}
                    >
                      {emoji}
                    </div>
                  )}
                  <span className="embed-card-tag">{tag}</span>
                </div>
                <div className="embed-card-body">
                  <div className="embed-card-name">{ev.name}</div>
                  <div className="embed-card-meta">
                    <span className="embed-card-date" style={{ color: accent }}>
                      {formatDate(ev.start_date, ev.end_date)}
                    </span>
                    <span className="embed-card-city">📍 {ev.city}</span>
                  </div>
                  <div className="embed-card-link" style={{ color: accent }}>
                    Voir l'événement →
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {/* Footer — Fellowship branding */}
      <a
        href={`https://flw.sh/@${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="embed-footer"
      >
        <img src="/logo.png" alt="Fellowship" className="embed-footer-logo" />
        <span className="embed-footer-text">Calendrier propulsé par Fellowship</span>
      </a>
    </div>
  )
}
