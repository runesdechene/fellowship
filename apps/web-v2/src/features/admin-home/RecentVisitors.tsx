/**
 * QUOI     — « Vus récemment » : les dernières personnes passées, quand, et combien de visites
 *            en tout ; chacune ouvre sa fiche.
 * POURQUOI — on voit d'un coup d'œil qui revient, et qui revient souvent (Uriel, 22/10/2026).
 */
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { counted } from '@/lib/admin-home'
import { timeAgo } from '@/lib/dates'
import { HomeCard } from './HomeCard'
import type { Visitor } from './useAdminHome'

export function RecentVisitors({ visitors, now }: { visitors: Visitor[]; now: Date }) {
  return (
    <HomeCard title="Vus récemment" hint="et leurs visites" className="home-visitors">
      {visitors.length === 0 ? (
        <p className="home-visitors__empty">Personne n’est encore passé depuis le comptage.</p>
      ) : (
        <ul className="home-visitors__list">
          {visitors.map((visitor) => (
            <li key={visitor.actor_id}>
              <Link to={`/admin/personnes/${visitor.actor_id}`} className="home-visitors__row">
                <Avatar src={visitor.avatar_url} name={visitor.display_name} />
                <span className="home-visitors__who">
                  <span className="home-visitors__name">
                    {visitor.display_name || 'Sans prénom'}
                  </span>
                  <span className="home-visitors__when">
                    {visitor.last_seen_at && timeAgo(new Date(visitor.last_seen_at), now)}
                  </span>
                </span>
                <span className="home-visitors__visits">
                  {counted(visitor.visits, 'visite', 'visites')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/admin/comptes?vue=personnes" className="home-visitors__all">
        Tous les comptes
      </Link>
    </HomeCard>
  )
}
