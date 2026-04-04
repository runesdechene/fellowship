import { Star, Lock } from 'lucide-react'
import type { EventWithScore } from '@/types/database'

interface ReviewSummaryProps {
  event: EventWithScore
  canSeeDetails: boolean
}

export function ReviewSummary({ event, canSeeDetails }: ReviewSummaryProps) {
  if (!event.review_count || event.review_count === 0) {
    return <p className="text-sm text-muted-foreground italic">Aucun avis pour le moment</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 fill-accent text-accent" />
        <span className="text-lg font-bold">{event.avg_overall}</span>
        <span className="text-sm text-muted-foreground">/ 5 ({event.review_count} avis)</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="font-semibold">{event.avg_affluence}</p>
          <p className="text-xs text-muted-foreground">Affluence</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="font-semibold">{event.avg_organisation}</p>
          <p className="text-xs text-muted-foreground">Organisation</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="font-semibold">{event.avg_rentabilite}</p>
          <p className="text-xs text-muted-foreground">Rentabilité</p>
        </div>
      </div>
      {!canSeeDetails && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-sm">
          <Lock className="h-4 w-4 text-primary" />
          <span>Passe en <strong>Pro</strong> pour lire les avis détaillés</span>
        </div>
      )}
    </div>
  )
}
