/**
 * QUOI     — la ligne « Fellowship 3.2.0 » en bas de la barre latérale : elle ouvre les Nouveautés,
 *            et porte la pastille tant qu'une mise à jour n'est pas lue.
 * POURQUOI — maquette 2371:403 : l'entrée des Nouveautés est la signature de l'app, pas une entrée
 *            de plus dans la navigation (Uriel, 19/10/2026). Le numéro est celui de la version servie.
 * ATTENTION — elle prend l'allure d'une entrée de la barre (sidebar__item) : repliée, la cloche seule.
 */
import { Bell } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export function VersionLine({ unread }: { unread: boolean }) {
  return (
    <NavLink
      to="/nouveautes"
      className={({ isActive }) =>
        [
          'sidebar__item version-line',
          isActive && 'sidebar__item--active',
          unread && 'version-line--unread',
        ]
          .filter(Boolean)
          .join(' ')
      }
    >
      <span className="version-line__bell">
        <Bell size={16} strokeWidth={2} />
        {unread && <span className="version-line__dot" aria-label="Une nouveauté à lire" />}
      </span>
      <span className="sidebar__item-label">Fellowship {__APP_VERSION__}</span>
    </NavLink>
  )
}
