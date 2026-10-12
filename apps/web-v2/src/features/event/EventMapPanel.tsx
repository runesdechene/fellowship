/**
 * QUOI     — la carte ouverte depuis la fiche (`?carte`) : sur grand écran, à la place de l'affiche
 *            dans le mur de droite ; sinon, un écran qui glisse depuis la droite.
 * POURQUOI — maquettes 2263:2, 2263:375 et 2263:400 (lot 13) : voir où est l'événement par rapport à
 *            soi, avec la distance en bas.
 * ATTENTION — l'état vit dans l'adresse : le retour du navigateur referme la carte. Une fiche sans
 *            affiche n'a pas de mur : la carte y prend la forme de l'écran glissant. Rendue dans
 *            `document.body` (portail) : le panneau principal porte un nom de transition de vue, qui
 *            l'enferme dans son propre empilement — la carte passait SOUS le mur d'affiche.
 */
import { ChevronLeft, Navigation, X } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LoadBoundary } from '@/components/ui/LoadBoundary'
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
  /** Un compte personnel n'a pas d'enseigne, donc pas d'atelier : le texte le dit autrement. */
  personal: boolean
}

export function EventMapPanel(props: EventMapPanelProps) {
  const {
    name,
    point,
    place,
    hasPoster,
    origin,
    askPosition,
    positionError,
    asking,
    close,
    personal,
  } = props
  const sentence = distanceSentence(point, origin)
  const start = origin.kind === 'none' ? null : { point: origin.point, label: origin.label }
  const panel = useRef<HTMLElement>(null)
  const [closing, setClosing] = useState(false)

  // Fermer joue d'abord la sortie (le geste des tiroirs de la boutique), puis referme pour de bon.
  // Sans mouvement demandé, ou si la fin de transition ne vient pas, on referme tout de suite.
  const leave = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) close()
    else setClosing(true)
  }, [close])
  useEffect(() => {
    if (!closing) return
    const fallback = setTimeout(close, 400)
    return () => {
      clearTimeout(fallback)
    }
  }, [closing, close])

  // Le focus passe sur le bouton de retour visible (celui du mur ou celui de l'écran glissant), et
  // Échap referme, comme le retour du navigateur.
  useEffect(() => {
    const buttons = panel.current?.querySelectorAll<HTMLButtonElement>(
      '.map-panel__close, .map-panel__back',
    )
    const visible = [...(buttons ?? [])].find((button) => button.offsetParent !== null)
    visible?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [leave])

  return createPortal(
    <section
      ref={panel}
      className={['map-panel', hasPoster && 'map-panel--wall', closing && 'map-panel--closing']
        .filter(Boolean)
        .join(' ')}
      onTransitionEnd={(event) => {
        if (closing && event.target === event.currentTarget && event.propertyName === 'opacity')
          close()
      }}
      aria-label={`Carte de ${name}`}
    >
      <LoadBoundary fallback={<p className="map-panel__failed">La carte n’a pas pu se charger.</p>}>
        <Suspense fallback={<div className="event-map" />}>
          <EventMap event={{ point, name }} origin={start} className="map-panel__map" />
        </Suspense>
      </LoadBoundary>

      <button type="button" className="map-panel__close" onClick={leave}>
        <X size={14} strokeWidth={2} />
        Revenir à l’affiche
      </button>
      <button type="button" className="map-panel__back" onClick={leave}>
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
              {positionError ??
                (personal
                  ? 'Ton compte personnel n’a pas d’atelier'
                  : 'Pas de siège ni d’atelier renseigné pour ton enseigne')}
            </p>
            {
              <button
                type="button"
                className="map-panel__ask"
                disabled={asking}
                onClick={askPosition}
              >
                <Navigation size={13} strokeWidth={2} />
                Depuis ma position
              </button>
            }
          </>
        )}
        <p className="map-panel__place">{place}</p>
      </div>
    </section>,
    document.body,
  )
}
