import { useState } from 'react'
import { Loader2, Check, Lock, Gift } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { startCheckout, type BillingInterval } from '@/lib/stripe-client'
import type { EntityRow } from '@/types/database'
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
  const { currentActor, currentActorRow, entities } = useAuth()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState<BillingInterval | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Cible de souscription : par défaut l'acteur actif s'il est entité,
  // sinon override via ?entity=<actor_id> (depuis Settings multi-entités).
  const overrideEntityId = params.get('entity')
  const overrideEntity = overrideEntityId
    ? entities.find(e => e.actor_id === overrideEntityId) ?? null
    : null
  const targetEntity: EntityRow | null = overrideEntity
    ?? (currentActor?.kind === 'entity' ? (currentActorRow as EntityRow) : null)
  const targetEntityId = targetEntity?.actor_id ?? null
  const targetPlan = targetEntity?.plan ?? null
  const isProTarget = targetPlan === 'pro'

  const handleClick = async (interval: BillingInterval) => {
    if (!targetEntityId) return
    setError(null)
    setLoading(interval)
    try {
      await startCheckout(targetEntityId, interval)
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
        <div className="boutique-trial-badge">
          <Gift strokeWidth={2} /> 14 jours d'essai gratuits — annule à tout moment
        </div>
      </header>

      {!targetEntity && (
        <div className="boutique-notice">
          Sélectionne ton entité exposant dans la navbar pour t'abonner à Pro.
        </div>
      )}

      {targetEntity && overrideEntity && (
        <div className="boutique-notice">
          Tu abonnes <strong>{overrideEntity.brand_name}</strong>{currentActor?.kind === 'entity' && currentActor.id !== overrideEntity.actor_id ? ' (pas ton entité active)' : ''}.
        </div>
      )}

      {isProTarget && (
        <div className="boutique-already-pro">
          ✓ {targetEntity?.brand_name ?? 'Cette entité'} est déjà Pro.{' '}
          <Link to={`/abonnement${overrideEntityId ? `?entity=${overrideEntityId}` : ''}`}>Gérer l'abonnement →</Link>
        </div>
      )}

      {error && <div className="boutique-error">{error}</div>}

      <div className="boutique-plans">
        <PlanCard
          title="Mensuel"
          priceHT="11,99 € HT"
          period="par mois"
          subline="Premium flexibilité"
          trialNote="14j d'essai gratuit, puis 11,99 € HT/mois"
          loading={loading === 'month'}
          disabled={!targetEntity || isProTarget || loading !== null}
          onClick={() => handleClick('month')}
        />
        <PlanCard
          title="Annuel"
          priceHT="9,99 € HT"
          period="par mois"
          subline="Facturé 119,88 € HT/an · économise 17 %"
          trialNote="14j d'essai gratuit, puis 119,88 € HT/an"
          highlight
          loading={loading === 'year'}
          disabled={!targetEntity || isProTarget || loading !== null}
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
  trialNote: string
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
        {p.loading ? 'Redirection…' : 'Démarrer mon essai gratuit'}
      </button>
      <p className="boutique-plan-trial">{p.trialNote}</p>
    </div>
  )
}
