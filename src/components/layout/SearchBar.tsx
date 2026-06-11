import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { eventPath } from '@/lib/event-link'
import { Search, X, Calendar, MapPin, User, Bell, Plus } from 'lucide-react'
import { getTagIcon } from '@/components/ui/TagBadge'
import { supabase } from '@/lib/supabase'
import { isSearchableActor } from '@/lib/search'
import { useAuth } from '@/lib/auth'
import { useNotifications } from '@/hooks/use-notifications'
import { useFollowingIds } from '@/hooks/use-following-ids'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { DebugPlanSwitch } from './DebugPlanSwitch'
import './SearchBar.css'

interface SearchEvent {
  id: string
  name: string
  city: string
  start_date: string
  tags: string[] | null
  image_url: string | null
  slug: string | null
}

interface SearchProfile {
  actor_id: string
  label: string | null
  public_slug: string | null
  kind: 'person' | 'entity'
  avatar_url: string | null
}

interface SearchBarProps {
  onCreateEvent?: () => void
}

export function SearchBar({ onCreateEvent }: SearchBarProps) {
  const { currentActor } = useAuth()
  const { personalNotifs, personalUnread, markAsRead, markAllAsRead } = useNotifications()
  const followingIds = useFollowingIds()
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState<SearchEvent[]>([])
  const [profiles, setProfiles] = useState<SearchProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [bellSnapshot, setBellSnapshot] = useState<Set<string>>(new Set())
  const [searchExpanded, setSearchExpanded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const input = ref.current?.querySelector('input')
        input?.focus()
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state synchronously when query is too short, no async race possible
      setEvents([])
      setProfiles([])
      setOpen(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setOpen(true)

      const [eventsRes, profilesRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, name, city, start_date, tags, image_url, slug')
          .ilike('name', `%${query}%`)
          .order('start_date', { ascending: false })
          .limit(5),
        supabase
          .from('actor_public')
          .select('actor_id, label, public_slug, avatar_url, kind')
          .eq('kind', 'entity') // recherche : exposants uniquement (les festivaliers n'ont pas de vitrine)
          .ilike('label', `%${query}%`)
          .limit(5),
      ])

      setEvents(eventsRes.data ?? [])
      // actor_public expose des colonnes nullable ; on ne garde que les lignes résolues ET
      // searchables (entités/exposants) — défense en profondeur en plus du filtre SQL.
      setProfiles(((profilesRes.data ?? []) as SearchProfile[]).filter(p => p.actor_id && isSearchableActor(p.kind)))
      setLoading(false)
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const hasResults = events.length > 0 || profiles.length > 0


  return (
    <div className={`search-bar-wrapper ${searchExpanded ? 'search-expanded' : ''}`} ref={ref}>
      {/* Mobile: search + add (left group) */}
      <button
        className="search-bar-toggle"
        onClick={() => setSearchExpanded(true)}
      >
        <Search strokeWidth={1.5} />
      </button>

      {currentActor && onCreateEvent && (
        <button className="search-bar-add-btn search-bar-add-mobile" onClick={onCreateEvent} title="Ajouter un événement">
          <Plus strokeWidth={2} />
        </button>
      )}

      {/* Mobile logo (centered) */}
      <div className="search-bar-spacer">
        <img className="mark" src="/icon.png" alt="" />
        <span className="search-bar-brand">Fellowship<span className="brand-dot">.</span></span>
      </div>

      {/* Search bar (always visible on desktop, expanded on mobile) */}
      <div className="search-bar">
        <Search className="search-bar-icon" strokeWidth={1.5} />
        <input
          className="search-bar-input"
          placeholder="Rechercher un événement ou un exposant..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
        />
        {query ? (
          <button className="search-bar-clear" onClick={() => { setQuery(''); setOpen(false) }}>
            <X strokeWidth={1.5} />
          </button>
        ) : searchExpanded ? (
          <button className="search-bar-clear" onClick={() => { setSearchExpanded(false); setQuery(''); setOpen(false) }}>
            <X strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      {/* Cluster d'actions — desktop : pill glass à droite ; mobile : flow normal (display:contents) */}
      <div className="search-bar-actions">
      {/* Desktop: add event button (after search bar) */}
      {currentActor && onCreateEvent && (
        <button className="search-bar-add-btn search-bar-add-desktop" onClick={onCreateEvent} title="Ajouter un événement">
          <Plus strokeWidth={2} />
          <span className="search-bar-add-label">Ajouter un événement</span>
        </button>
      )}

      {/* Debug admin : switch de plan (Réel/Pro/Gratuit) */}
      <DebugPlanSwitch />

      {/* Notification bell */}
      {currentActor && (
        <div className="notif-bell-wrapper" ref={bellRef}>
          <button
            className="notif-bell-btn"
            onClick={() => {
              setBellOpen(prev => {
                const next = !prev
                if (next) {
                  setBellSnapshot(new Set(personalNotifs.filter(n => !n.read).map(n => n.id)))
                  if (personalUnread > 0) markAllAsRead()
                }
                return next
              })
            }}
          >
            <Bell strokeWidth={1.5} />
            {personalUnread > 0 && (
              <span className="notif-bell-badge">
                {personalUnread > 9 ? '9+' : personalUnread}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title">Notifications</span>
              </div>
              {personalNotifs.length === 0 ? (
                <p className="notif-dropdown-empty">Aucune notification</p>
              ) : (
                <div className="notif-dropdown-list">
                  {personalNotifs.slice(0, 8).map(n => {
                    const data = (n.data ?? {}) as Record<string, unknown>
                    const actorId = typeof data.actor_id === 'string' ? data.actor_id : undefined
                    return (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        isFriend={!!actorId && followingIds.has(actorId)}
                        onRead={markAsRead}
                        compact
                        forceUnreadStyle={bellSnapshot.has(n.id)}
                      />
                    )
                  })}
                </div>
              )}
              <Link
                to="/notifications"
                className="notif-dropdown-see-all"
                onClick={() => setBellOpen(false)}
              >
                Voir toutes les notifications →
              </Link>
            </div>
          )}
        </div>
      )}

      </div>{/* /search-bar-actions */}

      {open && (
        <div className="search-results">
          {loading ? (
            <div className="search-loading">Recherche...</div>
          ) : !hasResults ? (
            <div className="search-empty">Aucun résultat pour « {query} »</div>
          ) : (
            <>
              {events.length > 0 && (
                <div className="search-results-section">
                  <div className="search-results-label">Événements</div>
                  {events.map(ev => (
                    <Link
                      key={ev.id}
                      to={eventPath(ev)}
                      className="search-result-item"
                      onClick={() => { setOpen(false); setQuery('') }}
                    >
                      <div className="search-result-icon event">
                        {ev.image_url ? (
                          <img src={ev.image_url} alt="" />
                        ) : (
                          <Calendar strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-name">{ev.name}</div>
                        <div className="search-result-meta">
                          <MapPin />
                          <span>{ev.city}</span>
                          <span>·</span>
                          {(() => { const I = getTagIcon((ev.tags?.[0] ?? 'autre')); return <><I size={12} strokeWidth={2} /><span>{(ev.tags?.[0] ?? 'autre')}</span></> })()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {profiles.length > 0 && (
                <div className="search-results-section">
                  <div className="search-results-label">Exposants</div>
                  {profiles.map(p => (
                    <Link
                      key={p.actor_id}
                      to={`/@${p.public_slug ?? p.actor_id}`}
                      className="search-result-item"
                      onClick={() => { setOpen(false); setQuery('') }}
                    >
                      <div className="search-result-icon profile">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" />
                        ) : (
                          <User strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="search-result-info">
                        <div className="search-result-name">{p.label ?? 'Utilisateur'}</div>
                        <div className="search-result-meta">
                          <span>Exposant</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
