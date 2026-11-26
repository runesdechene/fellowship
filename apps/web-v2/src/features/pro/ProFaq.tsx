/**
 * QUOI     — les questions fréquentes de l'offre.
 * POURQUOI — maquette « Offre Pro ». La FAQ ne promet rien que l'app ne fasse : pas de rappel
 *            avant la fin de l'essai, puisque rien ne l'envoie (décision du 08/10/2026).
 */
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
