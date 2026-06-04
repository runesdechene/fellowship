import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { applyParchmentColors } from '@/lib/map-style'
import type { MapFeature, MapFeatureProps } from '@/lib/map-data'
import type { Theme } from '@/lib/theme'
import { formatDateRange } from '@/lib/calendar-format'
import { getTagEmoji } from '@/components/ui/TagBadge'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const FRANCE_CENTER: [number, number] = [2.6, 46.7]

interface MapCanvasProps {
  features: MapFeature[]
  theme: Theme
  avatarUrl: string | null
  avatarLabel: string
  onSelect: (slug: string | null, id: string) => void
}

// Marqueur "Accepté" : avatar de l'acteur (cerclé cuivre, pulse).
function buildAvatarEl(url: string | null, label: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'map-avatar'
  if (url) el.style.backgroundImage = `url("${url}")`
  else el.textContent = (label.trim()[0] ?? '★').toUpperCase()
  return el
}

// Marqueur event : pastille ronde, image du festival, bordure = couleur du tag (sinon emoji).
function buildEventEl(p: MapFeatureProps): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'map-event-marker'
  el.style.setProperty('--mk-color', p.color)
  if (p.imageUrl) el.style.backgroundImage = `url("${p.imageUrl}")`
  else el.textContent = getTagEmoji(p.primaryTag)
  return el
}

// N'accepte qu'une URL https (les contenus events sont saisis par des utilisateurs).
function safeHttpsUrl(u: string | null): string | null {
  if (!u) return null
  try {
    const url = new URL(u)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

// Popup construit en DOM (pas de setHTML) : textContent échappe le texte, l'URL est validée.
function buildPopupContent(p: MapFeatureProps, onLink: () => void): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'map-pop'

  const safeUrl = safeHttpsUrl(p.imageUrl)
  if (safeUrl) {
    const img = document.createElement('div')
    img.className = 'map-pop-img'
    img.style.backgroundImage = `url(${JSON.stringify(safeUrl)})`
    root.appendChild(img)
  }

  const body = document.createElement('div')
  body.className = 'map-pop-body'

  const name = document.createElement('strong')
  name.textContent = p.name
  name.style.cssText = 'font-family:var(--font-heading);font-size:15px;line-height:1.2'

  const date = document.createElement('div')
  date.textContent = formatDateRange(new Date(p.startDate), new Date(p.endDate))
  date.style.cssText = 'color:#f0a154;font-weight:600;font-size:12.5px;margin-top:3px'

  const city = document.createElement('div')
  city.textContent = p.city
  city.style.cssText = 'color:var(--font-color-lowtitle);font-size:12.5px'

  const link = document.createElement('button')
  link.type = 'button'
  link.className = 'map-pop-link'
  link.textContent = 'Voir le festival →'
  link.addEventListener('click', onLink)

  body.append(name, date, city, link)
  root.appendChild(body)
  return root
}

export function MapCanvas({ features, theme, avatarUrl, avatarLabel, onSelect }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const dataRef = useRef({ features, avatarUrl, avatarLabel })
  const themeRef = useRef(theme)
  const onSelectRef = useRef(onSelect)

  // Garde données/callback à jour pour les marqueurs (créés après le montage). En effet, pas au render.
  useEffect(() => {
    dataRef.current = { features, avatarUrl, avatarLabel }
    onSelectRef.current = onSelect
  })

  // Un marqueur DOM par event (pas de clustering). Avatar si "Accepté", sinon pastille image+tag.
  function refresh() {
    const map = mapRef.current
    if (!map) return
    const { features: feats, avatarUrl: url, avatarLabel: label } = dataRef.current
    markersRef.current.forEach(m => m.remove())
    markersRef.current = feats.map(f => {
      const p = f.properties
      const el = p.accepted ? buildAvatarEl(url, label) : buildEventEl(p)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        // Clic = popup résumé (pas de navigation directe) ; le lien "Voir le festival" navigue.
        // closeOnClick:false sinon le clic qui ouvre referme aussitôt. Un seul popup à la fois.
        popupRef.current?.remove()
        const content = buildPopupContent(p, () => onSelectRef.current(p.slug ?? null, p.id))
        popupRef.current = new maplibregl.Popup({ className: 'map-popup', offset: 24, maxWidth: '260px', closeOnClick: false })
          .setLngLat(f.geometry.coordinates).setDOMContent(content).addTo(map)
      })
      return new maplibregl.Marker({ element: el }).setLngLat(f.geometry.coordinates).addTo(map)
    })
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let map: maplibregl.Map | null = null
    let ro: ResizeObserver | null = null

    // Création différée d'une frame : le conteneur flex est parfois mesuré à 0 de hauteur au
    // moment exact du `new Map()` (montage React) → canvas 300px, carte vide. En rAF c'est stable.
    const raf = requestAnimationFrame(() => {
      const m = new maplibregl.Map({
        container,
        style: STYLE_URL,
        center: FRANCE_CENTER,
        zoom: 5.15,
        dragRotate: false,
        attributionControl: { compact: true },
      })
      map = m
      mapRef.current = m
      m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
      ro = new ResizeObserver(() => m.resize())
      ro.observe(container)
      m.on('style.load', () => {
        applyParchmentColors(m, themeRef.current)
        m.resize()
        refresh()
      })
    })

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      markersRef.current.forEach(mk => mk.remove())
      markersRef.current = []
      map?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    themeRef.current = theme
    const map = mapRef.current
    if (map && map.isStyleLoaded()) applyParchmentColors(map, theme)
  }, [theme])

  useEffect(() => {
    refresh()
  }, [features, avatarUrl, avatarLabel])

  // Le conteneur MapLibre DOIT être un enfant flex en flux (flex-1 min-h-0) : monté sur un
  // `absolute inset-0`, sa hauteur en % s'effondre à 0 sous la chaîne flex → carte invisible.
  return (
    <div ref={containerRef} className="relative flex-1 min-h-0">
      <div className="map-vignette" />
    </div>
  )
}
