import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { submitReview, deleteReview, useMyReview } from '@/hooks/use-reviews'
import { Star, Trash2 } from 'lucide-react'

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
  const { review: existing, loading: loadingExisting } = useMyReview(eventId)
  const [affluence, setAffluence] = useState(0)
  const [organisation, setOrganisation] = useState(0)
  const [rentabilite, setRentabilite] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Hydrate le formulaire quand l'avis existant arrive (fetch async dans
  // useMyReview). Pattern React 19 « adjust state during rendering » : on
  // détecte le changement d'`existing` via une valeur miroir et on resynchronise
  // sans useEffect. Sans ça, useState(existing?.x ?? 0) gèle à 0 parce qu'
  // `existing` est null au premier render.
  const [hydratedFor, setHydratedFor] = useState<string | null>(null)
  if (existing && hydratedFor !== existing.id) {
    setHydratedFor(existing.id)
    setAffluence(existing.affluence)
    setOrganisation(existing.organisation)
    setRentabilite(existing.rentabilite)
    setComment(existing.comment ?? '')
  }

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

  const handleDelete = async () => {
    if (!currentActor || !existing) return
    setDeleting(true)
    await deleteReview(currentActor.id, eventId)
    setDeleting(false)
    onReviewSubmitted()
  }

  // Skeleton léger pendant le fetch de l'avis existant — évite le flash
  // 0-étoiles avant que les valeurs persistées se chargent dans le state.
  if (loadingExisting) {
    return <div className="review-form-loading">Chargement…</div>
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
        disabled={!affluence || !organisation || !rentabilite || saving || deleting}
      >
        {saving ? 'Envoi…' : existing ? 'Modifier mon avis' : 'Envoyer mon avis'}
      </button>

      {/* Suppression — uniquement si un avis existe déjà. Confirmation en 2 clics. */}
      {existing && (
        confirmDelete ? (
          <div className="review-form-delete-confirm">
            <span>Supprimer définitivement ton avis ?</span>
            <div className="review-form-delete-actions">
              <button type="button" className="review-form-delete-cancel" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Annuler
              </button>
              <button type="button" className="review-form-delete-yes" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Suppression…' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="review-form-delete" onClick={() => setConfirmDelete(true)}>
            <Trash2 strokeWidth={1.8} /> Supprimer mon avis
          </button>
        )
      )}
    </form>
  )
}
