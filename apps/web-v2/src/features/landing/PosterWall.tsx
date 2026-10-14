/**
 * QUOI     — le mur d'affiches de l'ouverture : six colonnes inclinées des vraies affiches à
 *            venir, qui défilent en sens alternés ; sous l'affiche du festival le plus suivi, la
 *            carte « Atelier Corne & Cuir y va ».
 * POURQUOI — maquette 2290:2 : le mur de la connexion, en grand, « super méga classe » (Uriel,
 *            14/10/2026). Les affiches changent quand Fellowship change.
 * ATTENTION — chaque colonne est doublée pour boucler sans saut ; la copie est cachée aux lecteurs
 *            d'écran. Figé sous `prefers-reduced-motion` (landing.css). Les affiches viennent en
 *            miniature de 480 px : le mur en montre une trentaine.
 */
import { posterThumb } from '@/lib/landing'
import { DEMO } from '@/lib/landing-demo'

const COLUMNS = 6
const PER_COLUMN = 5
const POSTER_WIDTH = 480

interface PosterWallProps {
  posters: string[]
  crowd: { poster: string | null; count: number } | null
}

function Column({ posters, crowd }: PosterWallProps) {
  const cardAt = crowd?.poster ? posters.indexOf(crowd.poster) : -1
  const items = (hidden: boolean) =>
    posters.map((url, i) => (
      <div key={`${url}-${String(i)}`} className="landing-wall__item">
        <img className="landing-wall__poster" src={posterThumb(url, POSTER_WIDTH)} alt="" />
        {!hidden && i === cardAt && crowd && (
          <div className="landing-wall__goer">
            <span className="landing-wall__face">{DEMO.initials.charAt(0)}</span>
            <span>
              <span className="landing-wall__who">{DEMO.name}</span>
              <span className="landing-wall__goes">
                {crowd.count > 1
                  ? `y va, avec ${String(crowd.count - 1)} ${crowd.count === 2 ? 'compagnon' : 'compagnons'}`
                  : 'y va'}
              </span>
            </span>
          </div>
        )}
      </div>
    ))
  return (
    <div className="landing-wall__column">
      {items(false)}
      <div className="landing-wall__copy" aria-hidden>
        {items(true)}
      </div>
    </div>
  )
}

export function PosterWall({ posters, crowd }: PosterWallProps) {
  if (posters.length === 0) return null
  // Assez d'affiches pour remplir chaque colonne, en reprenant la liste s'il en manque.
  const filled = Array.from(
    { length: COLUMNS * PER_COLUMN },
    (_, i) => posters[i % posters.length] ?? '',
  )
  const columns = Array.from({ length: COLUMNS }, (_, c) =>
    filled.filter((_, i) => i % COLUMNS === c),
  )
  return (
    <div className="landing-wall" aria-hidden>
      <div className="landing-wall__tilt">
        {columns.map((column, c) => (
          <Column key={c} posters={column} crowd={crowd} />
        ))}
      </div>
    </div>
  )
}
