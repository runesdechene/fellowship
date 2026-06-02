import { Link } from 'react-router-dom'
import { CalendarRange } from 'lucide-react'
import type { SeasonMonth } from '@/lib/cockpit'

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

interface Props {
  season: SeasonMonth[]
  year: number
}

export function SaisonFrise({ season, year }: Props) {
  const emptyMonths = season.filter(m => !m.filled).map(m => MONTHS_SHORT[m.month])
  const total = season.reduce((s, m) => s + m.count, 0)

  return (
    <div className="ck-card ck-saison">
      <h3>
        <span className="ck-ic grn"><CalendarRange strokeWidth={1.8} /></span>
        Ta saison {year}
      </h3>

      <div className="ck-frise">
        {season.map(m => (
          <div key={m.month} className={'ck-month' + (m.filled ? ' filled' : ' empty')}>
            <span className="ck-month-bar" aria-hidden="true" />
            <span className="ck-month-lbl">{MONTHS_SHORT[m.month]}</span>
            {m.count > 0 && <span className="ck-month-count">{m.count}</span>}
          </div>
        ))}
      </div>

      {total === 0 ? (
        <p className="ck-saison-hint">Ta saison est à construire. <Link to="/explorer">Trouve des dates →</Link></p>
      ) : emptyMonths.length > 0 ? (
        <p className="ck-saison-hint">
          {emptyMonths.slice(0, 3).join(', ')}{emptyMonths.length > 3 ? '…' : ''} vide{emptyMonths.length > 1 ? 's' : ''} → <Link to="/explorer">trouve des dates</Link>
        </p>
      ) : (
        <p className="ck-saison-hint">Ta saison est bien remplie 🎉</p>
      )}
    </div>
  )
}
