import type { Map as MlMap } from 'maplibre-gl'
import type { Theme } from '@/lib/theme'

export type Palette = {
  land: string; landAlt: string; water: string; green: string; building: string
  road: string; roadMajor: string; text: string; halo: string; boundary: string
}

export const PALETTES: Record<Theme, Palette> = {
  night: {
    land: '#1a120f', landAlt: '#1f1714', water: '#100c0b', green: '#1f261d', building: '#241a16',
    road: '#3a2a20', roadMajor: '#5a3c26', text: '#cbb9a8', halo: '#120b09', boundary: 'rgba(232,131,58,0.18)',
  },
  day: {
    land: '#efe7d8', landAlt: '#e8dcc6', water: '#dcc7ad', green: '#d8d2bc', building: '#e3d6bf',
    road: '#cdbfa6', roadMajor: '#c2a988', text: '#5a4636', halo: '#f3ecdf', boundary: 'rgba(184,90,46,0.25)',
  },
}

export function paletteFor(theme: Theme): Palette {
  return PALETTES[theme]
}

// Recolore le style positron en place selon le thème. Tolérant : une couche sans la
// propriété ciblée est simplement ignorée (try/catch).
export function applyParchmentColors(map: MlMap, theme: Theme): void {
  const p = paletteFor(theme)
  const layers = map.getStyle().layers ?? []
  for (const l of layers) {
    const id = l.id.toLowerCase()
    try {
      if (l.type === 'background') {
        map.setPaintProperty(l.id, 'background-color', p.land)
      } else if (l.type === 'fill') {
        if (/water|ocean|sea|bay/.test(id)) map.setPaintProperty(l.id, 'fill-color', p.water)
        else if (/wood|forest|park|grass|wetland|landcover|vegetation/.test(id)) map.setPaintProperty(l.id, 'fill-color', p.green)
        else if (/building/.test(id)) map.setPaintProperty(l.id, 'fill-color', p.building)
        else map.setPaintProperty(l.id, 'fill-color', p.landAlt)
      } else if (l.type === 'line') {
        if (/water|river|canal/.test(id)) map.setPaintProperty(l.id, 'line-color', p.water)
        else if (/motorway|trunk|primary/.test(id)) map.setPaintProperty(l.id, 'line-color', p.roadMajor)
        else if (/boundary|admin/.test(id)) map.setPaintProperty(l.id, 'line-color', p.boundary)
        else map.setPaintProperty(l.id, 'line-color', p.road)
      } else if (l.type === 'symbol') {
        map.setPaintProperty(l.id, 'text-color', p.text)
        map.setPaintProperty(l.id, 'text-halo-color', p.halo)
        map.setPaintProperty(l.id, 'text-halo-width', 1.4)
      }
    } catch {
      /* couche sans cette propriété de peinture */
    }
  }
}
