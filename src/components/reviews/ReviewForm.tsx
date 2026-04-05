import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { submitReview, useMyReview } from '@/hooks/use-reviews'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'

interface ReviewFormProps {
  eventId: string
  onReviewSubmitted: () => void
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={() => onChange(star)} className="transition-colors">
          <Star className={`h-6 w-6 ${star <= value ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  )
}

export function ReviewForm({ eventId, onReviewSubmitted }: ReviewFormProps) {
  const { user } = useAuth()
  const { review: existing } = useMyReview(eventId)
  const [affluence, setAffluence] = useState(existing?.affluence ?? 0)
  const [organisation, setOrganisation] = useState(existing?.organisation ?? 0)
  const [rentabilite, setRentabilite] = useState(existing?.rentabilite ?? 0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !affluence || !organisation || !rentabilite) return
    setSaving(true)

    await submitReview({
      user_id: user.id,
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-card p-4">
      <h3 className="font-semibold">Ton avis sur cet événement</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Affluence</span>
          <StarRating value={affluence} onChange={setAffluence} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Organisation</span>
          <StarRating value={organisation} onChange={setOrganisation} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Rentabilité</span>
          <StarRating value={rentabilite} onChange={setRentabilite} />
        </div>
      </div>
      <textarea
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
        placeholder="Un commentaire ? (optionnel)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={!affluence || !organisation || !rentabilite || saving}>
        {saving ? 'Envoi...' : existing ? 'Modifier mon avis' : 'Envoyer mon avis'}
      </Button>
    </form>
  )
}
