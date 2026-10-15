/**
 * QUOI     — la pastille du type d'enseigne : exposant, festival, entreprise, ou sans enseigne.
 * POURQUOI — on distingue un festival d'un exposant d'un coup d'œil (maquette 2338:2).
 */
import type { Tone } from './IconTile'

const TYPES: Record<string, { label: string; tone: Tone }> = {
  exposant: { label: 'Exposant', tone: 'terre' },
  festival: { label: 'Festival', tone: 'prune' },
  entreprise: { label: 'Entreprise', tone: 'bleu' },
}

export function TypeChip({ type }: { type: string | null }) {
  const found = type ? TYPES[type] : undefined
  const { label, tone } = found ?? { label: 'Sans enseigne', tone: 'gris' }
  return <span className={`type-chip type-chip--${tone}`}>{label}</span>
}
