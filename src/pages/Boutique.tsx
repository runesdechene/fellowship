import { useState } from 'react'
import { Loader2, Check, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { planForActor } from '@/lib/navModel'
import { startCheckout, type BillingInterval } from '@/lib/stripe-client'
import './Boutique.css'

const FEATURES = [
  'Calendrier saison année complète',
  'Communauté — fil complet du réseau',
  'Tableau de bord (cockpit pilotage)',
  'Avis détaillés sur tes festivals',
  'Embed calendrier sur ton site',
  '14 jours d\'essai — annulable à tout moment',
]

export function BoutiquePage() {
  const { currentActor, currentActorRow } = useAuth()
  const [loading, setLoading] = useState<BillingInterval | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isEntity = currentActor?.kind === 'entity'
  const isPro = planForActor(currentActor, currentActorRow) === 'pro'

  const handleClick = async (interval: BillingInterval) => {
    if (!currentActor || !isEntity) return
    setError(null)
    setLoading(interval)
    try {
      await startCheckout(currentActor.id, interval)
      // navigate: window.location.href dans startCheckout, on n'arrive jamais ici.
    } catch (e) {
      console.error('[Boutique] checkout failed', e)
      setError("Impossible de démarrer le paiement. Réessaie dans un instant.")
      setLoading(null)
    }
  }

  return (
    <div className="boutique-page">
      <header className="boutique-hero">
        <h1>Passer en Pro</h1>
        <p className="boutique-tagline">Pour vivre de ton art.</p>
      </header>

      {!isEntity && (
        <div className="boutique-notice">
          Sélectionne ton entité exposant dans la navbar pour t'abonner à Pro.
        </div>
      )}

      {isPro && (
        <div className="boutique-already-pro">
          ✓ Tu es déjà Pro. <Link to="/abonnement">Gérer mon abonnement →</Link>
        </div>
      )}

      {error && <div className="boutique-error">{error}</div>}

      <div className="boutique-plans">
        <PlanCard
          title="Mensuel"
          priceHT="11,99 € HT"
          period="par mois"
          subline="Premium flexibilité"
          loading={loading === 'month'}
          disabled={!isEntity || isPro || loading !== null}
          onClick={() => handleClick('month')}
        />
        <PlanCard
          title="Annuel"
          priceHT="9,99 € HT"
          period="par mois"
          subline="Facturé 119,88 € HT/an · économise 17 %"
          highlight
          loading={loading === 'year'}
          disabled={!isEntity || isPro || loading !== null}
          onClick={() => handleClick('year')}
        />
      </div>

      <ul className="boutique-features">
        {FEATURES.map(f => (
          <li key={f}><Check strokeWidth={2} /> {f}</li>
        ))}
      </ul>

      <p className="boutique-footnote">
        Essai gratuit 14 jours · TVA en sus calculée au paiement selon ton pays · résiliable à tout moment depuis « Mon abonnement ».
        Voir nos <Link to="/legal/cgv">CGV</Link>.
      </p>
    </div>
  )
}

interface PlanCardProps {
  title: string
  priceHT: string
  period: string
  subline: string
  highlight?: boolean
  loading: boolean
  disabled: boolean
  onClick: () => void
}

function PlanCard(p: PlanCardProps) {
  return (
    <div className={`boutique-plan ${p.highlight ? 'highlight' : ''}`}>
      {p.highlight && <span className="boutique-plan-badge">Le plus choisi</span>}
      <h2>{p.title}</h2>
      <div className="boutique-price">
        <span className="boutique-price-amount">{p.priceHT}</span>
        <span className="boutique-price-period">{p.period}</span>
      </div>
      <p className="boutique-plan-subline">{p.subline}</p>
      <button
        onClick={p.onClick}
        disabled={p.disabled}
        className="boutique-cta"
        aria-busy={p.loading}
      >
        {p.loading ? <Loader2 className="animate-spin" /> : p.disabled && !p.loading ? <Lock strokeWidth={1.5} /> : null}
        {p.loading ? 'Redirection…' : 'Choisir'}
      </button>
    </div>
  )
}
