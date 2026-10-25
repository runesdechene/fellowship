/**
 * QUOI     — la FAQ de la landing, sous l'appel final : neuf questions qui s'ouvrent une à une.
 * POURQUOI — Uriel, 25/10/2026 (maquette 2550:233) : écrites comme les exposants les tapent dans
 *            un moteur de recherche. `<details>` garde la réponse dans la page même fermée : les
 *            moteurs la lisent.
 * ATTENTION — chaque réponse dit ce que l'app fait aujourd'hui : un prix ou une fonction qui change
 *            se corrige ici aussi.
 */
import { Plus } from 'lucide-react'

const QUESTIONS = [
  {
    q: 'Comment trouver des festivals et des marchés où exposer ?',
    a: 'Avec l’Explorer : toutes les dates par région, par catégorie et par mois, avec les avis des exposants qui y sont allés.',
  },
  {
    q: 'Comment Fellowship me relie à mes pairs ?',
    a: 'Tu suis les exposants que tu croises, tu vois sur quels festivals ils vont, et tu poses tes questions sur chaque festival à ceux qui y sont allés.',
  },
  {
    q: 'Fellowship est-il gratuit ?',
    a: 'Oui. L’Explorer et ton calendrier sur six mois, la communauté et ta vitrine sont gratuits, sans carte bancaire. Le Pro ouvre toute l’année.',
  },
  {
    q: 'Combien coûte le Pro ?',
    a: '9,99 € HT par mois à l’année, ou 11,99 € HT au mois. Les 14 premiers jours sont offerts, et tu arrêtes quand tu veux.',
  },
  {
    q: 'Comment ne plus rater une date de candidature ?',
    a: 'Le Pro te prévient avant chaque clôture, et dès qu’un festival que tu as fait annonce sa nouvelle édition.',
  },
  {
    q: 'Mes chiffres et mes bilans sont-ils privés ?',
    a: 'Oui. Ils ne sont visibles que par toi : ni les autres exposants, ni les organisateurs, ni l’équipe n’y ont accès.',
  },
  {
    q: 'J’organise un festival, puis-je l’ajouter ?',
    a: 'Oui, gratuitement : « Ajouter une date », et ton festival apparaît dans l’Explorer.',
  },
  {
    q: 'Fellowship marche-t-il sur téléphone ?',
    a: 'Oui. Il s’ouvre dans le navigateur et s’installe sur ton écran d’accueil comme une application.',
  },
  {
    q: 'Qui a créé Fellowship ?',
    a: 'Uriel Lahoussaye, exposant et fondateur de la marque Runes de Chêne. Fellowship est né sur ses stands, d’une saison qui tenait sur des post‑it et un tableau Excel.',
  },
] as const

export function LandingFaq() {
  return (
    <section className="landing-faq" aria-label="Questions fréquentes">
      {QUESTIONS.map(({ q, a }, index) => (
        <details key={q} className="landing-faq__item" open={index === 0}>
          <summary className="landing-faq__question">
            {q}
            <Plus className="landing-faq__sign" size={18} strokeWidth={1.8} aria-hidden />
          </summary>
          <p className="landing-faq__answer">{a}</p>
        </details>
      ))}
    </section>
  )
}
