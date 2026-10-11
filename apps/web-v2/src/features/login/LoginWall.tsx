/**
 * QUOI     — le mur d'affiches de la connexion : trois colonnes qui défilent lentement, un voile, et
 *            « Le réseau qui fait tourner les festivals » avec ses deux chiffres.
 * POURQUOI — maquette 2100:2 (lot 10a). Les affiches sont celles des festivals à venir ; les
 *            chiffres sont arrondis (lib/welcome.ts : wallCount).
 * ATTENTION — chaque colonne est doublée pour boucler sans saut ; avec prefers-reduced-motion,
 *            elle ne bouge pas (login-wall.css).
 */
import { wallCount } from '@/lib/welcome'
import { useLoginWall } from './useLoginWall'

const COLUMNS = 3

export function LoginWall() {
  const { posters, events, exposants } = useLoginWall()
  const columns = Array.from({ length: COLUMNS }, (_, column) =>
    posters.filter((_, index) => index % COLUMNS === column),
  )

  return (
    <div className="login__wall" aria-hidden="true">
      <div className="login-wall__columns">
        {columns.map((column, index) => (
          <div key={index} className="login-wall__column">
            {[...column, ...column].map((url, at) => (
              <img key={`${url}-${String(at)}`} className="login-wall__poster" src={url} alt="" />
            ))}
          </div>
        ))}
      </div>
      <div className="login-wall__veil" />
      <div className="login-wall__caption">
        <p className="login-wall__title">Le réseau qui fait tourner les festivals.</p>
        {events !== null && exposants !== null && (
          <p className="login-wall__count">
            {wallCount(events).toLocaleString('fr-FR')} festivals et marchés ·{' '}
            {wallCount(exposants).toLocaleString('fr-FR')} exposants indépendants
          </p>
        )}
      </div>
    </div>
  )
}
