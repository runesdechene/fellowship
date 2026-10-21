/**
 * QUOI     — la carte de compte en haut de la barre latérale, et le menu pour changer d'enseigne.
 * POURQUOI — un exposant peut agir sous plusieurs enseignes (modèle acteur) : le choix vit dans
 *            useAuth().switchActor, ce composant ne fait que l'afficher. Un admin y trouve une identité
 *            de plus, « Administration » : la choisir ouvre l'administration, choisir une enseigne
 *            en sort (Uriel, 16/10/2026). En bas, « Ajouter un compte exposant » ouvre l'arrivée
 *            d'une nouvelle enseigne : le menu s'ouvre donc pour tous (Uriel, 21/10/2026).
 * ATTENTION — barre repliée : le clic rouvre la colonne au lieu d'ouvrir un menu que le rail
 *            rognerait.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { ADMIN_HOME, isAdminPath } from '@/lib/admin-mode'
import { useAuth } from '@/lib/auth'

const ADMIN_LABEL = 'Administration'
const ADMIN_NOTE = 'Réservé aux admins'

interface AccountSwitcherProps {
  /** Colonne repliée : le menu serait rogné par le rail, on le déplie d'abord. */
  collapsed: boolean
  onExpand: () => void
}

export function AccountSwitcher({ collapsed, onExpand }: AccountSwitcherProps) {
  const { actor, actors, person, switchActor } = useAuth()
  const navigate = useNavigate()
  const inAdmin = isAdminPath(useLocation().pathname)
  const isAdmin = person?.role === 'admin'
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Un menu ouvert doit se fermer quand on clique ailleurs ou qu'on appuie sur
  // Échap — sinon il reste suspendu au-dessus du contenu.
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Le repli masque tout sauf l'avatar : on rouvre la colonne plutôt que
  // d'afficher un menu que le rail rognerait.
  const toggle = useCallback(() => {
    if (collapsed) {
      onExpand()
      return
    }
    setOpen((previous) => !previous)
  }, [collapsed, onExpand])

  const choose = useCallback(
    (id: string) => {
      switchActor(id)
      setOpen(false)
      if (inAdmin) void navigate('/')
    },
    [switchActor, inAdmin, navigate],
  )

  const chooseAdmin = useCallback(() => {
    setOpen(false)
    void navigate(ADMIN_HOME)
  }, [navigate])

  const shown = inAdmin ? { avatarUrl: null, label: ADMIN_LABEL, roleLabel: ADMIN_NOTE } : actor

  return (
    <div className="account-switcher" ref={root}>
      <button
        type="button"
        className="account-switcher__trigger"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar className="account-switcher__avatar" src={shown?.avatarUrl} name={shown?.label} />
        <span className="account-switcher__identity">
          <span className="account-switcher__name">{shown?.label ?? '—'}</span>
          <span className="account-switcher__role">{shown?.roleLabel ?? ''}</span>
        </span>
        <ChevronDown
          className={
            open
              ? 'account-switcher__chevron account-switcher__chevron--open'
              : 'account-switcher__chevron'
          }
          size={19}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div className="account-switcher__menu" role="menu">
          {actors.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="menuitem"
              className="account-switcher__option"
              onClick={() => choose(candidate.id)}
            >
              <Avatar
                className="account-switcher__avatar"
                src={candidate.avatarUrl}
                name={candidate.label}
              />
              <span className="account-switcher__identity">
                <span className="account-switcher__name">{candidate.label}</span>
                <span className="account-switcher__role">{candidate.roleLabel}</span>
              </span>
              {!inAdmin && candidate.id === actor?.id && (
                <Check className="account-switcher__check" size={16} strokeWidth={2.25} />
              )}
            </button>
          ))}
          {isAdmin && (
            <button
              type="button"
              role="menuitem"
              className="account-switcher__option"
              onClick={chooseAdmin}
            >
              <Avatar className="account-switcher__avatar" name={ADMIN_LABEL} />
              <span className="account-switcher__identity">
                <span className="account-switcher__name">{ADMIN_LABEL}</span>
                <span className="account-switcher__role">{ADMIN_NOTE}</span>
              </span>
              {inAdmin && (
                <Check className="account-switcher__check" size={16} strokeWidth={2.25} />
              )}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="account-switcher__option account-switcher__add"
            onClick={() => {
              setOpen(false)
              void navigate('/bienvenue?nouvelle-enseigne')
            }}
          >
            <span className="account-switcher__add-icon">
              <Plus size={16} strokeWidth={2} />
            </span>
            <span className="account-switcher__name">Ajouter un compte exposant</span>
          </button>
        </div>
      )}
    </div>
  )
}
