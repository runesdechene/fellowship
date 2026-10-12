/**
 * QUOI     — la carte d'un événement : le fond OpenFreeMap aux couleurs de l'app, l'épingle de
 *            l'événement, celle du point de départ (atelier ou position) et le trait à vol d'oiseau.
 * POURQUOI — lot 13 (maquettes 2263:2, 2263:375) : voir où est un événement par rapport à soi. Un
 *            seul composant sert au mur de la fiche, à l'écran glissant et à l'aperçu de modification.
 * ATTENTION — chargé à la demande (`lazy`) : maplibre pèse lourd et ne sert qu'à qui ouvre la carte.
 *            Le conteneur est DANS le flux : une carte posée en absolu mesure parfois 0 px à sa
 *            création et reste vide. La carte naît dans un `requestAnimationFrame`, puis suit la
 *            taille de son parent.
 */
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import type { Point } from '@/lib/distance'
import { layerPaint, MAP_STYLE_URL, readPalette } from '@/lib/map-style'

interface EventMapProps {
  event: { point: Point; name: string }
  origin?: { point: Point; label: string } | null
  className?: string
}

const lngLat = (point: Point): [number, number] => [point.longitude, point.latitude]

function pin(label: string, kind: 'event' | 'origin'): HTMLElement {
  const element = document.createElement('div')
  element.className = `map-pin map-pin--${kind}`
  const dot = document.createElement('span')
  dot.className = 'map-pin__dot'
  element.append(dot, label)
  return element
}

/** Repeint le fond aux couleurs du thème en cours. */
function paint(map: maplibregl.Map, container: Element) {
  const palette = readPalette(container)
  for (const layer of map.getStyle().layers) {
    for (const [property, value] of layerPaint(layer, palette)) {
      try {
        map.setPaintProperty(layer.id, property, value)
      } catch {
        /* une couche sans cette propriété : on passe */
      }
    }
  }
  if (map.getLayer('trajet')) map.setPaintProperty('trajet', 'line-color', palette.text)
}

export default function EventMap({ event, origin = null, className }: EventMapProps) {
  const box = useRef<HTMLDivElement>(null)
  const { latitude, longitude } = event.point
  const originLatitude = origin?.point.latitude
  const originLongitude = origin?.point.longitude
  const originLabel = origin?.label

  useEffect(() => {
    const container = box.current
    if (!container) return
    let map: maplibregl.Map | null = null
    const target = { latitude, longitude }
    const start =
      originLatitude !== undefined && originLongitude !== undefined
        ? { latitude: originLatitude, longitude: originLongitude }
        : null

    const frame = requestAnimationFrame(() => {
      map = new maplibregl.Map({
        container,
        style: MAP_STYLE_URL,
        center: lngLat(target),
        zoom: 11,
        dragRotate: false,
        attributionControl: { compact: true },
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
      new maplibregl.Marker({ element: pin(event.name, 'event') })
        .setLngLat(lngLat(target))
        .addTo(map)
      if (start && originLabel) {
        new maplibregl.Marker({ element: pin(originLabel, 'origin') })
          .setLngLat(lngLat(start))
          .addTo(map)
        map.fitBounds([lngLat(start), lngLat(target)], { padding: 80, maxZoom: 12, duration: 0 })
      }
      const loaded = map
      loaded.on('load', () => {
        if (start) {
          loaded.addSource('trajet', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: [lngLat(start), lngLat(target)] },
            },
          })
          loaded.addLayer({
            id: 'trajet',
            type: 'line',
            source: 'trajet',
            paint: { 'line-width': 2, 'line-dasharray': [2, 2] },
          })
        }
        paint(loaded, container)
      })
    })

    // Le thème change (jour ↔ nuit) : le fond suit.
    const watcher = new MutationObserver(() => {
      if (map?.isStyleLoaded()) paint(map, container)
    })
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const sizer = new ResizeObserver(() => map?.resize())
    sizer.observe(container)

    return () => {
      cancelAnimationFrame(frame)
      watcher.disconnect()
      sizer.disconnect()
      map?.remove()
    }
  }, [latitude, longitude, originLatitude, originLongitude, originLabel, event.name])

  return <div ref={box} className={className ? `event-map ${className}` : 'event-map'} />
}
