import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin } from 'lucide-react'
import { applyParchmentColors } from '@/lib/map-style'
import { useTheme } from '@/hooks/use-theme'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const FRANCE_CENTER: [number, number] = [2.6, 46.7]

interface PointPickerMapProps {
  center: { lat: number; lng: number } | null
  onMove: (coords: { lat: number; lng: number }) => void
}

// Carte de sélection : un pin fixe au centre de la vue ; l'utilisateur déplace la
// carte sous le pin. `onMove` reçoit le centre à chaque fin de déplacement.
export function PointPickerMap({ center, onMove }: PointPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onMoveRef = useRef(onMove)
  const { theme } = useTheme()
  const themeRef = useRef(theme)

  useEffect(() => { onMoveRef.current = onMove })

  useEffect(() => {
    themeRef.current = theme
    const map = mapRef.current
    if (map && map.isStyleLoaded()) applyParchmentColors(map, theme)
  }, [theme])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let map: maplibregl.Map | null = null
    let ro: ResizeObserver | null = null
    const start: [number, number] = center ? [center.lng, center.lat] : FRANCE_CENTER

    const raf = requestAnimationFrame(() => {
      const m = new maplibregl.Map({
        container,
        style: STYLE_URL,
        center: start,
        zoom: center ? 13 : 5.2,
        dragRotate: false,
        attributionControl: { compact: true },
      })
      map = m
      mapRef.current = m
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
      ro = new ResizeObserver(() => m.resize())
      ro.observe(container)
      m.on('moveend', () => {
        const c = m.getCenter()
        onMoveRef.current({ lat: c.lat, lng: c.lng })
      })
      m.on('style.load', () => {
        applyParchmentColors(m, themeRef.current)
        m.resize()
      })
    })

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      map?.remove()
      mapRef.current = null
    }
    // Monté une seule fois : `center` n'est qu'un point de départ ; les déplacements
    // ultérieurs viennent de l'utilisateur, pas d'un re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Le conteneur MapLibre doit être un enfant flex en flux (flex-1 min-h-0) ; le parent
  // (LocationField) lui donne une hauteur fixe via un wrapper flex col.
  return (
    <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden rounded-xl">
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
        <MapPin className="h-9 w-9 drop-shadow-md" style={{ color: 'var(--tag-accent, #e8b04b)' }} fill="currentColor" strokeWidth={1} />
      </div>
    </div>
  )
}
