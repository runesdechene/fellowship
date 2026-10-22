/**
 * QUOI     — le dessin d'une courbe de tendance : l'échelle ronde (0, 2, 4, 6), la place de chaque
 *            point, et le tracé lissé qui les relie.
 * POURQUOI — l'accueil de l'administration montre de vraies courbes (Uriel, 22/10/2026). Le lissage
 *            est monotone (Fritsch–Carlson) : la courbe ne monte jamais au-dessus d'un vrai pic ni
 *            ne descend sous zéro, elle ne ment pas sur les chiffres.
 */

export type Point = [x: number, y: number]

/** Les graduations rondes de 0 jusqu'au-dessus du maximum, en trois intervalles au plus. */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1]
  let step = 1
  for (let magnitude = 1; ; magnitude *= 10) {
    const found = [1, 2, 5].find((base) => Math.ceil(max / (base * magnitude)) <= 3)
    if (found) {
      step = found * magnitude
      break
    }
  }
  const count = Math.ceil(max / step)
  return Array.from({ length: count + 1 }, (_, index) => index * step)
}

/** La place de chaque valeur dans un cadre de `width` × `height`, zéro en bas, `top` en haut. */
export function placePoints(values: number[], width: number, height: number, top: number): Point[] {
  const last = Math.max(1, values.length - 1)
  return values.map((value, index) => [
    (index / last) * width,
    height - (Math.min(value, top) / top) * height,
  ])
}

/** Le tracé SVG lissé qui passe par tous les points. */
export function smoothPath(points: Point[]): string {
  const [first] = points
  if (!first) return ''
  if (points.length === 1) return `M${first[0]},${first[1]}`
  const slopes = points.slice(1).map(([x, y], index) => {
    const [px, py] = points[index] ?? first
    return (y - py) / (x - px)
  })
  // La pente en chaque point : nulle sur un sommet ou un creux, sinon la moyenne de ses voisines,
  // bornée pour ne jamais dépasser la donnée.
  const tangents = points.map((_, index) => {
    const before = slopes[index - 1]
    const after = slopes[index]
    if (before === undefined) return after ?? 0
    if (after === undefined) return before
    return before * after <= 0 ? 0 : (before + after) / 2
  })
  slopes.forEach((slope, index) => {
    if (slope === 0) {
      tangents[index] = 0
      tangents[index + 1] = 0
      return
    }
    const a = (tangents[index] ?? 0) / slope
    const b = (tangents[index + 1] ?? 0) / slope
    const norm = a * a + b * b
    if (norm > 9) {
      const k = 3 / Math.sqrt(norm)
      tangents[index] = k * a * slope
      tangents[index + 1] = k * b * slope
    }
  })
  let path = `M${first[0]},${first[1]}`
  for (let index = 0; index < points.length - 1; index++) {
    const [x0, y0] = points[index] ?? first
    const [x1, y1] = points[index + 1] ?? first
    const t0 = tangents[index] ?? 0
    const t1 = tangents[index + 1] ?? 0
    const h = (x1 - x0) / 3
    path += ` C${x0 + h},${y0 + t0 * h} ${x1 - h},${y1 - t1 * h} ${x1},${y1}`
  }
  return path
}
