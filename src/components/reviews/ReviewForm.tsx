import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { submitReview, useMyReview } from '@/hooks/use-reviews'
import { Star } from 'lucide-react'

interface ReviewFormProps {
  eventId: string
  onReviewSubmitted: () => void
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="review-form-stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={star <= value ? 'on' : ''}
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
        >
          <Star strokeWidth={2} />
        </button>
      ))}
    </div>
  )
}

export function ReviewForm({ eventId, onReviewSubmitted }: ReviewFormProps) {
  const { user, currentActor } = useAuth()
  const { review: existing } = useMyReview(eventId)
  const [affluence, setAffluence] = useState(existing?.affluence ?? 0)
  const [organisation, setOrganisation] = useState(existing?.organisation ?? 0)
  const [rentabilite, setRentabilite] = useState(existing?.rentabilite ?? 0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !currentActor || !affluence || !organisation || !rentabilite) return
    setSaving(true)

    await submitReview({
      actor_id: currentActor.id,
      acted_by_user_id: user.id,
      event_id: eventId,
      affluence,
      organisation,
      rentabilite,
      comment: comment || null,
    })

    setSaving(false)
    onReviewSubmitted()
  }

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <div className="review-form-criteria">
        <div className="review-form-criterion">
          <span className="review-form-criterion-label">Affluence</span>
          <StarRating value={affluence} onChange={setAffluence} />
        </div>
        <div className="review-form-criterion">
          <span className="review-form-criterion-label">Organisation</span>
          <StarRating value={organisation} onChange={setOrganisation} />
        </div>
        <div className="review-form-criterion">
          <span className="review-form-criterion-label">Rentabilité</span>
          <StarRating value={rentabilite} onChange={setRentabilite} />
        </div>
      </div>

      <div className="review-form-comment">
        <label htmlFor="review-comment">Commentaire (facultatif)</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Un retour pour les autres exposants ?"
          maxLength={500}
        />
      </div>

      <button
        type="submit"
        className="review-form-submit"
        disabled={!affluence || !organisation || !rentabilite || saving}
      >
        {saving ? 'Envoi…' : existing ? 'Modifier mon avis' : 'Envoyer mon avis'}
      </button>
    </form>
  )
}
