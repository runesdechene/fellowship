import { Star, Lock } from 'lucide-react'
import type { Review } from '@/types/database'

interface ReviewSummaryProps {
  reviews: Review[]
  canSeeDetails: boolean
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((s, v) => s + v, 0)
  return Math.round((sum / values.length) * 10) / 10 // 1 décimale
}

/**
 * Résumé des avis sur un événement — agrégats calculés client depuis la liste
 * fournie. (Les colonnes event.avg_* ne sont pas alimentées côté DB, on les
 * dérive ici pour avoir un affichage cohérent immédiatement après submit.)
 */
export function ReviewSummary({ reviews, canSeeDetails }: ReviewSummaryProps) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Aucun avis pour le moment</p>
  }

  const affluences = reviews.map(r => r.affluence)
  const organisations = reviews.map(r => r.organisation)
  const rentabilites = reviews.map(r => r.rentabilite)
  const avgAffluence = avg(affluences)
  const avgOrganisation = avg(organisations)
  const avgRentabilite = avg(rentabilites)
  const avgOverall = Math.round(((avgAffluence + avgOrganisation + avgRentabilite) / 3) * 10) / 10

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5" fill="currentColor" style={{ color: 'var(--amber)' }} />
        <span className="text-lg font-bold">{avgOverall.toLocaleString('fr-FR')}</span>
        <span className="text-sm text-muted-foreground">/ 5 ({reviews.length} avis)</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="font-semibold">{avgAffluence.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-muted-foreground">Affluence</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="font-semibold">{avgOrganisation.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-muted-foreground">Organisation</p>
        </div>
        <div className="rounded-lg bg-muted p-3 text-center">
          <p className="font-semibold">{avgRentabilite.toLocaleString('fr-FR')}</p>
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
