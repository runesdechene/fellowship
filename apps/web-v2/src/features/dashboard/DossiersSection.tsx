/**
 * QUOI     — le bloc « Mes dossiers » : une ligne par date à venir, avec où en est le dossier et
 *            où en est l'argent (à payer, acompte, payé ; ou, pour un cachet, à recevoir, reçu).
 * POURQUOI — la fonction plébiscitée par les exposants : savoir d'un coup d'œil ce qui reste à
 *            envoyer, à payer ou à recevoir.
 *            Un dossier réglé (inscrit, tout payé) passe en vert, coché, et en bas de la liste
 *            (Uriel, 19/10/2026). Sur téléphone (maquette 2120:2), trois dossiers et « Tout » pour déplier les autres.
 *            Sans dossier, quatre lignes en squelettes montrent ce qui s'y suivra (maquette 2402:233).
 * ATTENTION — l'état se lit par la FORME de l'icône ; seul ce qui est acquis porte la terre.
 */
import { Poster } from '@/components/ui/Poster'
import { Check, ChevronRight, Circle, Contrast, FolderInput } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { SkeletonDot, SkeletonLine, SkeletonPoster } from '@/components/ui/Skeleton'
import { useState } from 'react'
import { formatDateRange } from '@/lib/dates'
import { settledLast, type PaymentTone } from '@/lib/dossiers'
import { useTransitionNavigate } from '@/lib/navigation'
import type { Dossier } from './useDashboard'

function PaymentIcon({ tone }: { tone: PaymentTone }) {
  if (tone === 'done') return <span className="dossiers__dot dossiers__dot--acquired" />
  if (tone === 'partial') return <Contrast className="dossiers__icon" size={12} strokeWidth={2.2} />
  return <Circle className="dossiers__icon" size={12} strokeWidth={2.2} />
}

/** Les lignes d'un tableau vide : nom, dates, dossier, paiement, son détail. */
const SKETCH = [
  ['130px', '60px', '80px', '150px'],
  ['160px', '52px', '110px', '120px'],
  ['110px', '64px', '60px', '130px'],
  ['140px', '48px', '90px', '170px'],
] as const

function SkeletonRows() {
  return (
    <ul className="dossiers__list" aria-hidden="true">
      {SKETCH.map(([name, range, dossier, detail]) => (
        <li key={name} className="dossiers__row dossiers__row--skeleton">
          <span className="dossiers__date">
            <SkeletonPoster className="dossiers__thumb" />
            <span className="dossiers__identity dossiers__identity--skeleton">
              <SkeletonLine width={name} tone="strong" />
              <SkeletonLine width={range} />
            </span>
          </span>
          <span className="dossiers__state">
            <SkeletonDot />
            <SkeletonLine width={dossier} tone="mid" />
          </span>
          <span className="dossiers__payment dossiers__payment--skeleton">
            <span className="dossiers__state">
              <SkeletonDot />
              <SkeletonLine width="90px" tone="strong" />
            </span>
            <SkeletonLine width={detail} />
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Ce que le téléphone montre avant « Tout » ; l'ordinateur montre tout. */
const SHOWN_ON_PHONE = 3

export function DossiersSection({ dossiers }: { dossiers: Dossier[] }) {
  const go = useTransitionNavigate()
  const [all, setAll] = useState(false)
  let frame = all ? 'dossiers dossiers--all' : 'dossiers'
  if (dossiers.length === 0) frame = 'dossiers skeleton-card'

  return (
    <section className="dashboard__section">
      <div className="dashboard__section-head">
        <h2 className="dashboard__section-title">Mes dossiers</h2>
        {dossiers.length > SHOWN_ON_PHONE && (
          <button
            type="button"
            className="dossiers__more"
            aria-expanded={all}
            onClick={() => {
              setAll((value) => !value)
            }}
          >
            {all ? 'Moins' : 'Tout'}
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        )}
      </div>
      <p className="dashboard__section-note">
        Ce qui reste à envoyer, à payer ou à recevoir sur tes prochaines dates
      </p>
      <div className={frame}>
        <div className="dossiers__head" aria-hidden="true">
          <span>Date</span>
          <span>Dossier</span>
          <span>Paiement</span>
        </div>
        {dossiers.length === 0 ? (
          <SkeletonRows />
        ) : (
          <ul className="dossiers__list">
            {settledLast(dossiers).map((dossier) => (
              <li key={dossier.participationId}>
                <button
                  type="button"
                  className={
                    dossier.view.settled ? 'dossiers__row dossiers__row--settled' : 'dossiers__row'
                  }
                  onClick={() => go(`/evenement/${dossier.eventId}`)}
                >
                  <span className="dossiers__date">
                    <span className="dossiers__thumb">
                      <Poster
                        imageUrl={dossier.imageUrl}
                        tags={dossier.tags}
                        className="dossiers__poster"
                      />
                      {dossier.view.settled && (
                        <span className="dossiers__settled">
                          <Check size={16} strokeWidth={2.5} />
                        </span>
                      )}
                    </span>
                    <span className="dossiers__identity">
                      <span className="dossiers__name">{dossier.name}</span>
                      <span className="dossiers__range">
                        {formatDateRange(dossier.startDate, dossier.endDate)}
                      </span>
                    </span>
                  </span>

                  <span className="dossiers__state">
                    <Chip
                      tone={dossier.view.dossier.acquired ? 'ok' : 'sent'}
                      icon={
                        dossier.view.dossier.acquired ? (
                          <Check size={12} strokeWidth={2.4} />
                        ) : (
                          <FolderInput size={12} strokeWidth={2.4} />
                        )
                      }
                    >
                      {dossier.view.dossier.label}
                    </Chip>
                  </span>

                  <span className="dossiers__payment">
                    <span className="dossiers__state">
                      <PaymentIcon tone={dossier.view.payment.tone} />
                      {dossier.view.payment.label}
                    </span>
                    {dossier.view.payment.detail && (
                      <span className="dossiers__detail">{dossier.view.payment.detail}</span>
                    )}
                  </span>

                  <ChevronRight className="dossiers__chevron" size={16} strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
