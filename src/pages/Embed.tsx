import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Calendar } from 'lucide-react'
import type { EntityRow } from '@/types/database'
import { eventShareUrl } from '@/lib/event-link'
import { parseEmbedParams } from '@/lib/embed-params'
import { useTags } from '@/hooks/use-tags'
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

  const { theme: themeParam, max, accent, maxWidth, preview, showHeader } = useMemo(
    () => parseEmbedParams(searchParams),
    [searchParams],
  )

  const [expanded, setExpanded] = useState(false)

  // Tags dynamiques (mêmes couleurs par tag que la Vitrine).
  const { tags } = useTags()
  const tagOf = (name: string) => tags.find(t => t.value === name || t.label === name)

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
        .select('id, events(id, name, start_date, end_date, city, department, tags, image_url, slug, is_private)')
        .eq('actor_id', (e as EntityRow).actor_id)
        .eq('visibility', 'public')
        // « Accepté » = on y va (présence acquise), payé ou pas. On exclut interesse/en_cours/refuse.
        .in('status', ['inscrit', 'confirme'])

      setParticipations((parts as EmbedEvent[] | null) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [slug])

  const events = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const list = participations
      .filter(p => p.events && !(p.events as { is_private?: boolean }).is_private && new Date(p.events.start_date) >= now)
      .map(p => p.events!)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    return max == null ? list : list.slice(0, max)
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
  }, [events.length, loading, expanded])

  if (loading) {
    return (
      <div className="embed-page" data-theme={resolvedTheme}>
        <div className="embed-page-container" style={{ maxWidth: maxWidth ? `${maxWidth}px` : '100%' }}>
          <div className="embed-escales">
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
      </div>
    )
  }

  if (notFound || !entity) {
    return (
      <div className="embed-page" data-theme={resolvedTheme}>
        <div className="embed-centered">Profil introuvable</div>
      </div>
    )
  }

  const displayName = entity.brand_name
  const subtitle = [entity.craft_type, entity.city].filter(Boolean).join(' · ')

  // Repli : on n'affiche que `preview` dates, le reste derrière « Voir plus » (preview=0 → tout).
  const collapsible = preview > 0 && events.length > preview
  const visibleEvents = collapsible && !expanded ? events.slice(0, preview) : events
  const hiddenCount = events.length - preview

  return (
    <div className="embed-page" data-theme={resolvedTheme}>
     <div className="embed-page-container" style={{ maxWidth: maxWidth ? `${maxWidth}px` : '100%' }}>
      {/* En-tête identité : avatar + nom + description, centré (masquable via ?header=0) */}
      {showHeader && (
        <div className="embed-header">
          {entity.avatar_url ? (
            <img src={entity.avatar_url} alt={displayName} className="embed-avatar" />
          ) : (
            <div className="embed-avatar-fallback" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}dd)` }}>
              {displayName[0]?.toUpperCase()}
            </div>
          )}
          <div className="embed-header-name">{displayName}</div>
          {subtitle && <div className="embed-header-sub">{subtitle}</div>}
        </div>
      )}

      {/* Événements — cartes « escales » (design exact de la Vitrine) */}
      {events.length === 0 ? (
        <div className="embed-empty">
          <Calendar className="embed-empty-icon" strokeWidth={1.5} />
          <p className="embed-empty-text">Aucun événement à venir</p>
        </div>
      ) : (
        <div className="embed-escales">
          {visibleEvents.map((ev) => {
            const d = new Date(ev.start_date)
            const dur = durationDays(ev.start_date, ev.end_date)
            const geo = [ev.city, ev.department ? `(${ev.department})` : null].filter(Boolean).join(' ')
            const evTags = (ev.tags ?? []).slice(0, 3)
            return (
              <a
                key={ev.id}
                href={eventShareUrl(ev, 'https://flw.sh')}
                target="_blank"
                rel="noopener noreferrer"
                className="embed-escale"
              >
                <div className="embed-edate">
                  <b>{d.getDate()}</b>
                  <span>{MOIS[d.getMonth()]}</span>
                  <i>{d.getFullYear()}</i>
                </div>
                <div className="embed-eposter">
                  {ev.image_url && <img src={ev.image_url} alt="" loading="lazy" />}
                </div>
                <div className="embed-einfo">
                  <div className="embed-en">{ev.name}</div>
                  {evTags.length > 0 && (
                    <div className="embed-etags">
                      {evTags.map(name => {
                        const t = tagOf(name)
                        return (
                          <span
                            key={name}
                            className="embed-etag"
                            style={t ? { background: t.bg, color: t.color } : undefined}
                          >
                            {t?.label ?? name.replace(/-/g, ' ')}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {geo && (
                    <div className="embed-eloc">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                      {geo}
                    </div>
                  )}
                  <div className="embed-edur">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    {dur} jour{dur !== 1 ? 's' : ''}
                  </div>
                </div>
                <span className="embed-echev" aria-hidden="true">›</span>
              </a>
            )
          })}
        </div>
      )}

      {collapsible && (
        <button type="button" className="embed-more" onClick={() => setExpanded(v => !v)}>
          {expanded
            ? 'Voir moins'
            : `Voir les ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''} date${hiddenCount > 1 ? 's' : ''}`}
        </button>
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
