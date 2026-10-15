/**
 * QUOI     — le libellé et la teinte de chaque type d'enseigne (exposant, festival, entreprise).
 * POURQUOI — la pastille de type et le repli du logo sans image disent la même teinte ; une seule source.
 */
import type { Tone } from '@/components/ui/IconTile'

const TYPES: Record<string, { label: string; tone: Tone }> = {
  exposant: { label: 'Exposant', tone: 'terre' },
  festival: { label: 'Festival', tone: 'prune' },
  entreprise: { label: 'Entreprise', tone: 'bleu' },
}

/** Libellé et teinte d'un type ; absent ou inconnu : « Sans enseigne », gris neutre. */
export function entityTypeOf(type: string | null): { label: string; tone: Tone } {
  return (type && TYPES[type]) || { label: 'Sans enseigne', tone: 'gris' }
}
