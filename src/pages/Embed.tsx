import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Calendar } from 'lucide-react'
import type { EntityRow } from '@/types/database'
import { eventShareUrl } from '@/lib/event-link'
import { parseEmbedParams } from '@/lib/embed-params'
import './EmbedPage.css'

/* Mois abrégés (rendu date façon Vitrine, sans dépendance) */
const MOIS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']

/* Durée en jours, bornes incluses (1 jour minimum) */
function durationDays(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}

interface EmbedEvent {
  id: string
  events: {
    id: string
    name: string
    start_date: string
    end_date: string
    city: string
    department: string | null
    tags: string[] | null
    image_url: string | null
    slug: string | null
  } | null
}

export function EmbedPage() {
  const { slug: rawSlug } = useParams<{ slug: string }>()
  const slug = rawSlug?.replace(/^@/, '')
  const [searchParams] = useSearchParams()

  const { view, theme: themeParam, max, accent, maxWidth } = useMemo(
    () => parseEmbedParams(searchParams),
    [searchParams],
  )

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (themeParam === 'dark') return 'dark'
    if (themeParam === 'light') return 'light'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [entity, setEntity] = useState<EntityRow | null>(null)
  const [participations, setParticipations] = useState<EmbedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    async function fetchData() {
      const { data: e } = await supabase
        .from('entities')
        .select('*')
        .eq('public_slug', slug!)
        .single()

      if (!e) { setNotFound(true); setLoading(false); return }
      setEntity(e as EntityRow)

      const { data: parts } = await supabase
        .from('participations')
        .select('id, events(id, name, start_date, end_date, city, department, tags, image_url, slug)')
        .eq('actor_id', (e as EntityRow).actor_id)
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

  useEffect(() => {
    if (themeParam !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onMq = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onMq)
    const onMsg = (e: MessageEvent) => {
      const d = e.data
      if (d && d.source === 'flwsh-embed' && d.type === 'theme'
          && (d.theme === 'light' || d.theme === 'dark')) {
        setResolvedTheme(d.theme)
      }
    }
    window.addEventListener('message', onMsg)
    window.parent.postMessage({ source: 'flwsh-embed', type: 'ready' }, '*')
    return () => {
      mq.removeEventListener('change', onMq)
      window.removeEventListener('message', onMsg)
    }
  }, [themeParam])

  // Fond transparent : le widget doit laisser transparaître le fond du site hôte.
  // On neutralise le fond global (body a `var(--page-backdrop)`) + html, sinon l'iframe
  // n'est pas traversante. Restauré au démontage (body est partagé avec le reste de l'app).
  useEffect(() => {
    const html = document.documentElement
    const prevHtml = html.style.background
    const prevBody = document.body.style.background
    html.style.background = 'transparent'
    document.body.style.background = 'transparent'
    return () => {
      html.style.background = prevHtml
      document.body.style.background = prevBody
    }
  }, [])

  useEffect(() => {
    const postHeight = () => {
      const h = document.documentElement.scrollHeight
      window.parent.postMessage({ source: 'flwsh-embed', type: 'resize', height: h }, '*')
    }
    postHeight()
    const ro = new ResizeObserver(postHeight)
    ro.observe(document.documentElement)
    window.addEventListener('load', postHeight)
    return () => {
      ro.disconnect()
      window.removeEventListener('load', postHeight)
    }
  }, [events.length, loading])

  const formatDayMonth = (start: string) => {
    const d = new Date(start)
    return {
      day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    }
  }

  if (loading) {
    return (
      <div className="embed-page" data-theme={resolvedTheme} data-view={view}>
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

  if (notFound || !entity) {
    return (
      <div className="embed-page" data-theme={resolvedTheme} data-view={view}>
        <div className="embed-centered">Profil introuvable</div>
      </div>
    )
  }

  const displayName = entity.brand_name
  const subtitle = [entity.craft_type, entity.city].filter(Boolean).join(' · ')

  return (
    <div className="embed-page" data-theme={resolvedTheme} data-view={view}>
     <div className="embed-page-container" style={{ maxWidth: maxWidth ? `${maxWidth}px` : '100%' }}>
      {/* Header */}
      {view === 'full' ? (
        <div className="embed-hero">
          <h1 className="embed-hero-title">
            Les événements de <span className="embed-hero-name">{displayName}</span>
          </h1>
          <a
            className="embed-hero-follow"
            href={`https://flw.sh/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Suivre ses événements sur Fellowship
          </a>
        </div>
      ) : (
        <div className="embed-header">
          {entity.avatar_url ? (
            <img src={entity.avatar_url} alt={displayName} className="embed-avatar" />
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
      )}

      {/* Events */}
      {events.length === 0 ? (
        <div className="embed-empty">
          <Calendar className="embed-empty-icon" strokeWidth={1.5} />
          <p className="embed-empty-text">Aucun événement à venir</p>
        </div>
      ) : view === 'mini' ? (
        <div className="embed-mini-list">
          {events.map((ev) => {
            const { day, month } = formatDayMonth(ev.start_date)
            return (
              <a
                key={ev.id}
                href={eventShareUrl(ev, 'https://flw.sh')}
                target="_blank"
                rel="noopener noreferrer"
                className="embed-mini-row"
              >
                <div className="embed-mini-date">
                  <span className="embed-mini-day" style={{ color: accent }}>{day}</span>
                  <span className="embed-mini-month">{month}</span>
                </div>
                <div className="embed-mini-info">
                  <span className="embed-mini-name">{ev.name}</span>
                  <span className="embed-mini-loc">📍 {ev.city}{ev.department ? ` (${ev.department})` : ''}</span>
                </div>
              </a>
            )
          })}
        </div>
      ) : (
        <div className="embed-grid">
          {events.map((ev) => {
            const d = new Date(ev.start_date)
            const tags = (ev.tags ?? []).slice(0, 3)
            const dur = durationDays(ev.start_date, ev.end_date)
            return (
              <a
                key={ev.id}
                href={eventShareUrl(ev, 'https://flw.sh')}
                target="_blank"
                rel="noopener noreferrer"
                className="embed-fcard"
              >
                <div className="embed-fdate">
                  <b>{d.getDate()}</b>
                  <span>{MOIS[d.getMonth()]}</span>
                  <i>{d.getFullYear()}</i>
                </div>
                {ev.image_url && (
                  <div className="embed-fposter">
                    <img src={ev.image_url} alt="" loading="lazy" />
                  </div>
                )}
                <div className="embed-finfo">
                  <div className="embed-fname">{ev.name}</div>
                  {tags.length > 0 && (
                    <div className="embed-ftags">
                      {tags.map(t => (
                        <span key={t} className="embed-ftag">{t.replace(/-/g, ' ')}</span>
                      ))}
                    </div>
                  )}
                  <div className="embed-floc">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                    {ev.city}{ev.department ? ` (${ev.department})` : ''}
                  </div>
                  <div className="embed-fdur">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    {dur} jour{dur !== 1 ? 's' : ''}
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {/* Footer — marque Fellowship (icône + mot + point) + slogan */}
      <div className="embed-foot">
        <a
          className="embed-foot-brand"
          href={`https://flw.sh/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="/icon.png" alt="" className="embed-foot-mark" />
          <span className="embed-foot-word">Fellowship<span className="embed-foot-dot">.</span></span>
        </a>
        <div className="embed-foot-slogan">Propulsé par Fellowship — le réseau qui fait tourner les festivals</div>
      </div>
      </div>
    </div>
  )
}
