import { Link } from 'react-router-dom'
import { friseBars, busiestMonthLabel } from '@/lib/cockpit-v2'
import type { SeasonMonth } from '@/lib/cockpit'

interface Props {
  season: SeasonMonth[]
}

export function SaisonFriseV2({ season }: Props) {
  const bars = friseBars(season)
  const busiest = busiestMonthLabel(season)
  const total = season.reduce((s, m) => s + m.count, 0)
  const months = season.length // fenêtre glissante, 12 mois par construction (cf. aggregateSeason)

  return (
    <div className="ck2-block ck2-frise">
      <div className="ck2-block-head">
        <span className="app2-label">Ta saison</span>
        <span className="app2-faint">{total} date{total > 1 ? 's' : ''} sur {months} mois</span>
      </div>
      <div className="ck2-frise-track">
        {bars.map(b => (
          <i
            key={`${b.year}-${b.month}`}
            className={`ck2-bar ck2-lv${b.level}${b.isNow ? ' ck2-now' : ''}`}
            title={`${b.count} date${b.count > 1 ? 's' : ''}`}
          />
        ))}
      </div>
      <div className="ck2-frise-months">
        {bars.map(b => <span key={`${b.year}-${b.month}-l`}>{b.initial}</span>)}
      </div>
      {busiest
        ? <p className="app2-faint">{busiest}</p>
        : <p className="app2-faint">Ta saison est à construire. <Link to="/explorer">Trouve des dates →</Link></p>}
    </div>
  )
}
