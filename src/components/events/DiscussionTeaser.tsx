import { Sparkles, MessageSquare, HelpCircle, Handshake } from 'lucide-react'

/**
 * Placeholder « bientôt » de la carte « Discussion du festival ».
 * Visuel non-interactif (inert) : 2 onglets (Questions / Rencontres) + aperçu flouté.
 * Le vrai sous-système (Q&R inter-éditions + Rencontres) fera l'objet de sa propre spec.
 */
export function DiscussionTeaser() {
  return (
    <div className="fest-discussion">
      <div className="event-section-title">
        <MessageSquare strokeWidth={1.8} />
        Discussion du festival
        <span className="fest-soon-pill">
          <Sparkles strokeWidth={2} /> Bientôt
        </span>
      </div>

      {/* Aperçu non-interactif, sorti du tab order */}
      <div className="fest-discussion-preview" inert>
        <div className="fest-disc-tabs" aria-hidden="true">
          <span className="fest-disc-tab on"><HelpCircle strokeWidth={2} /> Questions</span>
          <span className="fest-disc-tab"><Handshake strokeWidth={2} /> Rencontres</span>
        </div>
        <div className="fest-disc-ghost" />
        <div className="fest-disc-ghost short" />
      </div>

      <p className="fest-discussion-caption">
        La mémoire du festival arrive bientôt — les questions entre exposants et les points de
        rencontre, conservés d'une édition à l'autre.
      </p>
    </div>
  )
}
