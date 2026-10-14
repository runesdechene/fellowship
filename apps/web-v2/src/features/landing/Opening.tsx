/**
 * QUOI     — l'ouverture de la landing : la barre, « Mon assistant de festivals. Ma communauté
 *            d'exposants. », la promesse, la recherche, la preuve, et le mur d'affiches.
 * POURQUOI — maquette 2290:2 (nœud 2290:3) ; positionnement du 14/10/2026 : l'outil d'abord, les
 *            gens ensuite. Le nombre d'exposants est lu en base ; les visages sont de démonstration.
 * ATTENTION — jusqu'à l'annuaire public (lot 11b), la recherche mène à la connexion.
 */
import { Search } from 'lucide-react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Showcase } from '@/lib/landing'
import { DEMO } from '@/lib/landing-demo'
import { LandingTopBar } from './LandingTopBar'
import { PosterWall } from './PosterWall'

export function Opening({ showcase }: { showcase: Showcase | null }) {
  const navigate = useNavigate()
  function toLogin(event?: FormEvent) {
    event?.preventDefault()
    void navigate('/connexion')
  }
  const crowd = showcase?.crowd
    ? { poster: showcase.crowd.event.imageUrl, count: showcase.crowd.count }
    : null

  return (
    <div className="landing-opening">
      <PosterWall posters={showcase?.wall ?? []} crowd={crowd} />
      <div className="landing-opening__veil" aria-hidden />
      <LandingTopBar />
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
        <form className="landing-search" role="search" onSubmit={toLogin}>
          <label className="landing-search__field landing-search__field--what">
            <span className="landing-search__label">Rechercher</span>
            <input className="landing-search__value" placeholder="Un festival, une ville…" />
          </label>
          <button
            type="button"
            className="landing-search__field landing-search__field--where"
            onClick={() => {
              toLogin()
            }}
          >
            <span className="landing-search__label">Où</span>
            <span className="landing-search__value">Toute la France</span>
          </button>
          <button
            type="button"
            className="landing-search__field landing-search__field--when"
            onClick={() => {
              toLogin()
            }}
          >
            <span className="landing-search__label">Quand</span>
            <span className="landing-search__value">Les 12 prochains mois</span>
          </button>
          <button type="submit" className="landing-search__submit" aria-label="Rechercher">
            <Search size={18} strokeWidth={2.2} />
          </button>
        </form>
        {showcase?.exhibitors ? (
          <p className="landing-proof">
            <span className="landing-proof__faces" aria-hidden>
              {DEMO.faces.map((initial) => (
                <span key={initial} className="landing-proof__face">
                  {initial}
                </span>
              ))}
            </span>
            {showcase.exhibitors.toLocaleString('fr-FR')} exposants y tiennent déjà leur saison
          </p>
        ) : null}
      </div>
    </div>
  )
}
