import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Loader2, ExternalLink, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { openCustomerPortal } from '@/lib/stripe-client'
import { ReferralCard } from '@/components/abonnement/ReferralCard'
import type { EntityRow } from '@/types/database'
import './Abonnement.css'

/**
 * Page de gestion de l'abonnement de l'entité active.
 * - Free / canceled / NULL → invite à voir les offres (/boutique).
 * - Trialing → bandeau "Essai gratuit, fin le X" + portail.
 * - Active → état courant + portail.
 * - Past_due → alerte rouge + portail (urgence : mettre à jour CB).
 *
 * Au retour de Checkout (?status=success), poll currentActor le temps que le webhook
 * sync'e entities.subscription_status (le webhook est asynchrone).
 *
 * Spec : docs/superpowers/specs/2026-05-28-stripe-mvp-design.md §4.2-4.3.
 */
export function AbonnementPage() {
  const { currentActor, currentActorRow, entities, refreshProfile } = useAuth()
  const [params] = useSearchParams()
  const [opening, setOpening] = useState(false)
  const [polling, setPolling] = useState(false)
  const [portalErr, setPortalErr] = useState<string | null>(null)

  // Cible : par défaut l'acteur actif (s'il est entité), sinon override via
  // ?entity=<actor_id> (depuis la liste Settings multi-entités).
  const overrideEntityId = params.get('entity')
  const overrideEntity = overrideEntityId
    ? entities.find(e => e.actor_id === overrideEntityId) ?? null
    : null
  const activeEntity = currentActor?.kind === 'entity' ? (currentActorRow as EntityRow | null) : null
  const entity = (overrideEntity ?? activeEntity) as (EntityRow & {
    subscription_status?: string | null
    billing_interval?: string | null
    current_period_end?: string | null
    trial_end?: string | null
    discount_end?: string | null
    discount_label?: string | null
  }) | null
  const targetEntityId = entity?.actor_id ?? null
  const status = entity?.subscription_status ?? null

  // Polling au retour de Checkout : le webhook arrive en async, on attend qu'il
  // ait setté entities.subscription_status avant d'afficher l'état "Pro".
  useEffect(() => {
    if (params.get('status') !== 'success') return
    if (status) return // déjà à jour, pas besoin de poll
    setPolling(true)
    let tries = 0
    const interval = setInterval(async () => {
      tries++
      await refreshProfile()
      if (tries >= 5) {
        clearInterval(interval)
        setPolling(false)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [params, status, refreshProfile])

  // Aucune entité à afficher : ni override, ni acteur actif type entité.
  if (!targetEntityId) {
    return (
      <div className="abo-page">
        <h1>Mon abonnement</h1>
        <p className="abo-muted">Sélectionne ton entité exposant dans la navbar pour gérer son abonnement, ou choisis-la depuis <Link to="/reglages">tes réglages</Link>.</p>
      </div>
    )
  }

  const handlePortal = async () => {
    setPortalErr(null)
    setOpening(true)
    try {
      await openCustomerPortal(targetEntityId)
    } catch (e) {
      console.error('[Abonnement] portal failed', e)
      setPortalErr("Impossible d'ouvrir le portail. Réessaie dans un instant.")
      setOpening(false)
    }
  }

  // Aucun abonnement actif → CTA boutique.
  if (!status || status === 'canceled' || status === 'incomplete_expired' || status === 'unpaid') {
    return (
      <div className="abo-page">
        <h1>Mon abonnement</h1>
        {params.get('status') === 'success' && polling && (
          <div className="abo-pending">
            <Loader2 className="animate-spin" /> Confirmation de ton paiement en cours…
          </div>
        )}
        {!polling && (
          <>
            <p className="abo-muted">Pas d'abonnement actif sur {overrideEntity?.brand_name ? <strong>{overrideEntity.brand_name}</strong> : 'cette entité'}.</p>
            <Link to={overrideEntityId ? `/boutique?entity=${overrideEntityId}` : '/boutique'} className="abo-cta">Voir les offres Pro</Link>
            {/* Parrainage visible AUSSI pour les entités gratuites (cible #1 : le parrain gratuit
                qui goûte au Pro). Sans ça, le bandeau du quota renverrait vers un cul-de-sac. */}
            {targetEntityId && <ReferralCard entityId={targetEntityId} brandName={entity?.brand_name ?? null} />}
          </>
        )}
      </div>
    )
  }

  const trialEnd = entity?.trial_end ? new Date(entity.trial_end) : null
  const periodEnd = entity?.current_period_end ? new Date(entity.current_period_end) : null
  const interval = entity?.billing_interval
  // Code promo actif (ex: GUILDEDESVOYAGEURS). discount_end = quand le coupon expire,
  // après quoi la facturation pleine reprend. On affiche un bandeau dédié et on cache
  // le bullet "tu seras prélevé" car trompeur tant que le coupon couvre.
  const discountEnd = entity?.discount_end ? new Date(entity.discount_end) : null
  const discountLabel = entity?.discount_label ?? null
  const discountActive = discountEnd !== null && discountEnd > new Date()
  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="abo-page">
      <h1>Mon abonnement</h1>

      {status === 'past_due' && (
        <div className="abo-warning">
          <AlertTriangle strokeWidth={2} />
          <span>
            <strong>Paiement échoué.</strong> Mets à jour ton mode de paiement pour ne pas perdre ton accès Pro.
          </span>
        </div>
      )}

      {discountActive && (
        <div className="abo-card abo-promo">
          <h2>🎁 Code promo actif</h2>
          <p>
            <strong>{discountLabel ?? 'Code promo'}</strong> appliqué — gratuit jusqu'au{' '}
            <strong>{discountEnd && formatDate(discountEnd)}</strong>.
          </p>
          <p className="abo-muted">
            Aucun débit avant cette date. Après, ta facturation normale reprend
            ({interval === 'year' ? '9,99 € HT/mois en annuel' : '11,99 € HT/mois'}).
          </p>
        </div>
      )}

      {status === 'trialing' && (
        <div className="abo-card">
          <h2>Essai gratuit Pro</h2>
          <p>
            Ton essai se termine le <strong>{trialEnd && formatDate(trialEnd)}</strong>.
          </p>
          {!discountActive && (
            <p className="abo-muted">
              Tu seras prélevé de {interval === 'year' ? '119,88 € HT/an' : '11,99 € HT/mois'} à cette date.
              Annule avant pour ne pas être débité.
            </p>
          )}
        </div>
      )}

      {status === 'active' && (
        <div className="abo-card">
          <h2>Plan Pro {interval === 'year' ? 'annuel' : 'mensuel'}</h2>
          <p>
            Facturé <strong>{interval === 'year' ? '9,99 € HT/mois (119,88 € HT/an)' : '11,99 € HT/mois'}</strong>.
          </p>
          {periodEnd && !discountActive && (
            <p className="abo-muted">
              Prochain renouvellement le {formatDate(periodEnd)}.
            </p>
          )}
        </div>
      )}

      {portalErr && <div className="abo-warning">{portalErr}</div>}

      {targetEntityId && <ReferralCard entityId={targetEntityId} brandName={entity?.brand_name ?? null} />}

      <button onClick={handlePortal} disabled={opening} className="abo-manage">
        {opening ? <Loader2 className="animate-spin" /> : <ExternalLink strokeWidth={2} />}
        {opening ? 'Redirection…' : 'Gérer mon abonnement (factures, CB, résiliation)'}
      </button>
    </div>
  )
}
