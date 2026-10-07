import { Snowflake, Sprout, Sun, Leaf } from 'lucide-react'

/** Picto saisonnier monochrome (hiver/printemps/été/automne) par numéro de mois (0-11). */
export function SeasonGlyph({ month, size = 15 }: { month: number; size?: number }) {
  const Icon = month <= 1 || month === 11 ? Snowflake
    : month <= 4 ? Sprout
    : month <= 7 ? Sun
    : Leaf
  return <Icon size={size} strokeWidth={1.6} className="calendar-month-picto" aria-hidden />
}
