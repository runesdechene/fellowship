/**
 * QUOI     — sous le lieu d'une fiche : « À 142 km de ton atelier » (ou de ta position), sinon
 *            « Depuis ma position » ; puis « Voir sur la carte → ».
 * POURQUOI — maquette 2263:2 (lot 13) : on ouvre la carte depuis le lieu, là où l'on cherche « c'est
 *            où ? ».
 * ATTENTION — une fiche sans position n'a ni distance ni carte : le composant ne rend rien.
 */
import { ArrowRight, Navigation } from 'lucide-react'
import type { Point } from '@/lib/distance'
import { distanceSentence, type Origin } from '@/lib/origin'

interface PlaceDistanceProps {
  point: Point | null
  origin: Origin
  askPosition: () => void
  positionError: string | null
  asking: boolean
  openMap: () => void
}

export function PlaceDistance(props: PlaceDistanceProps) {
  const { point, origin, askPosition, positionError, asking, openMap } = props
  if (!point) return null
  const sentence = distanceSentence(point, origin)
  return (
    <span className="place-distance">
      {sentence ? (
        <span className="place-distance__line">{sentence}</span>
      ) : (
        <>
          {positionError && <span className="place-distance__line">{positionError}</span>}
          <button
            type="button"
            className="place-distance__ask"
            disabled={asking}
            onClick={askPosition}
          >
            <Navigation size={12} strokeWidth={2} />
            Depuis ma position
          </button>
        </>
      )}
      <button type="button" className="place-distance__open" onClick={openMap}>
        Voir sur la carte <ArrowRight size={12} strokeWidth={2} />
      </button>
    </span>
  )
}
