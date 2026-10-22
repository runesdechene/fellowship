/**
 * QUOI     — une courbe de tendance : ligne lissée, voile léger dessous, point sur la dernière
 *            valeur ; en option, l'échelle graduée et la valeur de chaque point au survol.
 * POURQUOI — l'accueil de l'administration montre de vraies courbes, en couleur (Uriel,
 *            22/10/2026, maquette 2448:233) : le dégradé du logo pour les visiteurs, une teinte de
 *            l'administration pour chaque geste.
 * ATTENTION — le dessin s'étire à la largeur de son cadre (`preserveAspectRatio="none"`) : le trait
 *            garde son épaisseur par `vector-effect`, et le point est posé en HTML pour rester rond.
 */
import { useId, type CSSProperties } from 'react'
import { niceTicks, placePoints, smoothPath } from '@/lib/trend-line'

/** Le dégradé du logo, ou l'un des tons de l'administration (IconTile). */
export type TrendTone = 'logo' | 'prune' | 'bleu' | 'sauge' | 'ocre'

const WIDTH = 1000
const HEIGHT = 100

interface TrendLineProps {
  values: number[]
  label: string
  tone: TrendTone
  /** Les graduations à gauche et le quadrillage. */
  scale?: boolean
  /** Le nom de chaque point (« 22 oct. »), montré au survol avec sa valeur. */
  names?: string[]
}

export function TrendLine({ values, label, tone, scale = false, names }: TrendLineProps) {
  const gradient = `trend-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const ticks = scale ? niceTicks(Math.max(...values)) : [0, Math.max(1, ...values)]
  const top = ticks.at(-1) ?? 1
  const points = placePoints(values, WIDTH, HEIGHT, top)
  const line = smoothPath(points)
  const [lastX, lastY] = points.at(-1) ?? [0, HEIGHT]
  const at = (x: number, y: number) =>
    ({ '--x': `${(x / WIDTH) * 100}%`, '--y': `${(y / HEIGHT) * 100}%` }) as CSSProperties

  return (
    <figure className={`trend-line trend-line--${tone}`} role="img" aria-label={label}>
      {scale && (
        <div className="trend-line__ticks" aria-hidden="true">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="trend-line__tick"
              style={at(0, HEIGHT - (tick / top) * HEIGHT)}
            >
              {tick}
            </span>
          ))}
        </div>
      )}
      <div className="trend-line__plot">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={gradient}>
              <stop offset="0" className="trend-line__start" />
              <stop offset="1" className="trend-line__end" />
            </linearGradient>
          </defs>
          {(scale ? ticks : [0]).map((tick) => {
            const y = HEIGHT - (tick / top) * HEIGHT
            return (
              <line
                key={tick}
                className="trend-line__grid"
                x1={0}
                x2={WIDTH}
                y1={y}
                y2={y}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
          <path
            className="trend-line__area"
            d={`${line} L${lastX},${HEIGHT} L0,${HEIGHT} Z`}
            fill={`url(#${gradient})`}
          />
          <path
            className="trend-line__line"
            d={line}
            stroke={`url(#${gradient})`}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="trend-line__dot" style={at(lastX, lastY)} />
        {names?.map((name, index) => {
          const [x, y] = points[index] ?? [0, HEIGHT]
          return (
            <span key={name} className="trend-line__slot" style={at(x, y)}>
              <span className="trend-line__tip">
                {name}, {values[index]}
              </span>
            </span>
          )
        })}
      </div>
    </figure>
  )
}
