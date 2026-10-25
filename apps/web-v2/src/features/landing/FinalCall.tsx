/**
 * QUOI     — la fin de la landing, sur la bande nuit : « Ton prochain stand commence ici. », le
 *            bouton « Commencer gratuitement », la FAQ (LandingFaq), puis le pied de page (LandingFoot), l'encadré des
 *            organisateurs en tête.
 * POURQUOI — maquette 2290:2 (nœuds 2290:1674 et 2298:2). Le dernier appel porte le dégradé du
 *            logo : l'exception propre à la landing (docs/v2/DESIGN-SYSTEM.md).
 */
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LandingBand } from './LandingBand'
import { LandingFaq } from './LandingFaq'
import { LandingFoot } from './LandingFoot'
import { OrganizersBox } from './OrganizersBox'

export function FinalCall({ posters }: { posters: string[] }) {
  return (
    <LandingBand tone="night" slant="rise" posters={posters} className="landing-end">
      <div className="landing-final">
        <h2 className="landing-final__title">Ton prochain stand commence ici.</h2>
        <p className="landing-final__lead">
          Ta saison démarre en deux minutes. Gratuit, sans carte bancaire.
        </p>
        <Link className="landing-button landing-button--brand" to="/connexion">
          Commencer gratuitement
          <ArrowRight size={18} strokeWidth={2} aria-hidden />
        </Link>
        <LandingFaq />
      </div>
      <LandingFoot>
        <OrganizersBox />
      </LandingFoot>
    </LandingBand>
  )
}
