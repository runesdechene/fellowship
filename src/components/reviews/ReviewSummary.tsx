import { useState } from 'react'
import { Star, Lock } from 'lucide-react'
import type { ReviewWithActor } from '@/hooks/use-reviews'
import { ReviewList } from './ReviewList'
import { ReviewAvatar } from './ReviewAvatar'
import './ReviewSummary.css'

interface ReviewSummaryProps {
  reviews: ReviewWithActor[]
  canSeeDetails: boolean
  isPast: boolean
  onLeaveReview: () => void
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  const sum = values.reduce((s, v) => s + v, 0)
  return Math.round((sum / values.length) * 10) / 10
}

function ago(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${Math.floor(days / 365) > 1 ? 's' : ''}`
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

/**
 * Bloc résumé d'avis exposants — note moyenne + critères + commentaire vedette.
 * Remplace le titre "Avis des exposants" : c'est lui-même le header de section.
 * Agrégats calculés client depuis la liste fournie (les colonnes event.avg_*
 * ne sont pas alimentées côté DB).
 */
export function ReviewSummary({ reviews, canSeeDetails, isPast, onLeaveReview }: ReviewSummaryProps) {
  const [listOpen, setListOpen] = useState(false)

  // Empty state — uniquement si l'event est passé (sinon on n'affiche pas la section)
  if (reviews.length === 0) {
    return (
      <div className="review-summary review-summary-empty">
        <p>Aucun avis pour ce festival.</p>
        {isPast && (
          <p className="review-empty-hint">
            Si tu y étais, ton retour aidera les autres exposants pour les éditions à venir.
          </p>
        )}
      </div>
    )
  }

  const avgAffluence = avg(reviews.map(r => r.affluence))
  const avgOrganisation = avg(reviews.map(r => r.organisation))
  const avgRentabilite = avg(reviews.map(r => r.rentabilite))
  const avgOverall = Math.round(((avgAffluence + avgOrganisation + avgRentabilite) / 3) * 10) / 10

  // Commentaire vedette : le plus récent avec un commentaire non vide
  const featured = reviews.find(r => r.comment && r.comment.trim().length > 0) ?? null

  return (
    <div className="review-summary">
      {/* Header : note + critères inline + CTA */}
      <div className="review-summary-head">
        <div className="review-summary-score">
          <Star className="review-summary-star" fill="currentColor" />
          <span className="review-summary-num">{fmt(avgOverall)}</span>
          <span className="review-summary-out">/ 5</span>
          <span className="review-summary-count">
            · {reviews.length} avis exposant{reviews.length > 1 ? 's' : ''}
          </span>
        </div>
        {isPast && (
          <button className="review-summary-cta" onClick={onLeaveReview}>
            <Star strokeWidth={2} /> Mon avis
          </button>
        )}
      </div>

      <div className="review-summary-criteria">
        <span><b>{fmt(avgAffluence)}</b> Affluence</span>
        <span className="sep">·</span>
        <span><b>{fmt(avgOrganisation)}</b> Orga</span>
        <span className="sep">·</span>
        <span><b>{fmt(avgRentabilite)}</b> Rentabilité</span>
      </div>

      {/* Commentaire vedette — visible Pro only */}
      {canSeeDetails && featured && (
        <div className="review-featured">
          <ReviewAvatar
            label={featured.author_label}
            avatarUrl={featured.author_avatar_url}
            slug={featured.author_slug}
            className="review-featured-avatar"
          />
          <div className="review-featured-body">
            <p className="review-featured-quote">« {featured.comment} »</p>
            <p className="review-featured-meta">
              {featured.author_label ?? 'Un exposant'} · {ago(featured.created_at ?? new Date().toISOString())}
            </p>
          </div>
        </div>
      )}

      {/* Lock pour les non-Pros */}
      {!canSeeDetails && (
        <div className="review-summary-lock">
          <Lock strokeWidth={2} />
          <span>Passe en <strong>Pro</strong> pour lire les avis détaillés</span>
        </div>
      )}

      {/* Toggle "Voir / Masquer les N avis" — Pro only et au moins 1 review.
          La liste se déplie inline et étire la section (pas de modale). */}
      {canSeeDetails && reviews.length > 0 && (
        <button
          className="review-summary-seeall"
          onClick={() => setListOpen(o => !o)}
          aria-expanded={listOpen}
        >
          {listOpen ? 'Masquer les avis ↑' : `Voir les ${reviews.length} avis →`}
        </button>
      )}

      {listOpen && canSeeDetails && <ReviewList reviews={reviews} />}
    </div>
  )
}
