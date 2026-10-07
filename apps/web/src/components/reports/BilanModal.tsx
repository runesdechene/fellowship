import { useState } from 'react'
import { X, Lock } from 'lucide-react'
import { EventReportForm } from './EventReportForm'
import { ReviewModal } from '@/components/reviews/ReviewModal'

interface Props {
  eventId: string
  onClose: () => void
  /** Appelé quand le bilan vient d'être sauvegardé — le parent doit refetch ses données. */
  onSaved?: () => void
}

/**
 * Modale plein écran qui wrappe l'EventReportForm. Après save du bilan (privé),
 * on enchaîne sur la modale d'avis (publique) — deux étapes distinctes pour ne
 * pas mélanger privé/public. La fermeture de l'avis termine le flux.
 */
export function BilanModal({ eventId, onClose, onSaved }: Props) {
  const [showReview, setShowReview] = useState(false)

  // Étape 2 : avis public (sans cadenas, rappel public porté par ReviewModal).
  // BilanCard (parent) n'est montée par EventPage que si participation.status
  // === 'inscrit' (présence acquise) : invariant garanti à ce stade du flux.
  if (showReview) {
    return (
      <ReviewModal
        eventId={eventId}
        participationStatus="inscrit"
        onClose={() => { onSaved?.(); onClose() }}
        onSubmitted={() => {}}
      />
    )
  }

  // Étape 1 : bilan privé.
  return (
    <div className="bilan-modal-overlay" onClick={onClose}>
      <div className="bilan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bilan-modal-head">
          <div className="bilan-modal-head-titles">
            <h2>Mon bilan post-festival</h2>
            <span className="bilan-privacy"><Lock strokeWidth={2.2} /> Visible uniquement par toi — aucun admin n'y a accès</span>
          </div>
          <button onClick={onClose} aria-label="Fermer"><X strokeWidth={1.8} /></button>
        </div>
        <div className="bilan-modal-body">
          <EventReportForm
            eventId={eventId}
            onSaved={() => setShowReview(true)}
          />
        </div>
      </div>
    </div>
  )
}
