/**
 * QUOI     — le fond de carte aux couleurs de l'app : quelle couleur poser sur quelle couche du style
 *            OpenFreeMap, et la palette lue dans les jetons `--map-*` (jour ou nuit).
 * POURQUOI — lot 13 : le style Positron d'OpenFreeMap (gratuit, sans clé, déjà permis par la CSP de
 *            flw.sh) est neutre ; on le peint comme le reste de l'app, en jour et en nuit.
 * ATTENTION — les couleurs vivent dans les jetons (2-semantic.css), jamais ici.
 */

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

export interface MapPalette {
  land: string
  landAlt: string
  water: string
  green: string
  building: string
  road: string
  roadMajor: string
  text: string
  halo: string
}

type Paint = [string, string | number][]

/** Les propriétés de peinture à poser sur une couche ; une couche inconnue n'est pas touchée. */
export function layerPaint(layer: { id: string; type: string }, palette: MapPalette): Paint {
  const id = layer.id.toLowerCase()
  if (layer.type === 'background') return [['background-color', palette.land]]
  if (layer.type === 'fill') {
    if (/water|ocean|sea/.test(id)) return [['fill-color', palette.water]]
    if (/wood|forest|park|grass|landcover/.test(id)) return [['fill-color', palette.green]]
    if (/building/.test(id)) return [['fill-color', palette.building]]
    return [['fill-color', palette.landAlt]]
  }
  if (layer.type === 'line') {
    if (/water|river|canal/.test(id)) return [['line-color', palette.water]]
    if (/motorway|trunk|primary/.test(id)) return [['line-color', palette.roadMajor]]
    return [['line-color', palette.road]]
  }
  if (layer.type === 'symbol') {
    return [
      ['text-color', palette.text],
      ['text-halo-color', palette.halo],
      ['text-halo-width', 1.4],
    ]
  }
  return []
}

/** La palette du thème en cours, lue dans les jetons posés sur la page. */
export function readPalette(element: Element): MapPalette {
  const style = getComputedStyle(element)
  const token = (name: string) => style.getPropertyValue(`--map-${name}`).trim()
  return {
    land: token('land'),
    landAlt: token('land-alt'),
    water: token('water'),
    green: token('green'),
    building: token('building'),
    road: token('road'),
    roadMajor: token('road-major'),
    text: token('text'),
    halo: token('halo'),
  }
}
