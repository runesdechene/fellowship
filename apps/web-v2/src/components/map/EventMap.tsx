/**
 * QUOI     — la carte d'un événement : le fond OpenFreeMap aux couleurs de l'app, l'épingle de
 *            l'événement, celle du point de départ (atelier ou position) et le trait à vol d'oiseau.
 * POURQUOI — lot 13 (maquettes 2263:2, 2263:375) : voir où est un événement par rapport à soi. Un
 *            seul composant sert au mur de la fiche, à l'écran glissant et à l'aperçu de modification.
 * ATTENTION — chargé à la demande (`lazy`) : maplibre pèse lourd et ne sert qu'à qui ouvre la carte.
 *            La carte naît UNE fois (dans un `requestAnimationFrame`, son conteneur étant dans le
 *            flux) ; les épingles, le trait et le cadrage se mettent à jour à part. La recréer à
 *            chaque changement de point de départ la laissait en vue du monde, sans épingles.
 */
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import { boundsOf, type Point } from '@/lib/distance'
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
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)

  // La carte, une fois : le fond, ses couleurs, le trait (vide), et le thème suivi.
  useEffect(() => {
    const container = box.current
    if (!container) return
    let map: maplibregl.Map | null = null
    const frame = requestAnimationFrame(() => {
      map = new maplibregl.Map({
        container,
        style: MAP_STYLE_URL,
        center: [2.6, 46.7],
        zoom: 5,
        dragRotate: false,
        attributionControl: { compact: true },
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
      const loaded = map
      // Le style suffit : attendre les tuiles (« load ») montrait le Positron d'origine, et un
      // changement de thème pendant leur chargement se perdait.
      loaded.on('style.load', () => {
        loaded.addSource('trajet', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        loaded.addLayer({
          id: 'trajet',
          type: 'line',
          source: 'trajet',
          paint: { 'line-width': 2, 'line-dasharray': [2, 2] },
        })
        paint(loaded, container)
        mapRef.current = loaded
        setReady(true)
      })
    })
    const watcher = new MutationObserver(() => {
      if (mapRef.current) paint(mapRef.current, container)
    })
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const sizer = new ResizeObserver(() => map?.resize())
    sizer.observe(container)
    return () => {
      cancelAnimationFrame(frame)
      watcher.disconnect()
      sizer.disconnect()
      mapRef.current = null
      map?.remove()
    }
  }, [])

  // Les épingles, le trait et le cadrage : à chaque changement d'événement ou de point de départ.
  const { latitude, longitude } = event.point
  const originLatitude = origin?.point.latitude
  const originLongitude = origin?.point.longitude
  const originLabel = origin?.label
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    // Le cadrage se calcule sur la taille du conteneur : la carte la relit d'abord, sinon elle
    // cadre sur une largeur périmée et les deux épingles sortent de l'écran.
    map.resize()
    const target = { latitude, longitude }
    const markers = [
      new maplibregl.Marker({ element: pin(event.name, 'event') })
        .setLngLat(lngLat(target))
        .addTo(map),
    ]
    const source = map.getSource<maplibregl.GeoJSONSource>('trajet')
    if (originLatitude !== undefined && originLongitude !== undefined && originLabel) {
      const start = { latitude: originLatitude, longitude: originLongitude }
      markers.push(
        new maplibregl.Marker({ element: pin(originLabel, 'origin') })
          .setLngLat(lngLat(start))
          .addTo(map),
      )
      source?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [lngLat(start), lngLat(target)] },
      })
      // Plus de marge en bas : la carte de distance y est posée par-dessus.
      map.fitBounds(boundsOf(start, target), {
        padding: { top: 90, right: 110, bottom: 200, left: 110 },
        maxZoom: 12,
        duration: 0,
      })
    } else {
      source?.setData({ type: 'FeatureCollection', features: [] })
      map.jumpTo({ center: lngLat(target), zoom: 11 })
    }
    return () => {
      for (const marker of markers) marker.remove()
    }
  }, [ready, latitude, longitude, originLatitude, originLongitude, originLabel, event.name])

  return <div ref={box} className={className ? `event-map ${className}` : 'event-map'} />
}
