// reporting-stands : un paiement SumUp a-t-il eu lieu sur un stand en Suisse ou en Belgique ?
// Une vente sur place relève de la TVA du pays. D'après la position GPS du paiement.
// shortcut : contours grossiers, et deux pays seulement ; à la frontière, ou pour un autre pays, à
// reprendre le jour où un stand tombe mal. La journée se confirme à la main dans tous les cas.

type Point = [lon: number, lat: number]

const CONTOURS: Record<string, Point[]> = {
  CH: [
    [5.97, 46.14], [6.18, 46.16], [6.30, 46.24], [6.24, 46.31], [6.80, 46.39], [7.17, 45.87], [7.66, 45.98], [7.87, 45.93],
    [8.13, 46.25], [8.44, 46.46], [9.02, 45.83], [9.50, 46.20], [10.47, 46.55], [10.49, 46.98], [9.65, 47.47], [9.18, 47.66],
    [8.60, 47.80], [7.59, 47.59], [7.00, 47.50], [6.75, 47.06], [6.37, 46.71], [6.07, 46.46],
  ],
  BE: [
    [2.55, 51.09], [3.37, 51.37], [4.40, 51.48], [5.00, 51.48], [5.85, 51.16], [6.05, 50.75], [6.40, 50.33], [5.80, 49.60],
    [5.40, 49.50], [4.87, 49.80], [4.25, 49.97], [4.15, 50.25], [3.70, 50.30], [3.20, 50.50], [3.10, 50.75], [2.60, 50.85],
  ],
}

/** Taux de TVA du pays du stand, pour n'en déclarer que le HT (spécifications DGFiP 3.2). */
export const TAUX_STAND: Record<string, number> = { CH: 8.1, BE: 21 }
export const NOM_PAYS_STAND: Record<string, string> = { CH: 'Suisse', BE: 'Belgique' }

/** Le pays d'un stand étranger, ou null : on reste en France. */
export function paysDeStand(lat: number, lon: number): string | null {
  return Object.keys(CONTOURS).find((pays) => dansContour(CONTOURS[pays], lon, lat)) ?? null
}

// Le tir de rayon : un point est dedans s'il croise le contour un nombre impair de fois.
function dansContour(contour: Point[], x: number, y: number): boolean {
  let dedans = false
  for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
    const [xi, yi] = contour[i]
    const [xj, yj] = contour[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans
  }
  return dedans
}
