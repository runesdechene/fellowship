import { Star, MessageSquare } from 'lucide-react'
import type { ReviewWithActor } from '@/hooks/use-reviews'
import { ReviewAvatar } from './ReviewAvatar'
import './ReviewList.css'

interface Props {
  reviews: ReviewWithActor[]
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

function StarRow({ value }: { value: number }) {
  return (
    <span className="review-list-stars">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          strokeWidth={2}
          className={i <= value ? 'on' : ''}
          fill={i <= value ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  )
}

/** Liste complète des avis exposants, dépliée inline dans la section (pas en modale). */
export function ReviewList({ reviews }: Props) {
  return (
    <div className="review-list">
      {reviews.map((r) => {
        const overall = Math.round(((r.affluence + r.organisation + r.rentabilite) / 3) * 10) / 10
        return (
          <article key={r.id} className="review-list-item">
            <header className="review-list-item-head">
              <ReviewAvatar
                label={r.actor_label}
                avatarUrl={r.actor_avatar_url}
                slug={r.actor_slug}
                className="review-list-avatar"
              />
              <div className="review-list-author">
                <span className="review-list-author-name">{r.actor_label ?? 'Un exposant'}</span>
                <span className="review-list-date">{ago(r.created_at ?? new Date().toISOString())}</span>
              </div>
              <div className="review-list-overall">
                <Star strokeWidth={2} fill="currentColor" />
                <b>{overall.toLocaleString('fr-FR')}</b>
              </div>
            </header>

            <div className="review-list-criteria">
              <div className="rl-crit"><span>Affluence</span><StarRow value={r.affluence} /></div>
              <div className="rl-crit"><span>Organisation</span><StarRow value={r.organisation} /></div>
              <div className="rl-crit"><span>Rentabilité</span><StarRow value={r.rentabilite} /></div>
            </div>

            {r.comment && r.comment.trim().length > 0 && (
              <div className="review-list-comment">
                <MessageSquare strokeWidth={1.6} />
                <p>« {r.comment} »</p>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
