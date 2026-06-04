import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { applyParchmentColors } from '@/lib/map-style'
import type { MapFeature, Bounds, MapFeatureProps } from '@/lib/map-data'
import type { Theme } from '@/lib/theme'
import { formatDateRange } from '@/lib/calendar-format'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const FRANCE_CENTER: [number, number] = [2.6, 46.7]

interface MapCanvasProps {
  features: MapFeature[]
  theme: Theme
  avatarUrl: string | null
  avatarLabel: string
  onBoundsChange: (b: Bounds) => void
  onSelect: (slug: string | null, id: string) => void
}

function buildAvatarEl(url: string | null, label: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'map-avatar'
  if (url) el.style.backgroundImage = `url("${url}")`
  else el.textContent = (label.trim()[0] ?? '★').toUpperCase()
  return el
}

function popupMarkup(p: MapFeatureProps): string {
  const date = formatDateRange(new Date(p.startDate), new Date(p.endDate))
  const safe = (s: string) => s.replace(/</g, '&lt;')
  return `<div class="map-pop">
    <strong style="font-family:var(--font-heading);font-size:15px">${safe(p.name)}</strong>
    <div style="color:#f0a154;font-weight:600;font-size:12.5px;margin-top:2px">${safe(date)}</div>
    <div style="color:var(--font-color-lowtitle);font-size:12.5px">${safe(p.city)}</div>
  </div>`
}

export function MapCanvas({ features, theme, avatarUrl, avatarLabel, onBoundsChange, onSelect }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const dataRef = useRef({ features, avatarUrl, avatarLabel })
  const themeRef = useRef(theme)
  const onBoundsRef = useRef(onBoundsChange)
  const onSelectRef = useRef(onSelect)

  // Garde les callbacks/données à jour pour les handlers MapLibre (enregistrés une fois).
  // Mis à jour en effet (pas pendant le render) — exécuté avant l'effet de refresh ci-dessous.
  useEffect(() => {
    dataRef.current = { features, avatarUrl, avatarLabel }
    onBoundsRef.current = onBoundsChange
    onSelectRef.current = onSelect
  })

  function refresh() {
    const map = mapRef.current
    if (!map || !map.getSource('events')) return
    const { features: feats, avatarUrl: url, avatarLabel: label } = dataRef.current
    const accepted = feats.filter(f => f.properties.accepted)
    const rest = feats.filter(f => !f.properties.accepted)
    ;(map.getSource('events') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: rest })
    markersRef.current.forEach(m => m.remove())
    markersRef.current = accepted.map(f => {
      const el = buildAvatarEl(url, label)
      el.addEventListener('click', () => {
        new maplibregl.Popup({ className: 'map-popup', offset: 22 })
          .setLngLat(f.geometry.coordinates).setHTML(popupMarkup(f.properties)).addTo(map)
        onSelectRef.current(f.properties.slug ?? null, f.properties.id)
      })
      return new maplibregl.Marker({ element: el }).setLngLat(f.geometry.coordinates).addTo(map)
    })
  }

  useEffect(() => {
    if (!containerRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: FRANCE_CENTER,
      zoom: 5.15,
      dragRotate: false,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

    map.on('style.load', () => {
      applyParchmentColors(map, themeRef.current)
      if (!map.getSource('events')) {
        map.addSource('events', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 46, clusterMaxZoom: 11 })
        map.addLayer({ id: 'clusters', type: 'circle', source: 'events', filter: ['has', 'point_count'],
          paint: { 'circle-color': '#e8833a', 'circle-radius': ['step', ['get', 'point_count'], 15, 10, 21, 30, 27], 'circle-stroke-width': 2, 'circle-stroke-color': '#ffd9a8' } })
        map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'events', filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 }, paint: { 'text-color': '#170f0e' } })
        map.addLayer({ id: 'unclustered', type: 'circle', source: 'events', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-color': ['get', 'color'], 'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': '#fff2e0' } })
      }
      refresh()
    })

    map.on('moveend', () => {
      const b = map.getBounds()
      onBoundsRef.current({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() })
    })
    map.on('click', 'clusters', (e) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]
      const clusterId = f.properties?.cluster_id as number
      ;(map.getSource('events') as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId).then(zoom => {
        map.easeTo({ center: (f.geometry as { coordinates: [number, number] }).coordinates, zoom })
      })
    })
    map.on('click', 'unclustered', (e) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties as unknown as MapFeatureProps
      new maplibregl.Popup({ className: 'map-popup', offset: 14 })
        .setLngLat((f.geometry as { coordinates: [number, number] }).coordinates).setHTML(popupMarkup(p)).addTo(map)
      onSelectRef.current(p.slug ?? null, p.id)
    })
    for (const layer of ['clusters', 'unclustered']) {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
    }

    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    themeRef.current = theme
    const map = mapRef.current
    if (map && map.isStyleLoaded()) applyParchmentColors(map, theme)
  }, [theme])

  useEffect(() => {
    refresh()
  }, [features, avatarUrl, avatarLabel])

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="map-vignette" />
    </>
  )
}
