/**
 * QUOI     — la fin de la landing, sur la bande nuit : « Ton prochain stand commence ici. », le
 *            bouton « Créer ma vitrine », puis le pied de page (marque, liens, Runes de Chêne).
 * POURQUOI — maquette 2290:2 (nœuds 2290:1674 et 2298:2). Le dernier appel porte le dégradé du
 *            logo : l'exception propre à la landing (docs/v2/DESIGN-SYSTEM.md).
 * ATTENTION — les pages légales vivent dans la V1 : liens pleins, hors du routeur de la V2.
 */
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LandingBand } from './LandingBand'

export function FinalCall({ posters }: { posters: string[] }) {
  return (
    <LandingBand tone="night" slant="rise" posters={posters} className="landing-end">
      <div className="landing-final">
        <h2 className="landing-final__title">Ton prochain stand commence ici.</h2>
        <p className="landing-final__lead">
          Crée ta vitrine en deux minutes. Gratuit, sans carte bancaire.
        </p>
        <Link className="landing-button landing-button--brand" to="/connexion">
          Créer ma vitrine
          <ArrowRight size={18} strokeWidth={2} aria-hidden />
        </Link>
      </div>
      <footer className="landing-foot">
        <div className="landing-foot__top">
          <div className="landing-foot__brand">
            <p className="landing-foot__name">
              <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" />
              Fellowship
            </p>
            <p>
              Le calendrier communautaire
              <br />
              des exposants de festivals.
            </p>
          </div>
          <nav className="landing-foot__links" aria-label="Plan du site">
            <div>
              <p className="landing-foot__head">L’application</p>
              <Link to="/connexion">Explorer</Link>
              <Link to="/connexion">Calendrier</Link>
              <Link to="/pro">Le Pro</Link>
            </div>
            <div>
              <p className="landing-foot__head">Fellowship</p>
              <a href="#assistant">Pourquoi Fellowship</a>
              <a href="mailto:appfellowship@pm.me">Organisateurs</a>
              <a href="mailto:appfellowship@pm.me">Contact</a>
            </div>
            <div>
              <p className="landing-foot__head">Informations</p>
              <a href="/legal/cgu">CGU</a>
              <a href="/legal/confidentialite">Confidentialité</a>
            </div>
          </nav>
        </div>
        <div className="landing-foot__bottom">
          <a className="landing-foot__rdc" href="https://runesdechene.com">
            <img
              src={`${import.meta.env.BASE_URL}runes-de-chene.png`}
              alt=""
              width={22}
              height={22}
            />
            Propulsé par Runes de Chêne — Portez l’Histoire
          </a>
          <p>© 2026 Fellowship</p>
        </div>
      </footer>
    </LandingBand>
  )
}
