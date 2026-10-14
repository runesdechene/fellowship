/**
 * QUOI     — la bande Pro, sur la terre : le grand paragraphe, « Gratuit » et le prix du Pro côte
 *            à côte, chacun avec ses avantages, deux appels, et l'écran « Pour toi ».
 * POURQUOI — maquette 2290:2 (bande 2302:2, texte 2290:1322) ; le gratuit se lit d'abord, pour que
 *            personne ne croie l'application payante (Uriel, 14/10/2026).
 * ATTENTION — le prix vient de lib/pricing.ts : toujours celui que Stripe facture.
 */
import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Showcase } from '@/lib/landing'
import { formatPrice } from '@/lib/money'
import { PRICES } from '@/lib/pricing'
import { LandingBand } from './LandingBand'
import { ForYouScreen } from './screens/ForYouScreen'

/** Ce que donne le gratuit, puis ce que le Pro ajoute : résumés de la page /pro (PlanCard.tsx). */
const FREE = [
  'Ton calendrier et tes dossiers sur 6 mois',
  'L’Explorer sur tes 6 prochains mois',
  'Tes amis, l’activité du réseau et la communauté',
  'Les notes, les avis et les questions sur chaque festival',
  'Ta vitrine, à intégrer sur ton site',
]

const PRO_ADDS = [
  'Toute l’année, pas seulement 6 mois',
  'Un rappel avant chaque clôture de candidature',
  'L’alerte de chaque nouvelle édition',
  'Des festivals trouvés pour toi',
  'Tes objectifs de chiffre d’affaires et tes bilans',
  'Le badge Certifié sur ta vitrine',
]

function Advantages({ items }: { items: string[] }) {
  return (
    <ul className="landing-pro__adds">
      {items.map((item) => (
        <li key={item}>
          <Check size={15} strokeWidth={2.4} aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  )
}

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
          <strong>Quand tu veux voir encore plus loin.</strong> Toute ton année d’un coup d’œil, et
          Fellowship qui guette les dates pour toi.
        </p>
        <div className="landing-pro__offers">
          <div>
            <p className="landing-pro__big">Gratuit</p>
            <p className="landing-pro__label">Pour l’exposant classique</p>
            <p className="landing-pro__note">Sans carte bancaire, sans limite de durée.</p>
            <Advantages items={FREE} />
          </div>
          <div>
            <p className="landing-pro__big">{formatPrice(PRICES.monthly)}</p>
            <p className="landing-pro__label">Le Pro, HT par mois</p>
            <p className="landing-pro__note">
              Ou {formatPrice(PRICES.yearly)} par an. 14 jours d’essai, annulable en un clic.
            </p>
            <Advantages items={PRO_ADDS} />
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
