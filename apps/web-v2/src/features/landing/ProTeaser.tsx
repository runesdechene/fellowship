/**
 * QUOI     — « Et quand tu veux voir loin. » : le Pro, son prix, « Découvrir le Pro », et trois
 *            notifications dessinées.
 * POURQUOI — maquette 2104:145. Le prix se lit dans lib/pricing.ts, donc c'est toujours celui que
 *            Stripe facture (Uriel, 14/10/2026 : les nouveaux prix viendront avec le changement
 *            Stripe).
 * ATTENTION — jamais de prix en dur ici. L'essai de 14 jours est celui de la fonction
 *            stripe-checkout-session.
 */
import { Link } from 'react-router-dom'
import { ProBadge } from '@/components/ui/ProBadge'
import { formatPrice } from '@/lib/money'
import { PRICES } from '@/lib/pricing'

const NOTES = [
  {
    kicker: 'Nouvelle édition',
    text: 'Les Aventuriales reviennent du 24 au 26 septembre 2027. Tu y étais en 2026.',
  },
  { kicker: 'Clôture', text: 'Plus que 7 jours pour candidater à Plane’R Fest.' },
  { kicker: 'Recherche sauvegardée', text: '2 nouveaux marchés à moins de 100 km de chez toi.' },
]

export function ProTeaser() {
  return (
    <section className="landing-section landing-split landing-split--centered" id="pro">
      <div className="landing-split__text">
        <ProBadge />
        <h2 className="landing-split__title">Et quand tu veux voir loin.</h2>
        <p className="landing-split__lead">
          Toute ton année au-delà de 6 mois, un rappel avant chaque clôture de candidature, et
          l’alerte dès qu’un festival que tu as fait annonce sa nouvelle édition.{' '}
          <strong>Et une myriade d’autres avantages à venir.</strong>
        </p>
        <p className="landing-pro__price">
          <strong>{formatPrice(PRICES.monthly)}</strong> HT / mois · {formatPrice(PRICES.yearly)} HT
          / an · 14 jours d’essai
        </p>
        <Link className="landing-button landing-button--large" to="/pro">
          Découvrir le Pro
        </Link>
      </div>
      <div className="landing-split__cards" aria-hidden>
        {NOTES.map((note) => (
          <div key={note.kicker} className="landing-note">
            <p className="landing-note__kicker">{note.kicker}</p>
            <p className="landing-note__text">{note.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
