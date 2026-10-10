/**
 * QUOI     — le contrôle segmenté : une rangée d'options dans une gouttière sable, l'option choisie
 *            posée dessus.
 * POURQUOI — le statut et le paiement d'une date se lisent d'un coup : toutes les options sont
 *            visibles, celle qui vaut est en relief (maquette 2027, fiche événement).
 * ATTENTION — `validated` peint l'option choisie du vert de validation : réservé à ce qui est
 *            validé (« Inscrit », Uriel, 11/10/2026). Recliquer l'option choisie la retire si `onClear` est fourni.
 */
import type { LucideIcon } from 'lucide-react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Absente pour un choix qui se lit seul (une année). */
  Icon?: LucideIcon
  /** Cette option, une fois choisie, porte le dégradé du logo. */
  validated?: boolean
  /** Choisie, l'option prend le bleu d'un dossier envoyé. */
  sent?: boolean
}

interface SegmentedProps<T extends string> {
  label: string
  options: SegmentedOption<T>[]
  value: T | null
  onChange: (next: T) => void
  /** Recliquer l'option choisie la retire. */
  onClear?: () => void
  disabled?: boolean
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  onClear,
  disabled,
}: SegmentedProps<T>) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(({ value: option, label: text, Icon, validated, sent }) => {
        const selected = option === value
        const classes = ['segmented__option']
        if (selected) {
          const tone = validated ? 'validated' : sent ? 'sent' : 'on'
          classes.push(`segmented__option--${tone}`)
        }
        return (
          <button
            key={option}
            type="button"
            className={classes.join(' ')}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => {
              if (selected) onClear?.()
              else onChange(option)
            }}
          >
            {Icon && <Icon size={14} strokeWidth={2} />}
            {text}
          </button>
        )
      })}
    </div>
  )
}
