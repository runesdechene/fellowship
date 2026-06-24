import { Link } from 'react-router-dom'
import type { SeasonMonth } from '@/lib/cockpit'

// Abréviation 3 lettres du mois pour la frise (grille 6 colonnes × 2 lignes = 12 mois).
const MONTH_ABBR = ['JANV', 'FÉV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC']
const MONTH_NAME = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface Props {
  season: SeasonMonth[]
}

export function SaisonFrise({ season }: Props) {
  const total = season.reduce((s, m) => s + m.count, 0)
  const emptyNames = season.filter(m => !m.filled).map(m => MONTH_NAME[m.month])
  const seasonYear = season[0]?.year ?? new Date().getFullYear()

  return (
    <div className="ck-card">
      <div className="ck-eyebrow">SAISON {seasonYear}</div>

      <div className="ck-season-head">
        <b>{total}</b>
        <span>festival{total > 1 ? 's' : ''} {total === 0 ? 'à caler' : 'à venir sur 12 mois'}</span>
      </div>

      <div className="ck-season-months">
        {season.map(m => (
          <div key={`${m.year}-${m.month}`} className={'ck-sm' + (m.filled ? ' full' : ' gap')}>
            <span className="ck-sm-mn">{MONTH_ABBR[m.month]}</span>
            <span className="ck-sm-ct">{m.count}</span>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <p className="ck-season-note">Ta saison est à construire. <Link to="/explorer">Trouve des dates →</Link></p>
      ) : emptyNames.length > 0 ? (
        <p className="ck-season-note">
          {cap(emptyNames.slice(0, 2).join(' & '))}{emptyNames.length > 2 ? ` (+${emptyNames.length - 2})` : ''} {emptyNames.length > 1 ? 'sont encore vides' : 'est encore vide'}. <Link to="/explorer">Une date à caler ?</Link>
        </p>
      ) : (
        <p className="ck-season-note">Ta saison est bien remplie 🎉</p>
      )}
    </div>
  )
}
