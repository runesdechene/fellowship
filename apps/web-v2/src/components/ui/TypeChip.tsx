/**
 * QUOI     — la pastille du type d'enseigne : exposant, festival, entreprise, ou sans enseigne.
 * POURQUOI — on distingue un festival d'un exposant d'un coup d'œil (maquette 2338:2).
 */
import { entityTypeOf } from '@/lib/entity-type'

export function TypeChip({ type }: { type: string | null }) {
  const { label, tone } = entityTypeOf(type)
  return <span className={`type-chip type-chip--${tone}`}>{label}</span>
}
