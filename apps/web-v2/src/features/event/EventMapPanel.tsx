/**
 * QUOI     — la carte ouverte depuis la fiche (`?carte`) : sur grand écran, à la place de l'affiche
 *            dans le mur de droite ; sinon, un écran qui glisse depuis la droite.
 * POURQUOI — maquettes 2263:2, 2263:375 et 2263:400 (lot 13) : voir où est l'événement par rapport à
 *            soi, avec la distance en bas.
 * ATTENTION — l'état vit dans l'adresse : le retour du navigateur referme la carte. Une fiche sans
 *            affiche n'a pas de mur : la carte y prend la forme de l'écran glissant.
 */
import { ChevronLeft, Navigation, X } from 'lucide-react'
import { lazy, Suspense } from 'react'
import type { Point } from '@/lib/distance'
import { distanceSentence, type Origin } from '@/lib/origin'

const EventMap = lazy(() => import('@/components/map/EventMap'))

interface EventMapPanelProps {
  name: string
  point: Point
  place: string
  hasPoster: boolean
  origin: Origin
  askPosition: () => void
  positionError: string | null
  asking: boolean
  close: () => void
}

export function EventMapPanel(props: EventMapPanelProps) {
  const { name, point, place, hasPoster, origin, askPosition, positionError, asking, close } = props
  const sentence = distanceSentence(point, origin)
  const start = origin.kind === 'none' ? null : { point: origin.point, label: origin.label }

  return (
    <section
      className={hasPoster ? 'map-panel map-panel--wall' : 'map-panel'}
      aria-label={`Carte de ${name}`}
    >
      <Suspense fallback={<div className="event-map" />}>
        <EventMap event={{ point, name }} origin={start} className="map-panel__map" />
      </Suspense>

      <button type="button" className="map-panel__close" onClick={close}>
        <X size={14} strokeWidth={2} />
        Revenir à l’affiche
      </button>
      <button type="button" className="map-panel__back" onClick={close}>
        <ChevronLeft size={16} strokeWidth={2} />
        {name}
      </button>

      <div className="map-panel__card">
        {sentence ? (
          <>
            <p className="map-panel__distance">{sentence}</p>
            <p className="map-panel__hint">À vol d’oiseau</p>
          </>
        ) : (
          <>
            <p className="map-panel__hint">
              {positionError ?? 'Pas de siège ni d’atelier renseigné pour ton enseigne'}
            </p>
            {!positionError && (
              <button
                type="button"
                className="map-panel__ask"
                disabled={asking}
                onClick={askPosition}
              >
                <Navigation size={13} strokeWidth={2} />
                Depuis ma position
              </button>
            )}
          </>
        )}
        <p className="map-panel__place">{place}</p>
      </div>
    </section>
  )
}
