/**
 * QUOI     — le gratuit et le Pro côte à côte, avec le choix de la facturation du Pro.
 * POURQUOI — maquette du 26/11/2026 : on doit voir d'un coup d'œil qu'il y a une partie gratuite.
 * ATTENTION — prix et listes viennent de lib/pricing.ts et lib/pro-offer.ts, jamais écrits ici.
 */
import { Check } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { annualSaving, proPriceLines, type Formula } from '@/lib/pricing'
import { FREE, PRO_ADDS } from '@/lib/pro-offer'

const FORMULAS: { formula: Formula; label: string }[] = [
  { formula: 'mensuel', label: 'Mensuel' },
  { formula: 'annuel', label: 'Annuel' },
]
const TRIAL = '14 jours d’essai, annulable en un clic.'

interface PlanProps {
  tone: 'free' | 'pro'
  name: string
  tagline: string
  price: string
  unit: string
  note: string
  cta: { label: string; to: string }
  items: string[]
}

function Plan({ tone, name, tagline, price, unit, note, cta, items }: PlanProps) {
  return (
    <article className={`discover-plan discover-plan--${tone}`}>
      <header>
        <h3>{name}</h3>
        <p className="discover-plan__soft">{tagline}</p>
      </header>
      <div>
        <p className="discover-plan__price">
          <strong>{price}</strong>
          <span className="discover-plan__soft">{unit}</span>
        </p>
        <p className="discover-plan__soft">{note}</p>
      </div>
      <Link className="discover-button discover-plan__cta" to={cta.to}>
        {cta.label}
      </Link>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <Check size={16} strokeWidth={2.4} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </article>
  )
}

export function Pricing() {
  const [formula, setFormula] = useState<Formula>('annuel')
  const pro = proPriceLines(formula)

  return (
    <section id="tarif" className="discover-pricing">
      <h2 className="discover-title">Fellowship est gratuit. Le Pro voit plus loin.</h2>
      <p className="discover-pricing__lead">
        Tu peux tenir ta saison sans jamais payer. Ou investir en toi.
      </p>
      <div className="discover-pricing__billing" role="group" aria-label="Facturation du Pro">
        {FORMULAS.map(({ formula: value, label }) => (
          <button
            key={value}
            type="button"
            className={value === formula ? 'is-on' : undefined}
            aria-pressed={value === formula}
            onClick={() => {
              setFormula(value)
            }}
          >
            {label}
            {value === 'annuel' && <span> -{annualSaving()} %</span>}
          </button>
        ))}
      </div>
      <div className="discover-pricing__plans">
        <Plan
          tone="free"
          name="Gratuit"
          tagline="La base pour tenir ta saison"
          price="0 €"
          unit="pour toujours"
          note="Sans carte bancaire, sans limite de durée."
          cta={{ label: 'Commencer gratuitement', to: '/connexion' }}
          items={FREE}
        />
        <Plan
          tone="pro"
          name="Pro"
          tagline="Pour ne plus rater les bons festivals"
          price={pro.big}
          unit={pro.unit}
          note={formula === 'annuel' ? `${pro.note}. ${TRIAL}` : TRIAL}
          cta={{ label: 'Essayer le Pro 14 jours', to: '/pro' }}
          items={PRO_ADDS}
        />
      </div>
    </section>
  )
}
