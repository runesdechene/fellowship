import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'

/**
 * Nudge d'upgrade affiché sur la vitrine d'un propriétaire NON certifié (cf. décision 0004).
 * Le manque doit se voir : c'est le déclencheur d'abonnement. Invisible pour les visiteurs
 * externes et pour les comptes déjà certifiés (la condition vit dans PublicProfilePage).
 */
export function VitrineCertifyNudge() {
  return (
    <div className="v-certify">
      <span className="v-certify-ic"><Star fill="currentColor" strokeWidth={0} /></span>
      <div className="v-certify-txt">
        <strong>Passez Pro pour certifier votre compte</strong>
        <span>Un badge visible sur votre vitrine, signe de sérieux pour les organisateurs.</span>
      </div>
      <Link to="/boutique" className="v-btn v-btn-p v-certify-cta">Voir le Pro</Link>
    </div>
  )
}
