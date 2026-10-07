import { Star } from 'lucide-react'

interface CertifiedBadgeProps {
  size?: 'sm' | 'md'
  /** Icône seule (sans le mot « Certifié ») — utile dans les listes denses. Défaut: avec label. */
  showLabel?: boolean
  className?: string
}

/**
 * Badge public « Certifié » d'une entité (dérivé de `isCertified` — Pro ou `verified`).
 * Gélule dorée (token `--amber`, défini jour ET nuit). Présentational pur.
 * Tout est en `style` inline : couleur ET remplissage de l'étoile passent par inline
 * (qui bat les règles `… svg { fill: none }` scopées + l'attribut fill de lucide 0.555).
 * Wording « Certifié » volontaire — jamais « identité vérifiée » (cf. décision 0004).
 */
export function CertifiedBadge({ size = 'sm', showLabel = true, className = '' }: CertifiedBadgeProps) {
  const iconSize = size === 'sm' ? 12 : 14
  const textClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold align-middle ${textClass} ${className}`}
      style={{
        color: 'var(--amber)',
        background: 'color-mix(in srgb, var(--amber) 16%, transparent)',
        border: '1px solid color-mix(in srgb, var(--amber) 34%, transparent)',
      }}
      title="Compte certifié Fellowship"
    >
      <Star size={iconSize} strokeWidth={0} style={{ fill: 'currentColor' }} aria-hidden="true" />
      {showLabel ? 'Certifié' : <span className="sr-only">Certifié</span>}
    </span>
  )
}
