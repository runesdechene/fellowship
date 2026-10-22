/**
 * QUOI     — « Vus récemment » : les dernières personnes passées, par leur enseigne d'abord, quand,
 *            et combien de visites en tout ; chaque ligne ouvre la fiche de l'enseigne (ou de la
 *            personne, sans enseigne).
 * POURQUOI — on voit d'un coup d'œil quelles enseignes reviennent, et souvent : c'est l'enseigne
 *            qui intéresse, plus que le compte (Uriel, 22/10/2026).
 */
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { counted } from '@/lib/admin-home'
import { timeAgo } from '@/lib/dates'
import { entityTypeOf } from '@/lib/entity-type'
import { HomeCard } from './HomeCard'
import type { Visitor } from './useAdminHome'

export function RecentVisitors({ visitors, now }: { visitors: Visitor[]; now: Date }) {
  return (
    <HomeCard title="Vus récemment" hint="et leurs visites" className="home-visitors">
      {visitors.length === 0 ? (
        <p className="home-visitors__empty">Personne n’est encore passé depuis le comptage.</p>
      ) : (
        <ul className="home-visitors__list">
          {visitors.map((visitor) => {
            const person = visitor.display_name || 'Sans prénom'
            const when = visitor.last_seen_at ? timeAgo(new Date(visitor.last_seen_at), now) : ''
            return (
              <li key={visitor.actor_id}>
                <Link
                  to={
                    visitor.entity_id
                      ? `/admin/enseignes/${visitor.entity_id}`
                      : `/admin/personnes/${visitor.actor_id}`
                  }
                  className="home-visitors__row"
                >
                  {visitor.entity_id ? (
                    <Avatar
                      src={visitor.entity_avatar_url}
                      name={visitor.brand_name}
                      className={`admin-table__logo admin-table__logo--${entityTypeOf(visitor.entity_type).tone}`}
                    />
                  ) : (
                    <Avatar src={visitor.avatar_url} name={visitor.display_name} />
                  )}
                  <span className="home-visitors__who">
                    <span className="home-visitors__name">
                      {visitor.entity_id ? visitor.brand_name : person}
                    </span>
                    <span className="home-visitors__when">
                      {visitor.entity_id ? `${person}, ${when}` : `sans enseigne, ${when}`}
                    </span>
                  </span>
                  <span className="home-visitors__visits">
                    {counted(visitor.visits, 'visite', 'visites')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <Link to="/admin/comptes?vue=personnes" className="home-visitors__all">
        Tous les comptes
      </Link>
    </HomeCard>
  )
}
