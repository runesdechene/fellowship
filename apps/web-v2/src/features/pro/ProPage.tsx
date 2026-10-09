/**
 * QUOI     — /pro, la page de l'offre : l'accroche, la formule (mensuel / annuel), les cartes
 *            Gratuit et Pro, « Le coût de la route », la FAQ ; et le bandeau du retour de Stripe.
 * POURQUOI — toutes les invitations du gratuit mènent ici (maquette « Offre Pro »). La formule vit
 *            dans l'adresse, le retour arrière la suit.
 * ATTENTION — sur téléphone, la carte Pro passe en premier (ordre CSS).
 */
import { useSearchParams } from 'react-router-dom'
import { ProBadge } from '@/components/ui/ProBadge'
import { useAuth } from '@/lib/auth'
import { useDeclarePageChrome } from '@/lib/page-chrome'
import { annualSaving, formulaFrom, type Formula } from '@/lib/pricing'
import { usePlan } from '@/lib/usePlan'
import { FreeCard, ProCard } from './PlanCard'
import { ProFaq, ProSoon } from './ProFaq'
import { useCheckoutReturn, type ReturnState } from './useCheckoutReturn'

const BANNER: Record<Exclude<ReturnState, 'none'>, string> = {
  waiting: 'Bienvenue dans le Pro. Ton essai de 14 jours commence.',
  welcome: 'Bienvenue dans le Pro. Ton essai de 14 jours commence.',
  late: 'Ton paiement est enregistré ; ton compte passe au Pro dans quelques instants.',
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
  const { actor } = useAuth()
  const { pro } = usePlan()
  const back = useCheckoutReturn()
  const entityId = actor?.kind === 'entity' ? actor.id : null

  return (
    <div className="pro-page">
      {back !== 'none' && (
        <p className="pro-page__banner" role="status">
          {BANNER[back]}
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
            setParams(next === 'annuel' ? {} : { formule: next })
          }}
        />
      </header>
      <div className="pro-page__plans">
        <FreeCard current={!pro} />
        <ProCard formula={formula} pro={pro} entityId={entityId} />
      </div>
      <ProSoon />
      <ProFaq />
    </div>
  )
}
