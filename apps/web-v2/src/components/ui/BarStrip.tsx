/**
 * QUOI     — une rangée de barres sans chiffres : la dernière, la période en cours, est pleine ;
 *            une période à zéro n'est qu'un trait.
 * POURQUOI — l'accueil de l'administration montre des tendances, pas des valeurs (maquette
 *            2448:233) : visiteurs jour par jour, gestes semaine par semaine. Même langage que la
 *            frise de saison.
 */
import type { CSSProperties } from 'react'

export function BarStrip({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values)
  return (
    <div className="bar-strip" role="img" aria-label={label}>
      {values.map((value, index) => {
        const classes = ['bar-strip__bar']
        if (value === 0) classes.push('bar-strip__bar--empty')
        else if (index === values.length - 1) classes.push('bar-strip__bar--current')
        return (
          <span
            key={index}
            className={classes.join(' ')}
            style={{ '--bar-ratio': String(value / max) } as CSSProperties}
          />
        )
      })}
    </div>
  )
}
