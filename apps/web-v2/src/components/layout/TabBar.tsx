/**
 * QUOI     — la barre d'onglets du téléphone : Tableau, Explorer, Calendrier, Communauté, et
 *            « Moi » à droite, qui ouvre le menu du compte en feuille.
 * POURQUOI — sur un écran étroit la barre latérale disparaît ; la navigation passe au pouce, en bas
 *            (maquette 2027 mobile). L'onglet actif porte le dégradé du logo.
 *            Le menu se clôt sur « Revenir à la V1 » (Uriel, 14/10/2026).
 * ATTENTION — invisible sur ordinateur (tab-bar.css).
 */
import {
  ArrowLeftRight,
  CalendarDays,
  Check,
  CircleGauge,
  Plus,
  Settings,
  Telescope,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeSwitch } from '@/components/ui/ThemeSwitch'
import { useAuth } from '@/lib/auth'

const TABS: ReadonlyArray<{ to: string; label: string; Icon: typeof Telescope }> = [
  { to: '/', label: 'Tableau', Icon: CircleGauge },
  { to: '/explorer', label: 'Explorer', Icon: Telescope },
  { to: '/calendrier', label: 'Calendrier', Icon: CalendarDays },
  { to: '/communaute', label: 'Communauté', Icon: Users },
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
          <NavLink
            to="/bienvenue?nouvelle-enseigne"
            role="menuitem"
            className="tab-sheet__item tab-sheet__link"
            onClick={() => {
              setOpen(false)
            }}
          >
            <Plus size={18} strokeWidth={1.8} />
            <span>Créer un compte exposant</span>
          </NavLink>
          <NavLink
            to="/reglages"
            role="menuitem"
            className="tab-sheet__item tab-sheet__link"
            onClick={() => {
              setOpen(false)
            }}
          >
            <Settings size={18} strokeWidth={1.8} />
            <span>Réglages</span>
          </NavLink>
          <a href="/explorer" role="menuitem" className="tab-sheet__item tab-sheet__link">
            <ArrowLeftRight size={18} strokeWidth={1.8} />
            <span>Revenir à la V1</span>
          </a>
          <div className="tab-sheet__theme">
            <ThemeSwitch />
          </div>
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
          return (
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
