import type { Map as MlMap } from 'maplibre-gl'
import type { Theme } from '@/lib/theme'

export type Palette = {
  land: string; landAlt: string; water: string; green: string; building: string
  road: string; roadMajor: string; text: string; halo: string; boundary: string
}

// Palette DA neutre (« moins marron ») : terres gris-chaud très désaturées,
// eau bleu-gris (et non sépia), routes neutres, pointe terracotta sur les frontières.
export const PALETTES: Record<Theme, Palette> = {
  night: {
    land: '#191717', landAlt: '#201d1d', water: '#10161b', green: '#1a201b', building: '#231f1f',
    road: '#322d2d', roadMajor: '#473f3c', text: '#bcb5ad', halo: '#0f0e0e', boundary: 'rgba(214,137,106,0.16)',
  },
  day: {
    land: '#eeeae4', landAlt: '#e6e1d9', water: '#cdd9e1', green: '#dde4d6', building: '#e2ddd4',
    road: '#d4cdc3', roadMajor: '#c3bbb0', text: '#5a534b', halo: '#f2efe9', boundary: 'rgba(182,95,63,0.22)',
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
