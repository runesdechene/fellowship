/**
 * QUOI     — l'interrupteur des Réglages : une gélule qui glisse, allumée en terre.
 * POURQUOI — les notifications et le reporting allument et coupent de la même façon ; une chose
 *            qui se répète devient un seul composant (Méthode). Le dessin vit dans settings.css.
 */
interface SwitchProps {
  on: boolean
  label: string
  onToggle: () => void
  disabled?: boolean
  /** Une variante de plus, comme `push-line--locked`. */
  className?: string
}

export function Switch({ on, label, onToggle, disabled, className }: SwitchProps) {
  const classes = ['push-line']
  if (on) classes.push('push-line--on')
  if (className) classes.push(className)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={classes.join(' ')}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="push-line__switch" />
    </button>
  )
}
