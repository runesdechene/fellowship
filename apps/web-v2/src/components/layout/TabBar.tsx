/**
 * QUOI     — la barre d'onglets du téléphone : Tableau, Explorer, Calendrier, Communauté, et
 *            « Moi » à droite, qui ouvre le menu du compte en feuille : elle monte du bas, sur un
 *            voile, et se ferme d'un geste vers le bas (comme la V1, Uriel, 19/10/2026).
 * POURQUOI — sur un écran étroit la barre latérale disparaît ; la navigation passe au pouce, en bas
 *            (maquette 2027 mobile). L'onglet actif porte le dégradé du logo.
 *            Un point rouge sur Communauté : des demandes d'ami attendent (Uriel, 19/10/2026).
 * ATTENTION — invisible sur ordinateur (tab-bar.css).
 */
import {
  CalendarDays,
  Check,
  CircleGauge,
  Plus,
  Settings,
  Shield,
  Store,
  Telescope,
  Users,
} from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { NavLink } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeSwitch } from '@/components/ui/ThemeSwitch'
import { ADMIN_HOME } from '@/lib/admin-mode'
import { useAuth } from '@/lib/auth'
import { requestsLabel } from '@/lib/network'

const TABS: ReadonlyArray<{ to: string; label: string; Icon: typeof Telescope }> = [
  { to: '/', label: 'Tableau', Icon: CircleGauge },
  { to: '/explorer', label: 'Explorer', Icon: Telescope },
  { to: '/calendrier', label: 'Calendrier', Icon: CalendarDays },
  { to: '/communaute', label: 'Communauté', Icon: Users },
]

// Au-delà de cette descente, la feuille lâchée se ferme ; en deçà, elle remonte.
const SWIPE_TO_CLOSE = 80

export function TabBar({ friendRequests }: { friendRequests: number }) {
  const { actor, actors, entities, person, switchActor } = useAuth()
  // Les mêmes accès que la barre latérale : sa vitrine, et l'administration pour un admin.
  const vitrine = entities.find((entity) => entity.actor_id === actor?.id)?.public_slug
  const [open, setOpen] = useState(false)
  const sheet = useRef<HTMLDialogElement>(null)
  // Le doigt qui tire la feuille vers le bas : d'où il est parti, et de combien il l'a descendue.
  const pullStart = useRef<number | null>(null)
  const [pull, setPull] = useState(0)

  useEffect(() => {
    if (open) sheet.current?.showModal()
    else sheet.current?.close()
  }, [open])

  function close() {
    setOpen(false)
  }

  function release(event: PointerEvent) {
    // La descente se lit sur le lâcher lui-même : `pull` peut retarder d'un rendu.
    const descent = pullStart.current === null ? 0 : event.clientY - pullStart.current
    // Fermée sur-le-champ : remise en place d'abord, elle repasserait sous le doigt.
    if (descent > SWIPE_TO_CLOSE) sheet.current?.close()
    pullStart.current = null
    setPull(0)
  }

  return (
    <>
      {/* <dialog> fait le voile, Échap et le piège du focus ; un toucher sur le voile ferme.
          Le contenu vit dans un bloc à part : le clic qui suit un glisser part vers l'ancêtre
          commun, et ne doit pas tomber sur le <dialog> comme un toucher sur le voile. */}
      <dialog
        ref={sheet}
        className="tab-sheet"
        aria-label="Mes comptes"
        onClose={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
      >
        <div
          className={pull > 0 ? 'tab-sheet__body tab-sheet__body--pulled' : 'tab-sheet__body'}
          style={{ '--sheet-pull': `${pull}px` } as CSSProperties}
          onPointerDown={(event) => {
            pullStart.current = event.clientY
          }}
          onPointerMove={(event) => {
            if (pullStart.current !== null) setPull(Math.max(0, event.clientY - pullStart.current))
          }}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <span className="tab-sheet__grab" aria-hidden="true" />
          {actors.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tab-sheet__item"
              onClick={() => {
                switchActor(item.id)
                close()
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
          {vitrine && (
            <NavLink to={`/${vitrine}`} className="tab-sheet__item tab-sheet__link" onClick={close}>
              <Store size={18} strokeWidth={1.8} />
              <span>Ma vitrine</span>
            </NavLink>
          )}
          <NavLink
            to="/bienvenue?nouvelle-enseigne"
            className="tab-sheet__item tab-sheet__link"
            onClick={close}
          >
            <Plus size={18} strokeWidth={1.8} />
            <span>Créer un compte exposant</span>
          </NavLink>
          <NavLink to="/reglages" className="tab-sheet__item tab-sheet__link" onClick={close}>
            <Settings size={18} strokeWidth={1.8} />
            <span>Réglages</span>
          </NavLink>
          {person?.role === 'admin' && (
            <NavLink to={ADMIN_HOME} className="tab-sheet__item tab-sheet__link" onClick={close}>
              <Shield size={18} strokeWidth={1.8} />
              <span>Administration</span>
            </NavLink>
          )}
          <div className="tab-sheet__theme">
            <ThemeSwitch />
          </div>
        </div>
      </dialog>
      <nav className="tab-bar" aria-label="Navigation">
        {TABS.map(({ to, label, Icon }) => {
          const content = (
            <>
              <Icon size={22} strokeWidth={1.75} />
              <span>{label}</span>
              {to === '/communaute' && friendRequests > 0 && (
                <span className="tab-bar__dot" aria-label={requestsLabel(friendRequests)} />
              )}
            </>
          )
          return (
            <NavLink
              key={label}
              to={to}
              end={to === '/'}
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
            setOpen(true)
          }}
        >
          <Avatar className="tab-bar__avatar" src={actor?.avatarUrl} name={actor?.label} />
          <span>Moi</span>
        </button>
      </nav>
    </>
  )
}
