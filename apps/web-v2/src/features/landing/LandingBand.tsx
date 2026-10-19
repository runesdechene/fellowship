/**
 * QUOI     — une bande penchée de la landing : papier, terre ou nuit, son bord haut qui mord en
 *            biais dans la bande du dessus, et parfois des affiches floues en fond.
 * POURQUOI — maquette 2290:2 : les sections s'emboîtent de biais, comme l'ancien Stripe (Uriel,
 *            14/10/2026). La pente vient d'un `clip-path`, la même partout (--landing-slant).
 * ATTENTION — le flou des affiches vient de miniatures de 12 px agrandies, jamais d'un `filter` :
 *            un flou sur un grand calque fige le rendu (.claude/rules/interface.md).
 */
import type { ReactNode } from 'react'
import { posterThumb } from '@/lib/poster-thumb'

const BLUR_TILES = 4
const BLUR_WIDTH = 12

interface LandingBandProps {
  tone: 'paper' | 'earth' | 'night'
  /** `rise` : le bord monte de gauche à droite ; `fall` : il descend. */
  slant: 'rise' | 'fall'
  posters?: string[]
  id?: string
  className?: string
  children: ReactNode
}

export function LandingBand({ tone, slant, posters, id, className, children }: LandingBandProps) {
  const tiles = posters?.length
    ? Array.from({ length: BLUR_TILES }, (_, i) => posters[(i * 7 + 3) % posters.length] ?? '')
    : []
  return (
    <section
      id={id}
      className={`landing-band landing-band--${tone} landing-band--${slant}${className ? ` ${className}` : ''}`}
    >
      {tiles.length > 0 && (
        <div className="landing-band__blur" aria-hidden>
          {tiles.map((url, i) => (
            <img key={i} src={posterThumb(url, BLUR_WIDTH)} alt="" />
          ))}
        </div>
      )}
      <div className="landing-band__inner">{children}</div>
    </section>
  )
}
