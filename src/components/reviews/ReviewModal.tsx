import { X, Star } from 'lucide-react'
import { ReviewForm } from './ReviewForm'
import './ReviewModal.css'

interface Props {
  eventId: string
  onClose: () => void
  onSubmitted: () => void
}

/** Modale DA pour donner / modifier son avis. Wrappe ReviewForm. */
export function ReviewModal({ eventId, onClose, onSubmitted }: Props) {
  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-head">
          <h2><Star strokeWidth={1.8} /> Mon avis</h2>
          <button onClick={onClose} aria-label="Fermer"><X strokeWidth={1.8} /></button>
        </div>
        <div className="review-modal-body">
          <ReviewForm eventId={eventId} onReviewSubmitted={() => { onSubmitted(); onClose() }} />
        </div>
      </div>
    </div>
  )
}
