import { useState } from 'react'
import { Link } from 'react-router-dom'
import { firstSeasonYear, type SeasonEvent } from '@/lib/vitrine'

const MAX = 8

interface Props { events: SeasonEvent[] }

export function VitrineTampons({ events }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (events.length === 0) return null
  const since = firstSeasonYear(events)
  const shown = expanded ? events : events.slice(0, MAX)
  const rest = events.length - shown.length

  return (
    <section className="v-sec">
      <div className="v-sec-h">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" strokeDasharray="3 2" /><path d="M9 12l2 2 4-4" /></svg>
        {since ? `Sur la route depuis ${since}` : 'Déjà passés'}
        <span className="v-sec-c">{events.length} escale{events.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="v-tampons">
        {shown.map(e => {
          const yr = `'${String(new Date(e.start_date).getFullYear()).slice(2)}`
          const geo = e.city ?? ''
          return (
            <Link key={e.id} to={`/evenement/${e.id}`} state={{ from: '/' }} className="v-stamp">
              <div className="v-stamp-pm"><div className="v-stamp-ring">
                {e.image_url && <div className="v-stamp-img" style={{ backgroundImage: `url(${e.image_url})` }} />}
                <span className="v-stamp-yr">{yr}</span>
              </div></div>
              <div className="v-stamp-cap">{e.name}<span>{geo}</span></div>
            </Link>
          )
        })}
        {rest > 0 && <button type="button" className="v-stamp-more" onClick={() => setExpanded(true)}>+{rest}</button>}
      </div>
    </section>
  )
}
