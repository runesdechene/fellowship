/**
 * QUOI     — la bande Pro, sur la terre : le grand paragraphe, « Gratuit » et le prix du Pro côte
 *            à côte, deux appels, et l'écran « Pour toi ».
 * POURQUOI — maquette 2290:2 (bande 2302:2, texte 2290:1322) ; le gratuit se lit d'abord, pour que
 *            personne ne croie l'application payante (Uriel, 14/10/2026).
 * ATTENTION — le prix vient de lib/pricing.ts : toujours celui que Stripe facture.
 */
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Showcase } from '@/lib/landing'
import { formatPrice } from '@/lib/money'
import { PRICES } from '@/lib/pricing'
import { LandingBand } from './LandingBand'
import { ForYouScreen } from './screens/ForYouScreen'

export function ProBand({ showcase }: { showcase: Showcase | null }) {
  return (
    <LandingBand
      tone="earth"
      slant="fall"
      id="pro"
      posters={showcase?.wall}
      className="landing-pro"
    >
      <div className="landing-pro__text">
        <p className="landing-statement">
          <strong>Quand tu veux voir encore plus loin.</strong> Des recommandations personnalisées,
          un rappel avant chaque clôture, et l’alerte de chaque nouvelle édition.
        </p>
        <div className="landing-pro__offers">
          <div>
            <p className="landing-pro__big">Gratuit</p>
            <p className="landing-pro__label">Pour l’exposant classique</p>
            <p className="landing-pro__note">
              Ton calendrier, tes dossiers, ta communauté. Sans carte bancaire.
            </p>
          </div>
          <div>
            <p className="landing-pro__big">{formatPrice(PRICES.monthly)}</p>
            <p className="landing-pro__label">Le Pro, HT par mois</p>
            <p className="landing-pro__note">
              Ou {formatPrice(PRICES.yearly)} par an. 14 jours d’essai, annulable en un clic.
            </p>
          </div>
        </div>
        <div className="landing-pro__ctas">
          <Link
            className="landing-button landing-button--pill landing-button--cream"
            to="/connexion"
          >
            Créer ma vitrine
            <ArrowRight size={17} strokeWidth={2} aria-hidden />
          </Link>
          <Link className="landing-pro__more" to="/pro">
            Découvrir le Pro
            <ArrowRight size={17} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </div>
      {showcase && showcase.dossiers.length > 0 && <ForYouScreen showcase={showcase} />}
    </LandingBand>
  )
}
