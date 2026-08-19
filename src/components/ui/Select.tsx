import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * UN SÉLECTEUR MAISON.
 *
 * Le `<select>` du navigateur ne sait afficher que du texte : ni icône, ni
 * couleur dans son menu. Or ici c'est justement le dessin qui porte l'état —
 * une étoile pour « intéressé », un sablier pour « à payer ». Les cacher au
 * moment du choix, c'est-à-dire au seul moment où on en a besoin, n'avait
 * pas de sens.
 *
 * Ce qu'on réécrit, on le réécrit ENTIER : le clavier (flèches, Début, Fin,
 * Entrée, Échap), le clic dehors, et les rôles ARIA. Un menu maison sans ça
 * est une régression, pas une amélioration.
 */

export type SelectTone = 'muet' | 'todo' | 'ok'

export type SelectOption<T> = {
  value: T
  label: string
  Icon?: LucideIcon
  /** Ce que l'état raconte : rien, un geste à faire, ou c'est acquis. */
  tone?: SelectTone
}

export function Select<T>({
  label,
  value,
  options,
  disabled = false,
  filled = false,
  onChange,
  className,
}: {
  /** Ce que le contrôle demande — lu par les lecteurs d'écran. */
  label: string
  value: T
  options: SelectOption<T>[]
  disabled?: boolean
  /**
   * La valeur porte la teinte de son état EN APLAT, pas seulement sur son
   * icône. À réserver au contrôle qui résume l'écran : deux aplats côte à
   * côte se disputent le regard, et plus rien ne ressort.
   */
  filled?: boolean
  onChange: (value: T) => void
  /** Le modificateur de l'écran qui l'accueille, pour sa largeur. */
  className?: string
}) {
  const [ouvert, setOuvert] = useState(false)
  const [survol, setSurvol] = useState(0)
  const racine = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const id = useId()

  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const courant = options[index] ?? options[0]

  // Un clic ailleurs referme. `mousedown` et non `click` : sinon le clic qui
  // ferme déclencherait aussi ce qu'il y a dessous.
  useEffect(() => {
    if (!ouvert) return
    function dehors(evenement: MouseEvent) {
      if (!racine.current?.contains(evenement.target as Node)) setOuvert(false)
    }
    document.addEventListener('mousedown', dehors)
    return () => document.removeEventListener('mousedown', dehors)
  }, [ouvert])

  function ouvrir() {
    setSurvol(index)
    setOuvert(true)
  }

  function choisir(option: SelectOption<T>) {
    onChange(option.value)
    setOuvert(false)
    bouton.current?.focus()
  }

  /**
   * Le focus ne quitte JAMAIS le bouton : c'est lui qui écoute le clavier et
   * qui désigne l'option courante par `aria-activedescendant`. Déplacer le
   * focus dans la liste obligerait à le rendre proprement à la fermeture,
   * dans tous les chemins de sortie — c'est là que ces menus se cassent.
   */
  function auClavier(evenement: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    const touche = evenement.key

    if (!ouvert) {
      if (touche === 'ArrowDown' || touche === 'ArrowUp' || touche === 'Enter' || touche === ' ') {
        evenement.preventDefault()
        ouvrir()
      }
      return
    }

    if (touche === 'Escape' || touche === 'Tab') {
      setOuvert(false)
      return
    }
    if (touche === 'ArrowDown') {
      evenement.preventDefault()
      setSurvol((position) => Math.min(position + 1, options.length - 1))
      return
    }
    if (touche === 'ArrowUp') {
      evenement.preventDefault()
      setSurvol((position) => Math.max(position - 1, 0))
      return
    }
    if (touche === 'Home') {
      evenement.preventDefault()
      setSurvol(0)
      return
    }
    if (touche === 'End') {
      evenement.preventDefault()
      setSurvol(options.length - 1)
      return
    }
    if (touche === 'Enter' || touche === ' ') {
      evenement.preventDefault()
      const choisi = options[survol]
      if (choisi) choisir(choisi)
    }
  }

  const ton = (option: SelectOption<T> | undefined) => option?.tone ?? 'muet'

  return (
    <div
      ref={racine}
      className={className ? `select ${className}` : 'select'}
      data-ouvert={ouvert ? 'oui' : 'non'}
    >
      <button
        ref={bouton}
        type="button"
        className={
          filled
            ? `select__valeur select__valeur--plein select__valeur--${ton(courant)}`
            : `select__valeur select__valeur--${ton(courant)}`
        }
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-controls={`${id}-liste`}
        aria-activedescendant={ouvert ? `${id}-${survol}` : undefined}
        disabled={disabled}
        onClick={() => (ouvert ? setOuvert(false) : ouvrir())}
        onKeyDown={auClavier}
      >
        {courant?.Icon && (
          <courant.Icon className="select__icone" size={16} strokeWidth={2} />
        )}
        <span className="select__mot">{courant?.label}</span>
        <ChevronDown className="select__chevron" size={14} strokeWidth={2} />
      </button>

      {ouvert && (
        <ul className="select__menu" id={`${id}-liste`} role="listbox" aria-label={label}>
          {options.map((option, position) => (
            <li key={position}>
              <button
                type="button"
                id={`${id}-${position}`}
                className={`select__option select__option--${ton(option)}`}
                role="option"
                aria-selected={position === index}
                data-survol={position === survol ? 'oui' : 'non'}
                // `mousedown` plutôt que `click` : le bouton perd le focus au
                // premier, et on veut choisir avant que le clic dehors ferme.
                onMouseDown={(evenement) => {
                  evenement.preventDefault()
                  choisir(option)
                }}
                onMouseEnter={() => setSurvol(position)}
                tabIndex={-1}
              >
                {option.Icon && (
                  <option.Icon className="select__icone" size={16} strokeWidth={2} />
                )}
                <span className="select__mot">{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
