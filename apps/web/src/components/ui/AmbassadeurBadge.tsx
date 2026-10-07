import { Award } from 'lucide-react'

interface AmbassadeurBadgeProps {
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

/**
 * Badge public « Ambassadeur » : entité ayant amené ≥1 filleul payant (permanent).
 * Gélule cuivre (token `--copper`, jour ET nuit). Présentational pur — la logique est
 * `isAmbassador(entity)` (src/lib/referral.ts), lue depuis entities.is_ambassador.
 */
export function AmbassadeurBadge({ size = 'sm', showLabel = true, className = '' }: AmbassadeurBadgeProps) {
  const iconSize = size === 'sm' ? 12 : 14
  const textClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold align-middle ${textClass} ${className}`}
      style={{
        color: 'var(--copper)',
        background: 'color-mix(in srgb, var(--copper) 16%, transparent)',
        border: '1px solid color-mix(in srgb, var(--copper) 34%, transparent)',
      }}
      title="Ambassadeur Fellowship"
    >
      <Award size={iconSize} strokeWidth={2} aria-hidden="true" />
      {showLabel ? 'Ambassadeur' : <span className="sr-only">Ambassadeur</span>}
    </span>
  )
}
