/**
 * QUOI     — l'écran du bilan d'une date (/bilans/:eventId) : en-tête, recettes et dépenses, ce
 *            qui a marché, ce qui est à améliorer, note, photos ; à droite le résumé, l'invitation
 *            à écrire un avis et « Supprimer ce bilan ».
 * POURQUOI — tout ce qu'on veut retrouver d'une date l'année suivante, au même endroit. Chaque
 *            changement s'enregistre aussitôt (useReport).
 * ATTENTION — une date qui n'est pas un bilan possible (pas inscrit, pas encore passée) renvoie
 *            vers Mes bilans. La grille (report-page.css) place le résumé à droite sur ordinateur,
 *            en tête sous le titre sur téléphone.
 */
import { ArrowRight, Lock } from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { durationLabel, formatDateRange } from '@/lib/dates'
import { useTransitionNavigate } from '@/lib/navigation'
import { useDeclarePageChrome } from '@/lib/page-chrome'
import { usePlan } from '@/lib/usePlan'
import { ClearReport } from './ClearReport'
import { Ledger } from './Ledger'
import { ReportNote } from './ReportNote'
import { ReportPhotos } from './ReportPhotos'
import { ReportSummary } from './ReportSummary'
import { TagList } from './TagList'
import { useReport } from './useReport'

export function ReportPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { actor } = useAuth()
  const go = useTransitionNavigate()
  const { pro } = usePlan()
  // En gratuit, le bilan d'une date ne se lit pas : rien n'est chargé, on renvoie à Mes bilans.
  const { status, detail, saving, failures, writeError, actions } = useReport(
    pro ? eventId : undefined,
    actor?.id,
  )
  useDeclarePageChrome({ poster: null, lead: null, back: '/bilans' })

  if (!pro || status === 'missing') return <Navigate to="/bilans" replace />
  if (status === 'error') {
    return (
      <div className="report-page">
        <p className="reports-page__note">Ce bilan n’a pas pu être chargé.</p>
      </div>
    )
  }
  if (!detail) return null

  const { date } = detail

  return (
    <div className="report-page">
      <header className="report-page__header">
        <span className="report-page__eyebrow">Bilan</span>
        <h1 className="report-page__title">{date.name}</h1>
        <p className="report-page__meta">
          {formatDateRange(date.startDate, date.endDate, 'long')} {date.startDate.getFullYear()}
          {'  ·  '}
          {date.place}
          {'  ·  '}
          {durationLabel(date.startDate, date.endDate)}
        </p>
        <p className="reports-page__private">
          <Lock size={13} strokeWidth={2} />
          Visible par toi seul
          <span className="reports-page__private-more"> — aucun administrateur n’y a accès</span>
        </p>
      </header>

      <div className="report-page__summary">
        <ReportSummary detail={detail} saving={saving} />
      </div>

      <div className="report-page__main">
        <section className="report-block">
          <h2 className="report-block__title">
            Recettes et dépenses{' '}
            <span className="report-block__hint">chaque ligne s’enregistre aussitôt</span>
          </h2>
          <Ledger key={failures} entries={detail.entries} actions={actions} />
        </section>
        {writeError && (
          <p className="report-page__error" role="status">
            {writeError}
          </p>
        )}
        <TagList
          title="Ce qui a marché"
          tags={detail.wins}
          onAdd={(raw) => {
            actions.addTag('wins', raw)
          }}
          onRemove={(tag) => {
            actions.removeTag('wins', tag)
          }}
        />
        <TagList
          title="À améliorer la prochaine fois"
          tags={detail.improvements}
          onAdd={(raw) => {
            actions.addTag('improvements', raw)
          }}
          onRemove={(tag) => {
            actions.removeTag('improvements', tag)
          }}
        />
        <ReportNote key={failures} note={detail.note} onSave={actions.setNote} />
        <ReportPhotos
          photos={detail.photos}
          onAdd={actions.addPhoto}
          onRemove={actions.removePhoto}
        />
      </div>

      <div className="report-page__extras">
        <div className="report-review">
          <span className="report-review__title">Et pour les autres exposants ?</span>
          <span className="report-review__text">
            Ton avis public les aide à choisir leurs dates. Ton identité reste protégée : seuls tes
            amis exposants voient ton nom.
          </span>
          <button
            type="button"
            className="report-review__link"
            onClick={() => go(`/evenement/${date.eventId}/avis`)}
          >
            Écrire un avis
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        </div>
        {detail.reportId && <ClearReport onClear={actions.clear} />}
      </div>
    </div>
  )
}
