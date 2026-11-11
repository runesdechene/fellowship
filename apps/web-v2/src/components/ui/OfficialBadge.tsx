/**
 * QUOI     — le sceau « Officiel » : la pastille au dégradé de la marque, le logo en blanc au
 *            centre, collé au nom d'un compte officiel. Rien pour un autre compte.
 * POURQUOI — maquette 2835:893, validée par Uriel le 11/11/2026 : il dit que c'est l'équipe qui
 *            parle. Pas de coche : elle appartient au badge « Certifié » des Pro.
 */
import logo from '@/assets/logo-blanc.svg'
import { useOfficials } from '@/lib/useOfficials'

interface OfficialBadgeProps {
  actorId: string | null | undefined
  /** `small` près d'un nom courant (16 px), `large` sur la vitrine (22 px). */
  size?: 'small' | 'large'
}

export function OfficialBadge({ actorId, size = 'small' }: OfficialBadgeProps) {
  const officials = useOfficials()
  if (!actorId || !officials.has(actorId)) return null
  return (
    <span
      className={`official-badge official-badge--${size}`}
      role="img"
      aria-label="Officiel"
      title="Officiel"
    >
      <img className="official-badge__logo" src={logo} alt="" />
    </span>
  )
}
