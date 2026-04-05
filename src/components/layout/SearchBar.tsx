import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, Calendar, MapPin, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import './SearchBar.css'

interface SearchEvent {
  id: string
  name: string
  city: string
  start_date: string
  primary_tag: string
  image_url: string | null
}

interface SearchProfile {
  id: string
  brand_name: string | null
  display_name: string | null
  city: string | null
  public_slug: string | null
  avatar_url: string | null
}

export function SearchBar() {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState<SearchEvent[]>([])
  const [profiles, setProfiles] = useState<SearchProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
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
          .select('id, name, city, start_date, primary_tag, image_url')
          .ilike('name', `%${query}%`)
          .order('start_date', { ascending: false })
          .limit(5),
        supabase
          .from('profiles')
          .select('id, brand_name, display_name, city, public_slug, avatar_url')
          .eq('type', 'exposant')
          .or(`brand_name.ilike.%${query}%,display_name.ilike.%${query}%`)
          .limit(5),
      ])

      setEvents(eventsRes.data ?? [])
      setProfiles(profilesRes.data ?? [])
      setLoading(false)
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const hasResults = events.length > 0 || profiles.length > 0

  const displayName = profile?.brand_name ?? profile?.display_name ?? ''

  return (
    <div className="search-bar-wrapper" ref={ref}>
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
        ) : (
          <span className="search-bar-shortcut">⌘K</span>
        )}
      </div>

      {/* Profile avatar */}
      {profile && (
        <Link to="/profil" className="search-bar-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} />
          ) : (
            <span>{displayName[0]?.toUpperCase() ?? '?'}</span>
          )}
        </Link>
      )}

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
                      to={`/evenement/${ev.id}`}
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
                          <span>{ev.primary_tag}</span>
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
                      key={p.id}
                      to={`/@${p.public_slug ?? p.id}`}
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
                        <div className="search-result-name">{p.brand_name ?? p.display_name ?? 'Exposant'}</div>
                        {p.city && (
                          <div className="search-result-meta">
                            <MapPin />
                            <span>{p.city}</span>
                          </div>
                        )}
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
