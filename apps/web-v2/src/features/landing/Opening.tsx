/**
 * QUOI     — l'ouverture de la landing : « Mon assistant de festivals. Ma communauté
 *            d'exposants. », la promesse, la recherche, la preuve, et le mur d'affiches.
 * POURQUOI — maquette 2290:2 (nœud 2290:3) ; positionnement du 14/10/2026 : l'outil d'abord, les
 *            gens ensuite. Le nombre d'exposants et les visages (de vrais avatars) sont lus en base.
 * ATTENTION — la recherche mène aux résultats publics, /festivals (lot 11b).
 */
import { posterThumb, type Showcase } from '@/lib/landing'
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
          Mon assistant de festivals.
          <br />
          Ma communauté d’exposants.
        </h1>
        <p className="landing-opening__lead">
          Trouve tes dates en voyant où vont tes amis, suis tes dossiers et tes paiements, et
          synchronise ton calendrier sur ton site, gratuitement.
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
      </div>
    </div>
  )
}
