/**
 * QUOI     — l'ouverture de la landing : « Ne rate plus jamais un bon festival. », la promesse, la
 *            recherche, la preuve, et le mur d'affiches.
 * POURQUOI — maquette 2290:2 (nœud 2290:3) ; positionnement du 19/10/2026 : ne plus rien rater,
 *            grâce au calendrier connecté aux amis. Le nombre d'exposants et les visages (de vrais avatars) sont lus en base.
 *            La ligne « Conçu par Runes de Chêne » vient du Concile (maquette 2458:2329) : le
 *            fondateur est exposant, c'est ce qu'aucun annuaire ne peut acheter.
 * ATTENTION — la recherche mène aux résultats publics, /festivals (lot 11b).
 */
import { posterThumb } from '@/lib/poster-thumb'
import type { Showcase } from '@/lib/landing'
import { LandingSearch } from './LandingSearch'
import { PosterWall } from './PosterWall'

export function Opening({ showcase }: { showcase: Showcase | null }) {
  const crowd = showcase?.crowd
    ? { poster: showcase.crowd.event.imageUrl, count: showcase.crowd.count }
    : null

  return (
    <div className="landing-opening">
      <PosterWall posters={showcase?.wall ?? []} crowd={crowd} />
      <div className="landing-opening__veil" aria-hidden />
      <div className="landing-opening__text">
        <h1 className="landing-opening__title">
          Ne rate plus jamais un
          <br />
          <span className="landing-opening__accent">bon</span> festival
          <span className="landing-opening__accent">.</span>
        </h1>
        <p className="landing-opening__lead">
          Fellowship te montre où vont les exposants que tu connais et ce qu’ils pensent de chaque
          festival. Il tient aussi ta saison à ta place : dossiers, paiements, calendrier.
        </p>
        <LandingSearch />
        {showcase?.exhibitors ? (
          <p className="landing-proof">
            {showcase.faces.length > 0 && (
              <span className="landing-proof__faces" aria-hidden>
                {showcase.faces.map((url) => (
                  <img
                    key={url}
                    className="landing-proof__face"
                    src={posterThumb(url, 96)}
                    alt=""
                  />
                ))}
              </span>
            )}
            {showcase.exhibitors.toLocaleString('fr-FR')} exposants y tiennent déjà leur saison
          </p>
        ) : null}
        <p className="landing-opening__maker">
          Conçu par Runes de Chêne, exposants sur les marchés chaque saison.
        </p>
      </div>
    </div>
  )
}
