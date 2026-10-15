/**
 * QUOI     — la petite pastille carrée teintée qui porte l'icône d'un bloc ou d'un chiffre.
 * POURQUOI — Uriel, 15/10/2026 : « un tout petit peu de couleur » pour s'y retrouver ; une teinte
 *            par sujet, toujours la même (abonnement terre, paiements sauge, activité bleu…).
 */
import type { LucideIcon } from 'lucide-react'

export type Tone = 'terre' | 'prune' | 'bleu' | 'sauge' | 'ocre' | 'brique' | 'gris'

export function IconTile({ Icon, tone }: { Icon: LucideIcon; tone: Tone }) {
  return (
    <span className={`icon-tile icon-tile--${tone}`} aria-hidden="true">
      <Icon size={16} strokeWidth={2} />
    </span>
  )
}
