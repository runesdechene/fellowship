/**
 * QUOI     — la coquille de l'administration : la barre beige de l'app avec sa propre navigation,
 *            et le panneau blanc pleine largeur (maquettes « Admin — … », 2338:2).
 * POURQUOI — l'administration est un outil de travail : des tableaux larges, ni barre du haut ni
 *            mur d'affiche. Elle reprend les classes de la barre latérale pour en garder l'allure.
 * ATTENTION — seules les sections codées sont listées : Prospects arrive au lot 3, Signalements,
 *            Événements, Catégories et Témoignages au lot 4. « Comptes » reste allumé sur les
 *            fiches (enseigne, personne), qui en descendent.
 */
import { ArrowLeft, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

const SECTIONS = [
  {
    to: '/admin/comptes',
    label: 'Comptes',
    Icon: Users,
    prefixes: ['/admin/comptes', '/admin/enseignes', '/admin/personnes'],
  },
] as const

export function AdminShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  return (
    <div className="app-shell admin-shell">
      <aside className="sidebar admin-shell__nav">
        <img
          className="sidebar__logo"
          src={`${import.meta.env.BASE_URL}icon.png`}
          alt="Fellowship"
        />
        <div className="admin-shell__badge">
          <span className="admin-shell__badge-title">Administration</span>
          <span className="admin-shell__badge-note">Réservé aux admins</span>
        </div>
        <nav className="sidebar__nav">
          {SECTIONS.map(({ to, label, Icon, prefixes }) => {
            const active = prefixes.some((prefix) => pathname.startsWith(prefix))
            return (
              <Link
                key={to}
                to={to}
                className={active ? 'sidebar__item sidebar__item--active' : 'sidebar__item'}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="sidebar__item-icon" size={24} strokeWidth={1.75} />
                <span className="sidebar__item-label">{label}</span>
              </Link>
            )
          })}
        </nav>
        <Link className="admin-shell__back" to="/">
          <ArrowLeft size={16} strokeWidth={1.75} />
          Revenir à l’application
        </Link>
      </aside>
      <main className="app-shell__main">
        <div className="admin-shell__content">{children}</div>
      </main>
    </div>
  )
}
