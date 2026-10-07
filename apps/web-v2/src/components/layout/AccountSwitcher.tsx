import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth'

interface AccountSwitcherProps {
  /** Colonne repliée : le menu serait rogné par le rail, on le déplie d'abord. */
  collapsed: boolean
  onExpand: () => void
}

export function AccountSwitcher({ collapsed, onExpand }: AccountSwitcherProps) {
  const { actor, actors, switchActor } = useAuth()
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
    },
    [switchActor],
  )

  const hasChoice = actors.length > 1

  return (
    <div className="account-switcher" ref={root}>
      <button
        type="button"
        className="account-switcher__trigger"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup={hasChoice ? 'menu' : undefined}
      >
        <Avatar
          className="account-switcher__avatar"
          src={actor?.avatarUrl}
          name={actor?.label}
        />
        <span className="account-switcher__identity">
          <span className="account-switcher__name">{actor?.label ?? '—'}</span>
          <span className="account-switcher__role">{actor?.roleLabel ?? ''}</span>
        </span>
        {hasChoice && (
          <ChevronDown
            className={
              open
                ? 'account-switcher__chevron account-switcher__chevron--open'
                : 'account-switcher__chevron'
            }
            size={19}
            strokeWidth={1.75}
          />
        )}
      </button>

      {open && hasChoice && (
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
              {candidate.id === actor?.id && (
                <Check className="account-switcher__check" size={16} strokeWidth={2.25} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
