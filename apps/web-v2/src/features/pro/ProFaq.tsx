/**
 * QUOI     — « Le coût de la route · Bientôt » et les questions fréquentes de l'offre.
 * POURQUOI — maquette « Offre Pro ». La FAQ ne promet rien que l'app ne fasse : pas de rappel
 *            avant la fin de l'essai, puisque rien ne l'envoie (décision du 08/10/2026).
 */
import { Car } from 'lucide-react'

const QUESTIONS = [
  {
    q: 'Puis-je arrêter quand je veux ?',
    a: 'Oui. Tu gardes le Pro jusqu’à la fin de la période payée, puis ton compte repasse en gratuit sans rien perdre de tes dates.',
  },
  {
    q: 'Mes bilans sont-ils vraiment privés ?',
    a: 'Oui. Ils ne sont visibles que par toi : ni les autres exposants, ni les organisateurs, ni nos administrateurs n’y ont accès.',
  },
  {
    q: 'Que se passe-t-il après les 14 jours d’essai ?',
    a: 'L’abonnement démarre à la fin de l’essai ; tu peux l’annuler en un clic avant.',
  },
]

export function ProSoon() {
  return (
    <aside className="pro-soon">
      <span className="pro-soon__icon">
        <Car size={18} strokeWidth={1.8} />
      </span>
      <span className="pro-soon__text">
        <span className="pro-soon__title">
          Le coût de la route <span className="pro-soon__badge">Bientôt</span>
        </span>
        <span className="pro-soon__body">
          Avant d’y aller, sache ce que te coûte un festival selon ton véhicule : carburant, péages,
          nuits.
        </span>
      </span>
    </aside>
  )
}

export function ProFaq() {
  return (
    <section className="pro-faq">
      <h2 className="pro-faq__title">Questions fréquentes</h2>
      {QUESTIONS.map(({ q, a }) => (
        <div key={q} className="pro-faq__item">
          <h3 className="pro-faq__question">{q}</h3>
          <p className="pro-faq__answer">{a}</p>
        </div>
      ))}
    </section>
  )
}
