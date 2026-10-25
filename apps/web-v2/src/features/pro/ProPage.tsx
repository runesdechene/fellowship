/**
 * QUOI     — /pro, la page de l'offre : l'accroche, la formule (mensuel / annuel), les cartes
 *            Gratuit et Pro, le parrainage, ce qui arrive dans le Pro, la FAQ ; et le bandeau du retour
 *            de Stripe.
 * POURQUOI — toutes les invitations du gratuit mènent ici (maquette « Offre Pro »). La formule vit
 *            dans l'adresse, le retour arrière la suit.
 * ATTENTION — sur téléphone, la carte Pro passe en premier (ordre CSS).
 */
import { useSearchParams } from 'react-router-dom'
import { ProBadge } from '@/components/ui/ProBadge'
import { useAuth } from '@/lib/auth'
import { formatFullDate } from '@/lib/dates'
import { useDeclarePageChrome } from '@/lib/page-chrome'
import { annualSaving, formulaFrom, type Formula } from '@/lib/pricing'
import { billingAction } from '@/lib/plan'
import { usePlan } from '@/lib/usePlan'
import { FreeCard, ProCard } from './PlanCard'
import { ProFaq, ProSoon } from './ProFaq'
import { ReferralCard } from './ReferralCard'
import { useCheckoutReturn, type ReturnState } from './useCheckoutReturn'

/** L'essai dure 14 jours, 30 pour un filleul : la date vient de Stripe, jamais d'un nombre écrit ici.
 *  Elle ne se lit qu'une fois le Pro arrivé : avant, `trial_end` peut être celui d'un ancien essai. */
function bannerText(state: Exclude<ReturnState, 'none'>, trialEnd: string | null): string {
  if (state === 'late')
    return 'Ton paiement est enregistré ; ton compte passe au Pro dans quelques instants. Recharge la page si rien ne change.'
  // Sans essai (un seul par enseigne), `trial_end` est vide ou passé : rien à annoncer.
  return state === 'welcome' && trialEnd && new Date(trialEnd) > new Date()
    ? `Bienvenue dans le Pro. Ton essai court jusqu’au ${formatFullDate(new Date(trialEnd))}.`
    : 'Bienvenue dans le Pro.'
}

function FormulaSwitch({ value, onChange }: { value: Formula; onChange: (next: Formula) => void }) {
  return (
    <div className="formula-switch" role="group" aria-label="Formule">
      {(['mensuel', 'annuel'] as const).map((formula) => (
        <button
          key={formula}
          type="button"
          className={
            formula === value
              ? 'formula-switch__option formula-switch__option--on'
              : 'formula-switch__option'
          }
          aria-pressed={formula === value}
          onClick={() => {
            onChange(formula)
          }}
        >
          {formula === 'mensuel' ? 'Mensuel' : 'Annuel'}
          {formula === 'annuel' && (
            <span className="formula-switch__saving">−{annualSaving()} %</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function ProPage() {
  useDeclarePageChrome({ poster: null, lead: null, back: '/' })
  const [params, setParams] = useSearchParams()
  const formula = formulaFrom(params.get('formule'))
  const { actor, entities } = useAuth()
  const { pro } = usePlan()
  const back = useCheckoutReturn()
  const entity =
    actor?.kind === 'entity' ? (entities.find((row) => row.actor_id === actor.id) ?? null) : null
  const compedUntil =
    entity?.comped_pro_until && new Date(entity.comped_pro_until) > new Date()
      ? entity.comped_pro_until
      : null

  return (
    <div className="pro-page">
      {back !== 'none' && (
        <p className="pro-page__banner" role="status">
          {bannerText(back, entity?.trial_end ?? null)}
        </p>
      )}
      <header className="pro-page__head">
        <ProBadge />
        <h1 className="pro-page__title">Planifie toute ton année.</h1>
        <p className="pro-page__text">
          Les exposants qui anticipent ne ratent ni une clôture de candidature, ni une nouvelle
          édition.
        </p>
        <FormulaSwitch
          value={formula}
          onChange={(next) => {
            // L'autre paramètre (le retour de Stripe) reste : on ne coupe pas sa relecture.
            setParams((current) => {
              const params = new URLSearchParams(current)
              if (next === 'annuel') params.delete('formule')
              else params.set('formule', next)
              return params
            })
          }}
        />
      </header>
      <div className="pro-page__plans">
        <FreeCard current={!pro} />
        <ProCard
          formula={formula}
          pro={pro}
          entityId={entity?.actor_id ?? null}
          action={billingAction(entity)}
          compedUntil={compedUntil}
          settling={back === 'waiting' || back === 'late'}
          trialUsed={Boolean(entity?.stripe_subscription_id)}
        />
      </div>
      {entity && <ReferralCard entityId={entity.actor_id} brandName={entity.brand_name} />}
      <ProSoon />
      <ProFaq />
    </div>
  )
}
