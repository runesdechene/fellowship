/**
 * QUOI     — l'écran « Écrire un avis » (/evenement/:id/avis) : trois notes en étoiles, un retour
 *            pour les autres exposants, qui voit ton nom ; à droite, l'avis tel que les autres le
 *            verront.
 * POURQUOI — les avis font choisir les dates ; un exposant ose noter quand il sait exactement ce
 *            qui sera montré, et à qui (maquette 2027).
 * ATTENTION — réservé à un exposant inscrit à la date (la base refuse les autres). Les
 *            organisateurs ne voient jamais le nom de l'auteur.
 */
import { EyeOff, ShieldCheck, Star, Users } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Stars } from '@/components/ui/Stars'
import { useAuth } from '@/lib/auth'
import { formatDateRange } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import { useDeclarePageChrome } from '@/lib/page-chrome'
import { formatScore } from '@/lib/reviews'
import { useEvent } from '@/features/event/useEvent'
import { EMPTY_REVIEW, useMyReview, type ReviewDraft } from './useMyReview'

const CRITERIA = [
  { key: 'affluence', label: 'Affluence', hint: 'Y avait-il du monde, et le bon public ?' },
  {
    key: 'organisation',
    label: 'Organisation',
    hint: 'Accueil, installation, communication, horaires',
  },
  {
    key: 'rentabilite',
    label: 'Rentabilité',
    hint: 'Est-ce que ça valait le coup pour ton stand ?',
  },
] as const

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  return (
    <span className="review-form__stars" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((rank) => (
        <button
          key={rank}
          type="button"
          role="radio"
          aria-checked={value === rank}
          aria-label={`${rank} sur 5`}
          className={
            rank <= value ? 'review-form__star review-form__star--on' : 'review-form__star'
          }
          onClick={() => {
            onChange(rank)
          }}
        >
          <Star size={22} strokeWidth={1.6} />
        </button>
      ))}
    </span>
  )
}

export function WriteReviewPage() {
  const { id } = useParams<{ id: string }>()
  const { actor, person } = useAuth()
  const { event, startDate, endDate, status, loading } = useEvent(id, actor?.id, person?.actor_id)
  const { existing, error, publish } = useMyReview(id, actor?.id, person?.actor_id)
  const [draft, setDraft] = useState<ReviewDraft | null>(null)
  const [sending, setSending] = useState(false)
  const go = useTransitionNavigate()

  useDeclarePageChrome({ poster: null, lead: event?.name ?? null, back: `/evenement/${id ?? ''}` })

  if (loading || !event || !startDate || !endDate) return null

  const review = draft ?? existing ?? EMPTY_REVIEW
  const edit = (patch: Partial<ReviewDraft>) => {
    setDraft({ ...review, ...patch })
  }
  const complete = review.affluence > 0 && review.organisation > 0 && review.rentabilite > 0
  const overall = (review.affluence + review.organisation + review.rentabilite) / 3
  const year = startDate.getFullYear()

  if (status !== 'inscrit') {
    return (
      <div className="review-form">
        <p className="event-page__state">
          Seuls les exposants inscrits à cette date peuvent donner leur avis.
        </p>
      </div>
    )
  }

  async function submit() {
    setSending(true)
    const done = await publish(review)
    setSending(false)
    if (done) go(`/evenement/${id ?? ''}`)
  }

  return (
    <div className="review-form">
      <div className="review-form__main">
        <p className="review-form__eyebrow">Ton avis</p>
        <h1 className="review-form__title">Alors, c’était comment ?</h1>
        <p className="review-form__meta">
          {event.name} · Édition {year} · {formatDateRange(startDate, endDate, 'long')}
          <span className="review-form__badge">
            <ShieldCheck size={12} strokeWidth={2} />
            Tu y étais inscrit
          </span>
        </p>

        <div className="review-form__card">
          {CRITERIA.map(({ key, label, hint }) => (
            <div key={key} className="review-form__criterion">
              <span>
                <b>{label}</b>
                <span className="review-form__hint">{hint}</span>
              </span>
              <StarPicker
                label={label}
                value={review[key]}
                onChange={(rank) => {
                  setDraft({ ...review, [key]: rank })
                }}
              />
            </div>
          ))}
        </div>

        <label className="review-form__label" htmlFor="review-comment">
          Un retour pour les autres exposants <span>facultatif</span>
        </label>
        <textarea
          id="review-comment"
          className="review-form__comment"
          rows={3}
          maxLength={1000}
          placeholder="Le public, l’accueil, ce qu’il faut prévoir…"
          value={review.comment}
          onChange={(change) => {
            edit({ comment: change.target.value })
          }}
        />

        <p className="review-form__label">Qui voit ton nom ?</p>
        <div className="review-form__choices" role="radiogroup" aria-label="Qui voit ton nom">
          <button
            type="button"
            role="radio"
            aria-checked={!review.anonymous}
            className="review-form__choice"
            onClick={() => {
              edit({ anonymous: false })
            }}
          >
            <b>
              <Users size={15} strokeWidth={1.8} />
              Mes amis exposants
            </b>
            Eux seuls voient ton nom. Pour tous les autres, c’est « un exposant ».
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={review.anonymous}
            className="review-form__choice"
            onClick={() => {
              edit({ anonymous: true })
            }}
          >
            <b>
              <EyeOff size={15} strokeWidth={1.8} />
              Personne
            </b>
            Anonymat total, même pour tes amis.
          </button>
        </div>
        <p className="review-form__note">
          <ShieldCheck size={12} strokeWidth={1.8} />
          Les organisateurs ne voient jamais ton nom.
        </p>

        {error && <p className="event-status__error">{error}</p>}

        <div className="review-form__actions">
          <button
            type="button"
            className="review-form__cancel"
            onClick={() => {
              go(`/evenement/${id ?? ''}`)
            }}
          >
            Annuler
          </button>
          <Button variant="action" disabled={!complete || sending} onClick={() => void submit()}>
            {existing ? 'Mettre à jour mon avis' : 'Publier mon avis'}
          </Button>
        </div>
      </div>

      <aside className="review-form__preview">
        <p className="review-form__eyebrow">Ce que verront les autres exposants</p>
        <div className="review-form__card review-form__preview-card">
          <div className="review-form__preview-head">
            {event.image_url && <img src={event.image_url} alt="" />}
            <span>
              <b>{event.name}</b>
              <span className="review-form__hint">Édition {year}</span>
            </span>
          </div>
          {complete && (
            <p className="review-form__preview-score">
              <span>{formatScore(overall)}</span>
              <Stars score={overall} />
            </p>
          )}
          {review.comment.trim() && <p>« {review.comment.trim()} »</p>}
          <p className="review-form__note">
            <Users size={12} strokeWidth={1.8} />
            <span>
              <b>Tes amis exposants</b> voient{' '}
              {review.anonymous ? '« Un exposant »' : `« ${actor?.label ?? ''} »`}
            </span>
          </p>
          <p className="review-form__note">
            <ShieldCheck size={12} strokeWidth={1.8} />
            <span>
              <b>Tous les autres</b> voient « Un exposant »
            </span>
          </p>
        </div>
      </aside>
    </div>
  )
}
