/**
 * QUOI     — la barre d'onglets du téléphone : Explorer, Calendrier, Communauté, Tableau, et
 *            « Moi » à droite, qui ouvre le menu du compte en feuille.
 * POURQUOI — sur un écran étroit la barre latérale disparaît ; la navigation passe au pouce, en bas
 *            (maquette 2027 mobile). L'onglet actif porte le dégradé du logo.
 * ATTENTION — invisible sur ordinateur (tab-bar.css). Communauté reste inerte tant que son écran
 *            n'existe pas, comme dans la barre latérale.
 */
import { CalendarDays, Check, CircleGauge, Telescope, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'

const TABS: ReadonlyArray<{ to: string | null; label: string; Icon: typeof Telescope }> = [
  { to: '/explorer', label: 'Explorer', Icon: Telescope },
  { to: '/calendrier', label: 'Calendrier', Icon: CalendarDays },
  { to: null, label: 'Communauté', Icon: Users },
  { to: '/', label: 'Tableau', Icon: CircleGauge },
]

export function TabBar() {
  const { actor, actors, switchActor } = useAuth()
  const [open, setOpen] = useState(false)
  const sheet = useRef<HTMLDivElement>(null)

  // La feuille se ferme d'un geste ailleurs ou sur Échap, comme le menu de la barre latérale.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!sheet.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={sheet}>
      {open && (
        <div className="tab-sheet" role="menu" aria-label="Mes comptes">
          {actors.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="tab-sheet__item"
              onClick={() => {
                switchActor(item.id)
                setOpen(false)
              }}
            >
              <Avatar className="tab-sheet__avatar" src={item.avatarUrl} name={item.label} />
              <span className="tab-sheet__identity">
                <b>{item.label}</b>
                <span>{item.roleLabel}</span>
              </span>
              {item.id === actor?.id && <Check size={16} strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
      <nav className="tab-bar" aria-label="Navigation">
        {TABS.map(({ to, label, Icon }) => {
          const content = (
            <>
              <Icon size={22} strokeWidth={1.75} />
              <span>{label}</span>
            </>
          )
          return to === null ? (
            <span key={label} className="tab-bar__item tab-bar__item--inert">
              {content}
            </span>
          ) : (
            <NavLink
              key={label}
              to={to}
              end
              className={({ isActive }) =>
                isActive ? 'tab-bar__item tab-bar__item--active' : 'tab-bar__item'
              }
            >
              {content}
            </NavLink>
          )
        })}
        <button
          type="button"
          className="tab-bar__item"
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value)
          }}
        >
          <Avatar className="tab-bar__avatar" src={actor?.avatarUrl} name={actor?.label} />
          <span>Moi</span>
        </button>
      </nav>
    </div>
  )
}
