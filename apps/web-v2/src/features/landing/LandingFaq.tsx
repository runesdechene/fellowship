/**
 * QUOI     — la FAQ de la landing, sous l'appel final : les questions s'ouvrent une à une.
 * POURQUOI — Uriel, 25/10/2026 (maquette 2550:233) : écrites comme les exposants les tapent dans
 *            un moteur de recherche, éditées depuis /admin/faq (useFaq). `<details>` garde la
 *            réponse dans la page même fermée : les moteurs la lisent.
 * ATTENTION — sans question à afficher (ou si la lecture rate), la FAQ ne s'affiche pas.
 */
import { Plus } from 'lucide-react'
import { useFaq } from './useFaq'

export function LandingFaq() {
  const questions = useFaq()
  if (questions.length === 0) return null
  return (
    <section className="landing-faq" aria-label="Questions fréquentes">
      {questions.map(({ id, question, answer }, index) => (
        <details key={id} className="landing-faq__item" open={index === 0}>
          <summary className="landing-faq__question">
            {question}
            <Plus className="landing-faq__sign" size={18} strokeWidth={1.8} aria-hidden />
          </summary>
          <p className="landing-faq__answer">{answer}</p>
        </details>
      ))}
    </section>
  )
}
